import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { endSession, getSessionInformation } from "../api/collaborationApi";
import { CollaborativeEditor } from "../components/collaborative/CollaborativeEditor";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { QuestionDescriptionPreview } from "../components/QuestionDescriptionPreview";
import { useAuth } from "../context/AuthContext";

export default function CollaborativeEditorPage() {
  const { roomId } = useParams();
  const { token } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<{
    descriptionContent: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  if (!roomId) {
    return <div>Room ID is required</div>;
  }
  const navigate = useNavigate();

  useEffect(() => {
    getSessionInformation(roomId, token || "")
      .then((info) => {
        console.log("Session info:", info);
        if (!info.ok) {
          throw new Error(info.error);
        } else {
          setSessionInfo({
            descriptionContent: info.session.descriptionContent,
          });
        }
        setIsLoading(false);
      })
      .catch((error) => {
        alert("Error fetching editor session.");
        console.error("Failed to fetch session:", error);
        setIsLoading(false);
      });
  }, [roomId, token]);

  if (isLoading) {
    return <LoadingSpinner />;
  }
  if (sessionInfo == null) {
    return (
      <div className="text-center text-red-500 text-3xl">
        Invalid Editor Room
      </div>
    );
  }
  return (
    <div className="h-full">
      <div>
        <div
          className="red-button-class hover:cursor-pointer"
          onClick={() => {
            endSession(roomId, token || "").then((success) => {
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

      <div className="h-full grid grid-cols-2">
        <QuestionDescriptionPreview
          description={sessionInfo.descriptionContent}
        />
        <CollaborativeEditor
          roomId={roomId}
          onSessionEnded={() => {
            navigate("/");
          }}
        />
      </div>
    </div>
  );
}
