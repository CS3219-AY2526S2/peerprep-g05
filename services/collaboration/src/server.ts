import http from "http";
import app from "./app.js";
import { config } from "./config.js";
import wss from "./websocketServer.js";

const server = http.createServer(app);

server.on("upgrade", (request, socket, head) => {
  if (!request.url || request.url.split("/").length < 2) {
    console.error("Upgrade request missing URL");
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(config.EXPRESS_PORT, () => {
  console.log(`Server is running on: http://localhost:${config.EXPRESS_PORT}/`);
});
