import { Router } from "express";
import { register, login, introspect, jwks } from "../controllers/authController.js";
import { registerRules, loginRules, introspectRules } from "../middleware/validate.js";

const router = Router();

// Public endpoints
router.post("/register", registerRules, register);
router.post("/login", loginRules, login);
router.post("/introspect", introspectRules, introspect);
router.get("/jwks", jwks);

export default router;
