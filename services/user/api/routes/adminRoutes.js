import { Router } from "express";
import { authenticateStrict } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import { listUsers, updateUserRole, updateUserStatus } from "../controllers/adminController.js";
import { updateRoleRules, updateStatusRules } from "../middleware/validate.js";

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticateStrict);
router.use(requireRole("ADMIN"));

router.get("/users", listUsers);
router.patch("/users/:id/role", updateRoleRules, updateUserRole);
router.patch("/users/:id/status", updateStatusRules, updateUserStatus);

export default router;
