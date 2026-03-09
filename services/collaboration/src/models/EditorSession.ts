import { Schema, model } from "mongoose";

const EditorSessionSchema = new Schema({
  status: {
    type: String,
    enum: [
      "ACTIVE", // As long as one of the 2 users is still in the session.
      "ENDED", // Initiated by any user, applies to both users.
    ],
  },
  descriptionContent: String,
  editorContent: String,
  users: {
    type: [String],
    length: 2,
    reason: "Needs exactly 2 users in a session",
  },
  startedOn: {
    type: Date,
    default: Date.now,
  },
  endedOn: Date,
});

export const EditorSessionModel = model("EditorSession", EditorSessionSchema);
