import userService from "../../domain/services/userService.js";

/**
 * GET /users/me
 */
export async function getMe(req, res, next) {
    try {
        const user = await userService.getProfile(req.user.id);
        return res.status(200).json(user.toJSON());
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /users/me
 */
export async function updateMe(req, res, next) {
    try {
        const user = await userService.updateProfile(req.user.id, req.body);
        return res.status(200).json(user.toJSON());
    } catch (err) {
        next(err);
    }
}
