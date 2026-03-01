import userService from "../../domain/services/userService.js";

/**
 * GET /admin/users
 */
export async function listUsers(req, res, next) {
    try {
        const users = await userService.listAllUsers();
        return res.status(200).json(users.map((u) => u.toJSON()));
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /admin/users/:id/role
 */
export async function updateUserRole(req, res, next) {
    try {
        const { role } = req.body;
        const user = await userService.updateUserRole(req.params.id, role);
        return res.status(200).json(user.toJSON());
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /admin/users/:id/status
 */
export async function updateUserStatus(req, res, next) {
    try {
        const { isActive } = req.body;
        const user = await userService.updateUserStatus(req.params.id, isActive);
        return res.status(200).json(user.toJSON());
    } catch (err) {
        next(err);
    }
}
