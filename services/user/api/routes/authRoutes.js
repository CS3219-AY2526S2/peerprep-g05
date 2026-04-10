import { Router } from "express";
import { register, verifyOtp, resendOtp, login, logout, introspect, jwks, forgotPassword, resetPassword } from "../controllers/authController.js";
import { registerRules, loginRules, introspectRules, verifyOtpRules, resendOtpRules, forgotPasswordRules, resetPasswordRules } from "../middleware/validate.js";

const router = Router();

// Public endpoints
router.post("/register", registerRules, register);
router.post("/verify-otp", verifyOtpRules, verifyOtp);
router.post("/resend-otp", resendOtpRules, resendOtp);
router.post("/login", loginRules, login);
router.post("/logout", logout);
router.post("/introspect", introspectRules, introspect);
router.get("/jwks", jwks);
router.post("/forgot-password", forgotPasswordRules, forgotPassword);
router.post("/reset-password", resetPasswordRules, resetPassword);

export default router;
