import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { endSession, getSessionInformation } from "../api/collaborationApi";
import { CollaborativeEditor } from "../components/collaborative/CollaborativeEditor";
import { Chat } from "../components/collaborative/Chat";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { QuestionDescriptionPreview } from "../components/QuestionDescriptionPreview";

export default function CollaborativeEditorPage() {
  const { roomId } = useParams();
  const [sessionInfo, setSessionInfo] = useState<{
    descriptionContent: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  if (!roomId) {
    return <div>Room ID is required</div>;
  }
  const navigate = useNavigate();

  useEffect(() => {
    getSessionInformation(roomId).then((info) => {
      console.log("Session info:", info);
      if (!info.ok) {
        setError(info.error);
      } else {
        setError(null);
        setSessionInfo({
          descriptionContent: info.session.descriptionContent,
        });
      }
      setIsLoading(false);
    });
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
                alert("Failed to end session.");
              }
              navigate("/");
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
          onSessionEnded={() => {
            navigate("/");
            alert("Session has ended.");
          }}
        />
        <Chat roomId={roomId} />
      </div>
    </div>
  );
}
