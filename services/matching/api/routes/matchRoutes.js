import express from "express";
import {
    enterMatchmaking,
    acceptMatch,
    declineMatch,
    getMatchStatus
} from "../controllers/matchController.js";

const router = express.Router();

router.post("/", enterMatchmaking);
router.post("/:match_id/accept", acceptMatch);
router.post("/:match_id/decline", declineMatch);
router.get("/:match_id", getMatchStatus);

export default router;