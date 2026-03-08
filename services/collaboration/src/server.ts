import express from "express";
import mongoose from "mongoose";
import { config } from "./config.js";

// connect to mongodb
mongoose.connect(config.MONGO_URI);

const app = express();

const router = express.Router();

router.get("/", (req, res) => res.send("Hi"));

app.use("/api/v1", router);

app.listen(config.EXPRESS_PORT, (e) => {
  if (e) {
    console.error(e);
  }
  console.log("Server is running...");
});
