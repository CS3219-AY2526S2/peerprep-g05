import { WebSocket } from "ws";
import * as awareness from "y-protocols/awareness";
import * as Y from "yjs";
import { WS_CLOSE_CODES } from "./const.js";
import type { CustomWebSocket, RoomKey, YDocWithAwareness } from "./types.js";

const roomDocs = new Map<RoomKey, YDocWithAwareness>();
const roomClients = new Map<RoomKey, Set<CustomWebSocket>>();
const socketAwarenessClientIds = new Map<CustomWebSocket, Set<number>>();

export const addAwarenessClient = (
  socket: CustomWebSocket,
  clientIds: number[],
) => {
  if (clientIds.length === 0) {
    return;
  }

  const existingIds = socketAwarenessClientIds.get(socket) ?? new Set<number>();
  clientIds.forEach((id) => existingIds.add(id));
  socketAwarenessClientIds.set(socket, existingIds);
};

export const clearClientAwarenessStates = (
  roomName: RoomKey,
  socket: CustomWebSocket,
) => {
  const doc = roomDocs.get(roomName);
  const awarenessClientIds = socketAwarenessClientIds.get(socket);

  if (!doc || !awarenessClientIds || awarenessClientIds.size === 0) {
    return;
  }

  awareness.removeAwarenessStates(
    doc.awareness,
    Array.from(awarenessClientIds),
    socket,
  );
  awarenessClientIds.clear();
  socketAwarenessClientIds.delete(socket);
};

/**
 * Broadcast to all ws in the room, excluding the `exclude` ws.
 * @param roomName Room Name to broadcast to
 * @param message Message to broadcast
 * @param exclude WS to exclude the broadcast to
 */
export const broadcastToRoom = (
  roomName: RoomKey,
  message: Uint8Array,
  exclude?: CustomWebSocket,
) => {
  getRoomClients(roomName).forEach((client: WebSocket) => {
    const socket = client as CustomWebSocket;
    if (socket !== exclude) {
      socket.send(message);
    }
  });
};

export const closeRoomConnections = (
  roomName: RoomKey,
  code = WS_CLOSE_CODES.SESSION_ENDED,
  reason = "SESSION_ENDED",
  excludeSocket?: CustomWebSocket,
) => {
  getRoomClients(roomName).forEach((socket) => {
    if (socket === excludeSocket) {
      return;
    }

    clearClientAwarenessStates(roomName, socket);
    if (socket.readyState === WebSocket.OPEN) {
      socket.close(code, reason);
    }
    removeClientFromRoom(roomName, socket);
  });

  cleanupRoomIfEmpty(roomName);
};

// Initialize a Y.Doc for the room if it doesn't exist
export const initDocForRoom = (roomName: RoomKey) => {
  const existingDoc = roomDocs.get(roomName);
  if (existingDoc) {
    return existingDoc;
  }

  const doc = new Y.Doc() as YDocWithAwareness;

  // Attach awareness to the doc instance
  doc.awareness = new awareness.Awareness(doc);

  roomDocs.set(roomName, doc);
  return doc;
};

export const getRoomDoc = (roomName: RoomKey) => roomDocs.get(roomName);

export const getRoomClients = (roomName: RoomKey) =>
  roomClients.get(roomName) || new Set();

export const addClientToRoom = (roomName: RoomKey, client: CustomWebSocket) => {
  if (!roomClients.has(roomName)) {
    roomClients.set(roomName, new Set());
  }
  roomClients.get(roomName)!.add(client);
};

export const removeClientFromRoom = (
  roomName: RoomKey,
  client: CustomWebSocket,
) => {
  const clients = roomClients.get(roomName);
  if (!clients) {
    return;
  }

  clients.delete(client);
  if (clients.size === 0) {
    roomClients.delete(roomName);
  }
};

const cleanupRoomIfEmpty = (roomName: RoomKey) => {
  const clients = roomClients.get(roomName);
  if (clients && clients.size > 0) {
    return;
  }

  roomClients.delete(roomName);
  roomDocs.delete(roomName);
};
