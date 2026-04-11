import type { IncomingMessage } from "http";
import { WebSocketServer } from "ws";
import { WS_CLOSE_CODES } from "./websocket/const.js";
import {
  attachDocListeners,
  handleMessage,
  initSyncForClient,
} from "./websocket/handler.js";
import type { CustomWebSocket } from "./websocket/types.js";
import {
  addClientToRoom,
  closeRoomConnections,
  handleClientDisconnect,
  initDocForRoom,
} from "./websocket/wsRooms.js";

const wss = new WebSocketServer({ noServer: true });

// Connection Logic
wss.on("connection", async (conn: CustomWebSocket, req: IncomingMessage) => {
  const roomName = req.url?.split("/").pop()?.split("?")[0];
  if (!roomName) {
    console.error("Connection missing room name");
    conn.close(WS_CLOSE_CODES.INVALID_ENDPOINT, "Missing room name");
    return;
  }
  conn.room = roomName;
  addClientToRoom(roomName, conn);
  console.log(`Client connected to room: ${roomName}`);

  // Initialize Doc for the room if it doesn't exist
  const doc = initDocForRoom(roomName);
  console.log("Doc initialized for room: ", roomName);

  initSyncForClient(conn, doc);
  attachDocListeners(roomName, doc);
  console.log("Attached doc listeners for room: ", roomName);

  conn.on("message", (data: Buffer) => {
    handleMessage(conn, doc, new Uint8Array(data));
  });

  conn.on("close", (code: number, reason: Buffer<ArrayBufferLike>) => {
    if (code === WS_CLOSE_CODES.SESSION_ENDED) {
      closeRoomConnections(roomName, code, reason.toString(), conn);
    }

    handleClientDisconnect(roomName, conn);
  });
});
export default wss;
