import express from "express";
import { collaborationRouter } from "./collaboration.route.js";

export const router = express.Router();

router.get("/", (_, res) => res.send("Hi"));
router.use("/collaboration", collaborationRouter);
