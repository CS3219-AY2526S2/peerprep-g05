import express from "express";
import { validateMatchFinding } from "../middlewares/validateMatchFinding.js";
import { validateUser } from "../middlewares/validateUser.js";
import {
    enterMatchmaking,
    acceptMatch,
    declineMatch,
    getMatchStatus,
    leaveMatch
} from "../controllers/matchController.js";
const router = express.Router();

router.post("/", validateUser, validateMatchFinding, enterMatchmaking);
router.post("/:match_id/accept", validateUser, acceptMatch);
router.post("/:match_id/decline", validateUser, declineMatch);
router.get("/:match_id", validateUser, getMatchStatus);
router.delete("/", validateUser, leaveMatch);

export default router;