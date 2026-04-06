import { config } from "@/config.js";
import { randomUUID } from "node:crypto";
import { createClient } from "redis";

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

const SESSION_KEY_PREFIX = "collaboration:session:";
const SESSION_IDS_KEY = "collaboration:sessions";

const redisClient = createClient({
  url: config.REDIS_URL,
});

redisClient.on("error", (err) => {
  console.error("Redis client error", err);
});
await redisClient.connect();

const getSessionKey = (sessionId: string) =>
  `${SESSION_KEY_PREFIX}${sessionId}`;

const _getSessionById = async (sessionId: string) => {
  const session = await redisClient.get(getSessionKey(sessionId));
  if (!session) return null;

  return JSON.parse(session) as CollaborationSession;
};

export const getSessions = async (status?: SessionStatus) => {
  const sessionIds = await redisClient.sMembers(SESSION_IDS_KEY);
  if (sessionIds.length === 0) {
    return [];
  }

  // TODO: use redis to check and filter? or maybe redisClient.json.set/get?
  const sessions = (
    await Promise.all(sessionIds.map((sessionId) => _getSessionById(sessionId)))
  ).filter((session): session is CollaborationSession => session !== null);

  if (!status) {
    return sessions;
  }

  return sessions.filter((session) => session.status === status);
};

export const createSession = async (users: string[], questionId: string) => {
  // fetch question
  const url = config.QUESTION_API_BASE_URL + `/api/v1/questions/${questionId}`;

  const response = (await fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to fetch question data");
      }
      return res.json();
    })
    .catch((err) => {
      console.error("Error fetching question data: ", err);
      throw new Error("Failed to fetch question data");
    })) as { data: { title: string; description: string } };

  // TODO: maybe move to an adapter to support more feature like test cases.
  const { data: questionData } = response;

  return _createSession(
    users,
    "# Type your code here",
    questionData.title + "\n" + questionData.description,
    questionId,
  );
};

const _createSession = async (
  users: string[],
  editorContent: string,
  descriptionContent: string,
  questionId: string,
) => {
  const newSession: CollaborationSession = {
    id: randomUUID(),
    users,
    editorContent,
    descriptionContent,
    status: "ACTIVE",
    questionId,
    startedOn: new Date().toISOString(),
    updatedOn: new Date().toISOString(),
    endedOn: null,
  };

  await redisClient.set(
    getSessionKey(newSession.id),
    JSON.stringify(newSession),
  );
  await redisClient.sAdd(SESSION_IDS_KEY, newSession.id);

  return newSession;
};

export const getSessionById = async (sessionId: string) => {
  return _getSessionById(sessionId);
};

export const endSession = async (sessionId: string) => {
  const session = await _getSessionById(sessionId);
  if (!session) return null;

  const endedSession: CollaborationSession = {
    ...session,
    status: "ENDED",
    endedOn: new Date().toISOString(),
  };

  await redisClient.set(
    getSessionKey(session.id),
    JSON.stringify(endedSession),
  );

  return endedSession;
};
