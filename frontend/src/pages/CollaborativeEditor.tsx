import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { endSession, getSessionInformation } from "../api/collaborationApi";
import {
  getCollaborationQuestionPayload,
  getQuestionById,
} from "../api/questionApi";
import type { PythonExecutionTestCase } from "../api/executionApi";
import { CollaborativeEditor } from "../components/collaborative/CollaborativeEditor";
import { Chat } from "../components/collaborative/Chat";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { QuestionDescriptionPreview } from "../components/QuestionDescriptionPreview";
import toast from "react-hot-toast";

function toPythonExecutionTestCases(
  testCases: PythonExecutionTestCase[] | undefined,
): PythonExecutionTestCase[] {
  return (testCases ?? []).filter(
    (testCase) =>
      typeof testCase.input === "string" &&
      typeof testCase.expected_output === "string",
  );
}

export default function CollaborativeEditorPage() {
  const { roomId: routeRoomId } = useParams();
  const roomId = routeRoomId ?? "";
  const navigate = useNavigate();
  const [sessionInfo, setSessionInfo] = useState<{
    descriptionContent: string;
    questionId: string;
    users: string[];
    boilerplateCode: string;
    executionTestCases: PythonExecutionTestCase[];
    executionPayloadError: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  if (!roomId) {
    return <div>Room ID is required</div>;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setIsLoading(true);
      const info = await getSessionInformation(roomId);
      if (cancelled) {
        return;
      }

      if (!info.ok) {
        setError(info.error);
        setSessionInfo(null);
        setIsLoading(false);
        return;
      }

      let executionTestCases: PythonExecutionTestCase[] = [];
      let executionPayloadError: string | null = null;
      let boilerplateCode = "";

      const loadQuestionTestCases = async () => {
        const question = await getQuestionById(info.session.questionId);
        boilerplateCode = question.data.boilerplate_code || boilerplateCode;
        return toPythonExecutionTestCases(question.data.test_cases);
      };

      try {
        const payload = await getCollaborationQuestionPayload(
          info.session.questionId,
        );
        boilerplateCode = payload.data.execution.boilerplate_code || "";
        executionTestCases = toPythonExecutionTestCases(
          payload.data.execution.test_cases,
        );
        if (executionTestCases.length === 0) {
          executionTestCases = await loadQuestionTestCases();
        }
      } catch {
        try {
          executionTestCases = await loadQuestionTestCases();
        } catch (err) {
          const apiError = err as { data?: { error?: string } };
          executionPayloadError =
            apiError.data?.error || "Failed to load Python test cases.";
        }
      }

      if (!executionPayloadError && executionTestCases.length === 0) {
        executionPayloadError = "No Python test cases are available.";
      }

      if (!cancelled) {
        setError(null);
        setSessionInfo({
          descriptionContent: info.session.descriptionContent,
          questionId: info.session.questionId,
          users: info.session.users,
          boilerplateCode,
          executionTestCases,
          executionPayloadError,
        });
        setIsLoading(false);
      }
    }

    loadSession().catch(() => {
      if (!cancelled) {
        setError("Failed to load editor session.");
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (isLoading) {
    return <LoadingSpinner />;
  }
  if (error || sessionInfo == null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-center text-red-500 text-3xl">
          {error || "Invalid Editor Room"}
        </p>
      </div>
    );
  }
  return (
    <div className="h-full ">
      <div>
        <div
          className="red-button-class hover:cursor-pointer"
          onClick={() => {
            endSession(roomId).then((success) => {
              if (!success) {
                toast.error("Failed to end session. Please try again.");
              } else {
                toast.success("Session ended successfully.");
                navigate("/");
              }
            });
          }}
        >
          End Session
        </div>
      </div>

      <div className="h-full grid grid-cols-2 relative">
        <QuestionDescriptionPreview
          description={sessionInfo.descriptionContent}
        />
        <CollaborativeEditor
          roomId={roomId}
          questionId={sessionInfo.questionId}
          sessionUsers={sessionInfo.users}
          initialEditorContent={sessionInfo.boilerplateCode}
          executionTestCases={sessionInfo.executionTestCases}
          executionSetupError={sessionInfo.executionPayloadError}
          onSessionEnded={() => {
            navigate("/");
            toast.success("Session has ended.");
          }}
        />
        <Chat roomId={roomId} />
      </div>
    </div>
  );
}
