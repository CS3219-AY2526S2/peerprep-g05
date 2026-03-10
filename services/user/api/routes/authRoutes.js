import { Router } from "express";
import { register, verifyOtp, resendOtp, login, introspect, jwks } from "../controllers/authController.js";
import { registerRules, loginRules, introspectRules, verifyOtpRules, resendOtpRules } from "../middleware/validate.js";

const router = Router();

// Public endpoints
router.post("/register", registerRules, register);
router.post("/verify-otp", verifyOtpRules, verifyOtp);
router.post("/resend-otp", resendOtpRules, resendOtp);
router.post("/login", loginRules, login);
router.post("/introspect", introspectRules, introspect);
router.get("/jwks", jwks);

export default router;
