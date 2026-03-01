import { Router } from "express";
import { authenticateStrict } from "../middleware/authenticate.js";
import { getMe, updateMe } from "../controllers/userController.js";
import { updateProfileRules } from "../middleware/validate.js";

const router = Router();

// All routes require authentication (strict — checks user active status)
router.use(authenticateStrict);

router.get("/me", getMe);
router.patch("/me", updateProfileRules, updateMe);

export default router;
