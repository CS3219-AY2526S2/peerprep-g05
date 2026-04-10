import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSessionInformation } from "../api/collaborationApi";
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
  if (!roomId) {
    return <div>Room ID is required</div>;
  }

  useEffect(() => {
    getSessionInformation(roomId)
      .then((info) => {
        console.log("Session info:", info);
        setSessionInfo(info);
        setIsLoading(false);
      })
      .catch((error) => {
        alert("Error fetching editor session.");
        console.error("Failed to fetch session:", error);
        setIsLoading(false);
      });
  }, [roomId]);

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
    <div className="h-full grid grid-cols-2">
      <QuestionDescriptionPreview
        description={sessionInfo.descriptionContent}
      />
      <CollaborativeEditor roomId={roomId} />
      <Chat roomId={roomId} />
    </div>
  );
}
