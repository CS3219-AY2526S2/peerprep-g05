/*
 * This code is based on y-websocketserver
 * https://github.com/yjs/y-websocket-server/
 * Copyright (c) 2025 Kevin Jahns <kevin.jahns@protonmail.com>.
 * The MIT License (MIT) https://github.com/yjs/y-websocket-server/blob/main/LICENSE
 */
import type { IncomingMessage } from "http";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { WebSocket, WebSocketServer } from "ws";
import * as awareness from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";

type RoomKey = string;
type YDocWithAwareness = Y.Doc & { awareness: awareness.Awareness };
// Define custom interface to track room on the socket
interface CustomWebSocket extends WebSocket {
  room?: RoomKey;
}
const wss = new WebSocketServer({ noServer: true });

const room_docs = new Map<RoomKey, YDocWithAwareness>();

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

// Handle new message
const handleMessage = (
  conn: CustomWebSocket,
  doc: YDocWithAwareness,
  message: Uint8Array,
) => {
  const encoder = encoding.createEncoder();
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case MESSAGE_SYNC:
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, doc, conn);

      // If the `encoder` only contains the type of reply message and no
      // message, there is no need to send the message. When `encoder` only
      // contains the type of reply, its length is 1.
      if (encoding.length(encoder) > 1) {
        conn.send(encoding.toUint8Array(encoder));
      }
      break;
    case MESSAGE_AWARENESS:
      awareness.applyAwarenessUpdate(
        doc.awareness,
        decoding.readVarUint8Array(decoder),
        conn,
      );
      break;
  }
};

// Connection Logic
wss.on("connection", (conn: CustomWebSocket, req: IncomingMessage) => {
  const roomName = req.url?.split("/").pop() || "default";
  conn.room = roomName;

  // Initialize Doc for the room if it doesn't exist
  if (!room_docs.has(roomName)) {
    const doc = new Y.Doc() as Y.Doc & { awareness: awareness.Awareness };
    // Attach awareness to the doc instance
    doc.awareness = new awareness.Awareness(doc);

    // Update listener when document change, broadcast the update to all clients in the same room
    doc.on("update", (update: Uint8Array) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      // Broadcast to all clients in the room
      wss.clients.forEach((client: CustomWebSocket) => {
        if (client.readyState === WebSocket.OPEN && client.room === roomName) {
          client.send(message);
        }
      });
    });

    room_docs.set(roomName, doc);
  }

  const doc = room_docs.get(roomName)!;

  // Initial Sync when user joins
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  conn.send(encoding.toUint8Array(encoder));

  conn.on("message", (data: Buffer) => {
    handleMessage(conn, doc, new Uint8Array(data));
  });

  // Cleanup when user leaves
  conn.on("close", () => {
    const roomClients = Array.from(wss.clients as Set<CustomWebSocket>).filter(
      (c) => c.room === roomName,
    );
    if (roomClients.length === 0) {
      console.log(`Room ${roomName} is empty. Cleaning up...`);
    }
  });
});
export default wss;
