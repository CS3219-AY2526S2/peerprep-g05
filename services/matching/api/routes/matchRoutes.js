import express from "express";
import { validateMatchFinding } from "../middlewares/validateMatchFinding.js";
import {
    enterMatchmaking,
    acceptMatch,
    declineMatch,
    getMatchStatus,
    leaveMatch
} from "../controllers/matchController.js";
const router = express.Router();

router.post("/", validateMatchFinding, enterMatchmaking);
router.post("/:match_id/accept", acceptMatch);
router.post("/:match_id/decline", declineMatch);
router.get("/:match_id", getMatchStatus);
router.delete("/", leaveMatch);

export default router;