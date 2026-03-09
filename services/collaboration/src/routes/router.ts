import express from "express";
import { collaborationRouter } from "./collaboration_routes.js";

export const router = express.Router();
router.use("/collaboration", collaborationRouter);
