import cors from "cors";
import express from "express";
import { router } from "./routes/router.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use("/api/v1", router);

export default app;
