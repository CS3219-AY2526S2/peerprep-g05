import { CollaborativeEditor } from "../components/collaborative/CollaborativeEditor";
import { QuestionDescriptionPreview } from "../components/QuestionDescriptionPreview";
import { useParams } from "react-router-dom";

export default function CollaborativeEditorPage() {
  const { roomId } = useParams();
  if (!roomId) {
    return <div>Room ID is required</div>;
  }
  return (
    <div className="h-full grid grid-cols-2">
      <QuestionDescriptionPreview
        description={`# Question Title
This is a **Question description**. Supports markdown`}
      />
      <CollaborativeEditor roomId={roomId} />
    </div>
  );
}
