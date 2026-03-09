import express from "express";
import mongoose from "mongoose";
import { config } from "./config.js";
import { router } from "./routes/router.js";

// connect to mongodb
mongoose.connect(config.MONGO_URI);

// setup express server
const app = express();
app.use(express.json());
router.get("/", (_, res) => res.send("Hi"));
app.use("/api/v1", router);

// start the server
app.listen(config.EXPRESS_PORT, (e) => {
  if (e) {
    console.error(e);
  }
  console.log(`Server is running on: http://localhost:${config.EXPRESS_PORT}/`);
});
