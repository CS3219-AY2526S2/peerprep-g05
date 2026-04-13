import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { endSession, getSessionInformation } from "../api/collaborationApi";
import { CollaborativeEditor } from "../components/collaborative/CollaborativeEditor";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { QuestionDescriptionPreview } from "../components/QuestionDescriptionPreview";
import toast from "react-hot-toast";

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
          onSessionEnded={() => {
            navigate("/");
            toast.success("Session has ended.");
          }}
        />
      </div>
    </div>
  );
}
