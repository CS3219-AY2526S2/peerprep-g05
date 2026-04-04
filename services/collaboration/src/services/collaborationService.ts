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
const USER_ACTIVE_SESSION_KEY_PREFIX = "collaboration:user-active-session:";

const redisClient = createClient({
  url: config.REDIS_URL,
});

redisClient.on("error", (err) => {
  console.error("Redis client error", err);
});
await redisClient.connect();

const getSessionKey = (sessionId: string) =>
  `${SESSION_KEY_PREFIX}${sessionId}`;

const getUserActiveSessionKey = (userId: string) =>
  `${USER_ACTIVE_SESSION_KEY_PREFIX}${userId}`;

const getActiveSessionIdsForUsers = async (userIds: string[]) => {
  const sessionIds = await Promise.all(
    userIds.map((userId) => redisClient.get(getUserActiveSessionKey(userId))),
  );
  return [
    ...new Set(
      sessionIds.filter((sessionId): sessionId is string => sessionId !== null),
    ),
  ];
};

/**
 * Atomically mark all users as active. Fails after 3 retries or if any user has an active session.
 *
 * @param users users to mark session as Active
 * @param sessionId sessionId for the session they are active in
 * @return boolean indicating if the operation was successful.
 */
// const markUserActiveSession = async (users: string[], sessionId: string) => {
//   if (users.length === 0) {
//     return true;
//   }

//   // retry 3 times only,
//   for (let i = 0; i < 3; i++) {
//     const userSessionKeys = users.map((userId) =>
//       getUserActiveSessionKey(userId),
//     );
//     // watch all the affected key for changes
//     redisClient.watch(userSessionKeys);
//     const redisClientMulti = redisClient.multi();

//     // check if any user has an active session
//     userSessionKeys.forEach((key) => redisClientMulti.exists(key));
//     const result = redisClientMulti.exec().then((results) => {
//       const hasActiveSession = !results.every(
//         (result) => (result as unknown as number) === 0,
//       );
//       if (hasActiveSession) {
//         return false;
//       }
//       // mark all active session
//       const result = redisClient
//         .multi()
//         .mSet(
//           Object.fromEntries(userSessionKeys.map((key) => [key, sessionId])),
//         )
//         .exec();
//       if (result !== null) {
//         return true;
//       } else {
//         return false;
//       }
//     });

//     redisClient.unwatch();
//     if (await result) {
//       return true;
//     }
//   }

//   // ensure that sessions are properly released in case of failure.
//   await releaseUsersFromSession(users, sessionId);
//   return false;
// };

const filterUserWithActiveSession = async (userIds: string[]) => {
  const activeSessionIds = await getActiveSessionIdsForUsers(userIds);
  return activeSessionIds;
};

const releaseUsersFromSession = async (users: string[], sessionId: string) => {
  if (users.length === 0) {
    return true;
  }

  // max retry 3 times only
  for (let i = 0; i < 3; i++) {
    const userSessionKeys = users.map((userId) =>
      getUserActiveSessionKey(userId),
    );
    // watch all the affected key for changes
    redisClient.watch(userSessionKeys);

    const redisClientMulti = redisClient.multi();
    // get all active session for the users, which is allowed to be release
    userSessionKeys.forEach((key) => redisClientMulti.get(key));
    const results = await redisClientMulti.exec();
    if (results !== null) {
      const activeSessions = results.map(
        (result) => (result as unknown as string) === sessionId,
      );
      const delMulti = redisClient.multi();
      activeSessions
        .map((isActive, index) => (isActive ? userSessionKeys[index] : null))
        .filter((key): key is string => key !== null)
        .forEach((key) => delMulti.del(key));
      const delResults = await delMulti.exec();
      if (delResults === null) {
        // watched key changed, retry
        continue;
      }
      return true;
    }
  }
  return false;
};

const _getSessionById = async (sessionId: string) => {
  const session = await redisClient.get(getSessionKey(sessionId));
  if (!session) return null;
  // TODO: To implement proper filtering, based on what one is trying to do
  // Might need to return ended session to tell reconnected user the session is terminated
  if (JSON.parse(session).status === "ENDED") {
    return null;
  }

  return JSON.parse(session) as CollaborationSession;
};

export const getActiveSessionsByUserId = async (userId: string) => {
  return filterUserWithActiveSession([userId]).then((result) => {
    if (result.length === 0) {
      return [];
    }
    return Promise.all(
      result.map((sessionId) => _getSessionById(sessionId)),
    ).then((sessions) =>
      sessions.filter(
        (session): session is CollaborationSession => session !== null,
      ),
    );
  });
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
  const uniqueUsers = [...new Set(users)];
  if (uniqueUsers.length !== users.length) {
    throw new Error("Users in a collaboration session must be unique");
  }
  // check if there are active session for any user, if yes, return conflict error
  if ((await filterUserWithActiveSession(users)).length > 0) {
    // TODO: proper error message for the user session
    // For now, just release all sessions.
    const activeSessionIds = await filterUserWithActiveSession(users);
    await Promise.all(
      activeSessionIds.map(async (sessionId) => {
        await releaseUsersFromSession(users, sessionId);
      }),
    );
    // throw new Error("One or more users already have an active session");
  }

  // TODO: proper check for active session
  const newSessionId = randomUUID();
  // if (!(await markUserActiveSession(users, newSessionId))) {
  //   throw new Error(
  //     "Failed to mark users as active for the session. Please try again.",
  //   );
  // }

  try {
    // fetch question
    const questionUrl =
      config.QUESTION_API_BASE_URL + `/api/v1/questions/${questionId}`;
    const response = (await fetch(questionUrl)
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
      newSessionId,
      users,
      "# Type your code here",
      questionData.title + "\n" + questionData.description,
      questionId,
    );
  } catch (error) {
    await releaseUsersFromSession(users, newSessionId);
    throw error;
  }
};

const _createSession = async (
  sessionId: string,
  users: string[],
  editorContent: string,
  descriptionContent: string,
  questionId: string,
) => {
  const newSession: CollaborationSession = {
    id: sessionId,
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

  await releaseUsersFromSession(session.users, session.id);

  return endedSession;
};
