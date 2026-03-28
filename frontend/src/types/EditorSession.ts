export type SessionStatus = "ACTIVE" | "ENDED";
export type CollaborationSession = {
  id: string;
  status: SessionStatus;
  questionId: string;
  descriptionContent: string;
  editorContent: string;
  users: string[];
  startedOn: string;
  updatedOn: string;
  endedOn: string | null;
};
