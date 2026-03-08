import express from "express";
import mongoose from "mongoose";
import { config } from "./config.js";
import { EditorSessionModel } from "./models/EditorSession.js";

// connect to mongodb
mongoose.connect(config.MONGO_URI);

const app = express();

const router = express.Router();

router.get("/", (_, res) => res.send("Hi"));
router.get("/collaboration", (_, res) => {
  EditorSessionModel.find().then((sessions) => {
    res.json(sessions);
  });
});

app.use("/api/v1", router);

app.listen(config.EXPRESS_PORT, (e) => {
  if (e) {
    console.error(e);
  }
  console.log(`Server is running on: http://localhost:${config.EXPRESS_PORT}/`);
});
