import { python } from "@codemirror/lang-python";
import {
  Compartment,
  EditorState,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
} from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef, useState } from "react";
import { yCollab } from "y-codemirror.next";
import * as awarenessProtocol from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { convertPseudocodeToPython } from "../../api/aiApi";
import {
  executePythonCode,
  type PythonExecutionResult,
  type PythonExecutionTestCase,
} from "../../api/executionApi";
import { useAuth } from "../../context/AuthContext.tsx";
import { WS_CLOSE_CODES } from "../../utils/socketSessionConst.ts";

const VITE_WEBSOCKET_URL = "ws://localhost:3003";
const WEBSOCKET_URL =
  import.meta.env.VITE_COLLAB_WEBSOCKET_URL || VITE_WEBSOCKET_URL;
if (!WEBSOCKET_URL) {
  throw new Error(
    "VITE_WEBSOCKET_URL is not set. Define it in the frontend .env file.",
  );
}

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
  },
});

const setErrorLineEffect = StateEffect.define<number | null>();
const errorLineDecoration = Decoration.line({
  attributes: { class: "cm-peerprep-error-line" },
});
const errorLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (!effect.is(setErrorLineEffect)) {
        continue;
      }
      const lineNumber = effect.value;
      if (
        !lineNumber ||
        lineNumber < 1 ||
        lineNumber > transaction.state.doc.lines
      ) {
        return Decoration.none;
      }
      const line = transaction.state.doc.line(lineNumber);
      return Decoration.set([errorLineDecoration.range(line.from)]);
    }
    return value.map(transaction.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

const AWARENESS_HEARTBEAT_MS = 1000;
const PEER_STALE_TIMEOUT_MS = 3000;
const ACTIVE_ACTION_KEY = "activeAction";

type EditorActionType = "pseudocode_to_python" | "execute_python";
type EditorActionStatus =
  | "awaiting_approval"
  | "running"
  | "completed"
  | "declined"
  | "failed";

type ConversionResult = Awaited<ReturnType<typeof convertPseudocodeToPython>>;

type EditorSharedAction = {
  id: string;
  type: EditorActionType;
  status: EditorActionStatus;
  initiatorId: string;
  initiatorName: string;
  codeSnapshot: string;
  approvals: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  declinedBy?: string;
  result?: ConversionResult | PythonExecutionResult;
  error?: string;
};

const actionLabel: Record<EditorActionType, string> = {
  pseudocode_to_python: "Convert pseudocode",
  execute_python: "Run Python",
};

const isFrozenAction = (action: EditorSharedAction | null) =>
  action?.status === "awaiting_approval" || action?.status === "running";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const maybeError = error as {
    data?: {
      error?: string;
      errors?: Array<{ message?: string } | string>;
    };
    message?: string;
  };

  if (maybeError.data?.error) {
    return maybeError.data.error;
  }

  const firstValidationError = maybeError.data?.errors?.[0];
  if (typeof firstValidationError === "string") {
    return firstValidationError;
  }
  if (firstValidationError?.message) {
    return firstValidationError.message;
  }

  return maybeError.message || fallback;
};

const getExecutionErrorLine = (result: PythonExecutionResult) =>
  result.errorsPresent.find((issue) => typeof issue.line === "number")?.line ??
  null;

export function CollaborativeEditor({
  roomId,
  sessionUsers,
  executionTestCases,
  executionSetupError,
  onSessionEnded,
  onWsStatusChange,
}: {
  roomId: string;
  sessionUsers: string[];
  executionTestCases: PythonExecutionTestCase[];
  executionSetupError?: string | null;
  onSessionEnded?: () => void;
  onWsStatusChange?: (event: {
    status: "connected" | "disconnected" | "connecting";
  }) => void;
}) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const actionMapRef = useRef<Y.Map<EditorSharedAction> | null>(null);
  const editableCompartmentRef = useRef(new Compartment());
  const executionTestCasesRef = useRef(executionTestCases);
  const runningActionIdsRef = useRef(new Set<string>());
  const [isProviderConnected, setIsProviderConnected] = useState(false);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [activeAction, setActiveAction] = useState<EditorSharedAction | null>(
    null,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const { user } = useAuth();

  const userId = user?.id ?? "";
  const displayName = user?.display_name || user?.username || "Anonymous";
  const userColor = "#0fa0ff";
  const requiredUsers =
    sessionUsers.length > 0 ? sessionUsers : userId ? [userId] : [];
  const editorFrozen = isFrozenAction(activeAction);
  const canStartAction =
    Boolean(userId) &&
    isProviderConnected &&
    isPeerConnected &&
    !activeAction;

  useEffect(() => {
    executionTestCasesRef.current = executionTestCases;
  }, [executionTestCases]);

  const setReadOnly = (readOnly: boolean) => {
    const view = editorViewRef.current;
    if (!view) {
      return;
    }

    view.dispatch({
      effects: editableCompartmentRef.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    });
  };

  const applyErrorLine = (lineNumber: number | null) => {
    const view = editorViewRef.current;
    if (!view) {
      return;
    }

    view.dispatch({ effects: setErrorLineEffect.of(lineNumber) });

    if (!lineNumber || lineNumber < 1 || lineNumber > view.state.doc.lines) {
      return;
    }

    const line = view.state.doc.line(lineNumber);
    view.dispatch({
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    });
  };

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(WEBSOCKET_URL, roomId, ydoc);
    const actionMap = ydoc.getMap<EditorSharedAction>("editorActions");
    actionMapRef.current = actionMap;

    const setWsStatus = (
      status: "connected" | "disconnected" | "connecting",
    ) => {
      setIsProviderConnected(status === "connected");
      onWsStatusChange?.({ status });
    };

    provider.on(
      "status",
      (event: { status: "connected" | "disconnected" | "connecting" }) => {
        setWsStatus(event.status);
      },
    );

    provider.on("connection-close", (event: CloseEvent | null) => {
      setWsStatus("connecting");

      if (event?.code === WS_CLOSE_CODES.SESSION_ENDED) {
        onSessionEnded?.();
      }
    });

    const updatePeerPresence = () => {
      const now = Date.now();
      const peers = Array.from(provider.awareness.getStates().entries()).filter(
        ([clientId, state]) => {
          if (clientId === provider.awareness.clientID || !state?.user) {
            return false;
          }

          const lastSeen = (state.user as { lastSeen?: number }).lastSeen;
          if (typeof lastSeen !== "number") {
            return true;
          }

          return now - lastSeen <= PEER_STALE_TIMEOUT_MS;
        },
      );
      setIsPeerConnected(peers.length > 0);
    };

    const syncActionState = () => {
      const nextAction = actionMap.get(ACTIVE_ACTION_KEY) ?? null;
      setActiveAction(nextAction);
      setReadOnly(isFrozenAction(nextAction));

      if (
        nextAction?.type === "execute_python" &&
        nextAction.status === "completed" &&
        nextAction.result
      ) {
        applyErrorLine(
          getExecutionErrorLine(nextAction.result as PythonExecutionResult),
        );
        return;
      }

      if (nextAction?.status !== "completed") {
        applyErrorLine(null);
      }
    };

    provider.awareness.on("change", updatePeerPresence);
    actionMap.observe(syncActionState);
    updatePeerPresence();
    syncActionState();

    const handleBeforeUnload = () => {
      awarenessProtocol.removeAwarenessStates(
        provider.awareness,
        [provider.awareness.clientID],
        provider.ws,
      );
      setWsStatus("disconnected");
    };

    const handleOffline = () => {
      setWsStatus("connecting");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("offline", handleOffline);

    const ytext = ydoc.getText();
    const publishPresence = () => {
      provider.awareness.setLocalStateField("user", {
        name: displayName,
        color: userColor,
        lastSeen: Date.now(),
      });
    };

    publishPresence();
    const awarenessHeartbeat = window.setInterval(
      publishPresence,
      AWARENESS_HEARTBEAT_MS,
    );
    const peerPresenceCheck = window.setInterval(updatePeerPresence, 1000);

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        editorTheme,
        errorLineField,
        editableCompartmentRef.current.of([
          EditorState.readOnly.of(false),
          EditorView.editable.of(true),
        ]),
        yCollab(ytext, provider.awareness),
        python(),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorContainerRef.current!,
    });
    editorViewRef.current = view;
    syncActionState();

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(awarenessHeartbeat);
      window.clearInterval(peerPresenceCheck);
      provider.awareness.off("change", updatePeerPresence);
      actionMap.unobserve(syncActionState);
      provider.awareness.setLocalState(null);
      editorViewRef.current = null;
      actionMapRef.current = null;
      view.destroy();
      ydoc.destroy();
      provider.destroy();
    };
  }, [roomId, userColor, displayName, onSessionEnded, onWsStatusChange]);

  useEffect(() => {
    if (
      !activeAction ||
      activeAction.status !== "running" ||
      activeAction.initiatorId !== userId ||
      runningActionIdsRef.current.has(activeAction.id)
    ) {
      return;
    }

    runningActionIdsRef.current.add(activeAction.id);
    const actionToRun = activeAction;

    const finishAction = (
      status: "completed" | "failed",
      payload: Pick<EditorSharedAction, "result" | "error">,
    ) => {
      const actionMap = actionMapRef.current;
      const currentAction = actionMap?.get(ACTIVE_ACTION_KEY);
      if (!actionMap || currentAction?.id !== actionToRun.id) {
        return;
      }

      actionMap.set(ACTIVE_ACTION_KEY, {
        ...currentAction,
        ...payload,
        status,
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    };

    async function runAction() {
      try {
        if (actionToRun.type === "pseudocode_to_python") {
          const result = await convertPseudocodeToPython({
            sessionId: roomId,
            pseudocode: actionToRun.codeSnapshot,
          });
          finishAction("completed", { result });
          return;
        }

        const testCases = executionTestCasesRef.current;
        if (testCases.length === 0) {
          finishAction("failed", {
            error: executionSetupError || "No Python test cases are available.",
          });
          return;
        }

        const result = await executePythonCode({
          code: actionToRun.codeSnapshot,
          test_cases: testCases,
        });
        finishAction("completed", { result });
      } catch (error) {
        finishAction("failed", {
          error: getApiErrorMessage(error, "Action failed. Please try again."),
        });
      }
    }

    void runAction();
  }, [activeAction, executionSetupError, roomId, userId]);

  const startAction = (type: EditorActionType) => {
    setLocalError(null);
    setCopiedActionId(null);

    if (!userId) {
      setLocalError("You must be signed in to use editor actions.");
      return;
    }

    if (!isProviderConnected || !isPeerConnected) {
      setLocalError("Both users must be connected before starting this action.");
      return;
    }

    if (type === "execute_python" && executionTestCases.length === 0) {
      setLocalError(
        executionSetupError || "No Python test cases are available.",
      );
      return;
    }

    const view = editorViewRef.current;
    const actionMap = actionMapRef.current;
    if (!view || !actionMap) {
      setLocalError("Editor is still connecting. Please try again.");
      return;
    }

    const codeSnapshot = view.state.doc.toString();
    if (!codeSnapshot.trim()) {
      setLocalError("The editor is empty.");
      return;
    }

    applyErrorLine(null);
    actionMap.set(ACTIVE_ACTION_KEY, {
      id: crypto.randomUUID(),
      type,
      status: "awaiting_approval",
      initiatorId: userId,
      initiatorName: displayName,
      codeSnapshot,
      approvals: { [userId]: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const approveAction = () => {
    const actionMap = actionMapRef.current;
    const action = activeAction;
    if (!actionMap || !action || !userId) {
      return;
    }

    const approvals = { ...action.approvals, [userId]: true };
    const allApproved = requiredUsers.every((id) => approvals[id]);
    actionMap.set(ACTIVE_ACTION_KEY, {
      ...action,
      approvals,
      status: allApproved ? "running" : "awaiting_approval",
      updatedAt: new Date().toISOString(),
    });
  };

  const declineAction = () => {
    const actionMap = actionMapRef.current;
    const action = activeAction;
    if (!actionMap || !action || !userId) {
      return;
    }

    actionMap.set(ACTIVE_ACTION_KEY, {
      ...action,
      status: "declined",
      declinedBy: userId,
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
  };

  const clearAction = () => {
    actionMapRef.current?.delete(ACTIVE_ACTION_KEY);
    setCopiedActionId(null);
    applyErrorLine(null);
  };

  const copyConvertedCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedActionId(activeAction?.id ?? null);
  };

  const currentUserApproved =
    Boolean(userId && activeAction?.approvals[userId]);
  const pendingApproval =
    activeAction?.status === "awaiting_approval" && !currentUserApproved;

  return (
    <div className="relative flex h-full min-h-[400px] flex-col border border-slate-300 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <button
          type="button"
          onClick={() => startAction("pseudocode_to_python")}
          disabled={!canStartAction}
          className="rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Convert pseudocode
        </button>
        <button
          type="button"
          onClick={() => startAction("execute_python")}
          disabled={!canStartAction || executionTestCases.length === 0}
          className="rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Run Python
        </button>
        <div className="ml-auto text-xs text-slate-500">
          {editorFrozen
            ? "Editor frozen"
            : isPeerConnected && isProviderConnected
              ? "Ready"
              : "Waiting for connection"}
        </div>
      </div>

      {localError || executionSetupError ? (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {localError || executionSetupError}
        </div>
      ) : null}

      <div id="editor" ref={editorContainerRef} className="min-h-0 flex-1" />

      {editorFrozen ? (
        <div className="pointer-events-none absolute inset-x-0 top-[41px] z-20 flex justify-center px-4 pt-3">
          <div className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-lg">
            {activeAction?.status === "running"
              ? `${actionLabel[activeAction.type]} is running.`
              : `Waiting for approval to ${actionLabel[
                  activeAction?.type ?? "pseudocode_to_python"
                ].toLowerCase()}.`}
          </div>
        </div>
      ) : null}

      {!isPeerConnected || !isProviderConnected ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 p-4">
          <div className="rounded bg-white p-8 text-lg text-red-600 shadow">
            {!isProviderConnected
              ? "You are disconnected. Reconnecting to server..."
              : "Peer disconnected. Session will continue when they reconnect."}
          </div>
        </div>
      ) : null}

      {activeAction ? (
        <ActionModal
          action={activeAction}
          currentUserApproved={currentUserApproved}
          pendingApproval={pendingApproval}
          copiedActionId={copiedActionId}
          onApprove={approveAction}
          onDecline={declineAction}
          onClose={clearAction}
          onCopy={copyConvertedCode}
        />
      ) : null}
    </div>
  );
}

function ActionModal({
  action,
  currentUserApproved,
  pendingApproval,
  copiedActionId,
  onApprove,
  onDecline,
  onClose,
  onCopy,
}: {
  action: EditorSharedAction;
  currentUserApproved: boolean;
  pendingApproval: boolean;
  copiedActionId: string | null;
  onApprove: () => void;
  onDecline: () => void;
  onClose: () => void;
  onCopy: (code: string) => Promise<void>;
}) {
  const title = actionLabel[action.type];
  const isTerminal =
    action.status === "completed" ||
    action.status === "failed" ||
    action.status === "declined";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4">
      <div className="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Started by {action.initiatorName}
            </p>
          </div>
          {isTerminal ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          ) : null}
        </div>

        <div className="max-h-[64vh] overflow-y-auto px-5 py-4">
          {action.status === "awaiting_approval" ? (
            <VoteContent
              pendingApproval={pendingApproval}
              currentUserApproved={currentUserApproved}
              onApprove={onApprove}
              onDecline={onDecline}
            />
          ) : null}

          {action.status === "running" ? (
            <div className="rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
              {title} is running. The editor is frozen for both users.
            </div>
          ) : null}

          {action.status === "declined" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              The action was declined.
            </div>
          ) : null}

          {action.status === "failed" ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {action.error || "Action failed. Please try again."}
            </div>
          ) : null}

          {action.status === "completed" &&
          action.type === "pseudocode_to_python" &&
          action.result ? (
            <ConversionResultContent
              result={action.result as ConversionResult}
              copied={copiedActionId === action.id}
              onCopy={onCopy}
            />
          ) : null}

          {action.status === "completed" &&
          action.type === "execute_python" &&
          action.result ? (
            <ExecutionResultContent
              result={action.result as PythonExecutionResult}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VoteContent({
  pendingApproval,
  currentUserApproved,
  onApprove,
  onDecline,
}: {
  pendingApproval: boolean;
  currentUserApproved: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  if (!pendingApproval) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {currentUserApproved
          ? "Your approval is recorded. Waiting for your peer."
          : "Waiting for approval."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        Your peer wants to run this action. The editor is frozen until you
        approve or decline.
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDecline}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onApprove}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Approve
        </button>
      </div>
    </div>
  );
}

function ConversionResultContent({
  result,
  copied,
  onCopy,
}: {
  result: ConversionResult;
  copied: boolean;
  onCopy: (code: string) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">Converted Python</p>
        <button
          type="button"
          onClick={() => void onCopy(result.pythonCode)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[44vh] overflow-auto rounded-md bg-slate-950 p-4 text-sm text-slate-100">
        <code>{result.pythonCode}</code>
      </pre>
    </div>
  );
}

function ExecutionResultContent({
  result,
}: {
  result: PythonExecutionResult;
}) {
  const total = result.passedTestCases.length + result.failedTestCases.length;
  const hasErrors = result.errorsPresent.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-slate-200 px-3 py-2">
          <div className="text-lg font-semibold text-slate-900">{total}</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="text-lg font-semibold text-emerald-700">
            {result.passedTestCases.length}
          </div>
          <div className="text-xs text-emerald-700">Passed</div>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <div className="text-lg font-semibold text-red-700">
            {result.failedTestCases.length}
          </div>
          <div className="text-xs text-red-700">Failed</div>
        </div>
      </div>

      {hasErrors ? (
        <div className="space-y-2">
          {result.errorsPresent.map((issue, index) => (
            <div
              key={`${issue.type}-${index}`}
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              <span className="font-semibold">{issue.type}</span>
              {issue.line ? ` on line ${issue.line}` : ""}: {issue.message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {[...result.passedTestCases, ...result.failedTestCases]
          .sort((a, b) => a.index - b.index)
          .map((testCase) => {
            const failed = "reason" in testCase;
            return (
              <div
                key={testCase.index}
                className={`rounded-md border px-3 py-3 text-sm ${
                  failed
                    ? "border-red-200 bg-red-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-900">
                    Test case {testCase.index + 1}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      failed ? "text-red-700" : "text-emerald-700"
                    }`}
                  >
                    {failed ? "Failed" : "Passed"}
                  </span>
                </div>
                <ResultLine label="Input" value={testCase.input} />
                <ResultLine
                  label="Expected"
                  value={testCase.expectedOutput}
                />
                <ResultLine
                  label="Actual"
                  value={testCase.actualOutput || ""}
                />
                {failed ? (
                  <ResultLine label="Reason" value={testCase.reason} />
                ) : null}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1 grid grid-cols-[90px_1fr] gap-2">
      <span className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </span>
      <pre className="whitespace-pre-wrap break-words text-xs text-slate-800">
        {value}
      </pre>
    </div>
  );
}
