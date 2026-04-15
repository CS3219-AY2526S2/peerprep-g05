import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { endSession, getActiveSession } from "../api/collaborationApi";
import { MatchConfirmedCard } from "../components/MatchConfirmedCard";
import { MatchFormCard } from "../components/MatchFormCard";
import { MatchProposedModal } from "../components/MatchProposedModal";
import { QueuingCard } from "../components/QueuingCard";
import { useMatchmakingContext } from "../hooks/MatchingContext";
import { CollaborationSession } from "../types/EditorSession";
import { STATE } from "../utils/types";

export default function Matching() {
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<
    CollaborationSession | null | undefined
  >(undefined);

  const {
    fsm,
    error,
    loading,
    elapsedFmt,
    matchInfo,
    proposedMatch,
    confirmedMatch,
    accepted,
    questionMatch,
    findMatch,
    cancel,
    accept,
    decline,
    reset,
    disconnectWs,
  } = useMatchmakingContext();
  useEffect(() => {
    // check for active editor session for user, if exists, check if user wants to terminate or resume the editor session
    getActiveSession().then((result) => {
      if (result.ok) {
        if (result.session.id !== questionMatch?.sessionId) {
          setActiveSession(result.session);
        } else {
          setActiveSession(null);
          toast.error("Please refresh the page and try again.");
        }
      } else {
        setActiveSession(null);
      }
    });
  }, []);

  useEffect(() => {
    if (questionMatch?.sessionId) {
      disconnectWs?.();
      navigate(`/editor/${questionMatch.sessionId}`);
    }
  }, [questionMatch, navigate]);

  const showModal = fsm !== STATE.CONFIRMED && proposedMatch != null;

  return activeSession === undefined ? (
    <div>Checking for active session...</div>
  ) : activeSession === null ? ( // no active session, show matchmaking
    <div className="relative flex min-h-[calc(100vh-52px)] items-center justify-center p-8">
      {fsm === STATE.IDLE && (
        <MatchFormCard
          onFindMatch={findMatch}
          error={error}
          loading={loading}
        />
      )}

      {fsm === STATE.QUEUING && matchInfo && (
        <QueuingCard
          matchInfo={matchInfo}
          onCancel={cancel}
          elapsedFmt={elapsedFmt}
        />
      )}

      {fsm === STATE.CONFIRMED && confirmedMatch && (
        <MatchConfirmedCard
          confirmedMatch={confirmedMatch}
          questionMatch={questionMatch}
          onPlayAgain={reset}
        />
      )}

      {showModal && proposedMatch && matchInfo && (
        <MatchProposedModal
          matchInfo={matchInfo}
          proposedMatch={proposedMatch}
          onAccept={accept}
          onDecline={decline}
          accepted={accepted}
          proposalSecs={25}
        />
      )}
    </div>
  ) : (
    <div>
      You have an active session.
      <button onClick={() => navigate(`/editor/${activeSession.id}`)}>
        Resume Session
      </button>
      <button
        onClick={() =>
          endSession(activeSession.id)
            .then((r) =>
              r ? navigate(0) : toast.error("Failed to end session"),
            )
            .then(() => setActiveSession(null))
        }
      >
        Terminate Session
      </button>
    </div>
  );
}
