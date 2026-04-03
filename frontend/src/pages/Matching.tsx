import { STATE } from "../utils/types";
import { useMatchmaking } from "../hooks/useMatchmaking";
import { MatchFormCard } from "../components/MatchFormCard";
import { QueuingCard } from "../components/QueuingCard";
import { MatchProposedModal } from "../components/MatchProposedModal";
import { MatchConfirmedCard } from "../components/MatchConfirmedCard";

export default function Matching() {
  const {
    fsm, error, loading, elapsedFmt,
    matchInfo, proposedMatch, confirmedMatch, accepted, questionMatch,
    findMatch, cancel, accept, decline, reset,
  } = useMatchmaking();

  const showModal = fsm !== STATE.CONFIRMED && proposedMatch != null;

  return (
    <div className="relative flex min-h-[calc(100vh-52px)] items-center justify-center p-8">
      {fsm === STATE.IDLE && (
        <MatchFormCard onFindMatch={findMatch} error={error} loading={loading} />
      )}

      {fsm === STATE.QUEUING && matchInfo && (
        <QueuingCard matchInfo={matchInfo} onCancel={cancel} elapsedFmt={elapsedFmt} />
      )}

      {fsm === STATE.CONFIRMED && confirmedMatch && (
        <MatchConfirmedCard confirmedMatch={confirmedMatch} questionMatch={questionMatch} onPlayAgain={reset}/>
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
  );
}