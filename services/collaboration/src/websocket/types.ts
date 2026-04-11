import { WebSocket } from "ws";
import * as awareness from "y-protocols/awareness";
import * as Y from "yjs";

export type RoomKey = string;
export type YDocWithAwareness = Y.Doc & { awareness: awareness.Awareness };

export interface CustomWebSocket extends WebSocket {
  room?: RoomKey;
}
