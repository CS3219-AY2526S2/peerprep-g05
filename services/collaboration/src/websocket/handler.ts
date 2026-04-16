/*
 * This code is based on y-websocketserver
 * https://github.com/yjs/y-websocket-server/
 * Copyright (c) 2025 Kevin Jahns <kevin.jahns@protonmail.com>.
 * The MIT License (MIT) https://github.com/yjs/y-websocket-server/blob/main/LICENSE
 */
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as awareness from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import { MESSAGE_AWARENESS, MESSAGE_SYNC } from "./const.js";
import type { CustomWebSocket, RoomKey, YDocWithAwareness } from "./types.js";
import { broadcastToRoom, addAwarenessClient } from "./wsRooms.js";

// Document Event Handlers
// handler list https://docs.yjs.dev/api/y.doc#event-handler
// when document update.
const handleDocUpdate = (update: Uint8Array, roomName: RoomKey) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);

  broadcastToRoom(roomName, message);
};

const handleAwarenessUpdate = (
  roomName: RoomKey,
  doc: YDocWithAwareness,
  clients: Array<number>,
  origin: CustomWebSocket,
) => {
  const encodedUpdate = awareness.encodeAwarenessUpdate(doc.awareness, clients);
  const encoder = encoding.createEncoder();
  // convert and write the message
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(encoder, encodedUpdate);

  const message = encoding.toUint8Array(encoder);
  broadcastToRoom(roomName, message, origin);
};

export const attachDocListeners = (
  roomName: RoomKey,
  doc: YDocWithAwareness,
) => {
  doc.on("update", (update: Uint8Array) => handleDocUpdate(update, roomName));
  doc.awareness.on(
    "update",
    (
      {
        added,
        updated,
        removed,
      }: { added: number[]; updated: number[]; removed: number[] },
      origin: CustomWebSocket,
    ) => {
      const changedClients = added.concat(updated, removed);
      addAwarenessClient(origin, changedClients);
      handleAwarenessUpdate(roomName, doc, changedClients, origin);
    },
  );
};

// Websocket Event Handlers
// Handle new message
export const handleMessage = (
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
    case MESSAGE_AWARENESS: {
      const awarenessUpdate = decoding.readVarUint8Array(decoder);
      awareness.applyAwarenessUpdate(doc.awareness, awarenessUpdate, conn);
      break;
    }
  }
};

// Initial Sync when user joins
export const initSyncForClient = (
  conn: CustomWebSocket,
  doc: YDocWithAwareness,
) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  conn.send(encoding.toUint8Array(encoder));

  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessUpdate = awareness.encodeAwarenessUpdate(
      doc.awareness,
      Array.from(awarenessStates.keys()),
    );
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(awarenessEncoder, awarenessUpdate);
    conn.send(encoding.toUint8Array(awarenessEncoder));
  }
};
