import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, verifyOtp, resendOtp, login, logout, introspect, jwks, forgotPassword, resetPassword } from "../controllers/authController.js";
import { registerRules, loginRules, introspectRules, verifyOtpRules, resendOtpRules, forgotPasswordRules, resetPasswordRules } from "../middleware/validate.js";

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
});

// Public endpoints
router.post("/register", authLimiter, registerRules, register);
router.post("/verify-otp", authLimiter, verifyOtpRules, verifyOtp);
router.post("/resend-otp", authLimiter, resendOtpRules, resendOtp);
router.post("/login", authLimiter, loginRules, login);
router.post("/logout", logout);
router.post("/introspect", introspectRules, introspect);
router.get("/jwks", jwks);
router.post("/forgot-password", authLimiter, forgotPasswordRules, forgotPassword);
router.post("/reset-password", authLimiter, resetPasswordRules, resetPassword);

export default router;
