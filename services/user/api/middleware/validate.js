import { body, param, validationResult } from "express-validator";

/**
 * Middleware that checks express-validator results and returns 400 on failure.
 */
export function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: "Validation failed",
            details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }
    next();
}

export const registerRules = [
    body("email")
        .isEmail().withMessage("Must be a valid email")
        .normalizeEmail(),
    body("username")
        .trim()
        .isLength({ min: 3, max: 50 }).withMessage("Username must be 3-50 characters")
        .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username may only contain letters, numbers, and underscores"),
    body("password")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("displayName")
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage("Display name must be at most 100 characters"),
    handleValidationErrors,
];

export const loginRules = [
    body("identifier")
        .trim()
        .notEmpty().withMessage("Email or username is required"),
    body("password")
        .notEmpty().withMessage("Password is required"),
    handleValidationErrors,
];

export const updateProfileRules = [
    body("displayName")
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage("Display name must be at most 100 characters"),
    body("email")
        .optional()
        .isEmail().withMessage("Must be a valid email")
        .normalizeEmail(),
    body("username")
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 }).withMessage("Username must be 3-50 characters")
        .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username may only contain letters, numbers, and underscores"),
    // Explicitly reject forbidden fields
    body("role").not().exists().withMessage("Cannot update role via this endpoint"),
    body("password").not().exists().withMessage("Cannot update password via this endpoint"),
    handleValidationErrors,
];

export const updateRoleRules = [
    param("id").isUUID().withMessage("Invalid user ID"),
    body("role")
        .isIn(["USER", "ADMIN"]).withMessage("Role must be USER or ADMIN"),
    handleValidationErrors,
];

export const updateStatusRules = [
    param("id").isUUID().withMessage("Invalid user ID"),
    body("isActive")
        .isBoolean().withMessage("isActive must be a boolean"),
    handleValidationErrors,
];

export const introspectRules = [
    body("token")
        .notEmpty().withMessage("Token is required"),
    handleValidationErrors,
];
