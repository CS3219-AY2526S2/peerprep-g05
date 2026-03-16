import { findActiveMatch } from "../../domain/match/matchRepository.js";

export async function validateMatchFinding(req, res, next) {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: "user_id is requied" });
    }

    try {
        const activeMatch = await findActiveMatch(user_id);

        if (activeMatch) {
            return res.status(409).json({
                error: "User is already in an active match",
                match_id: activeMatch.match_id,
                status: activeMatch.status
            })
        }

        next();

    } catch (err) {
        console.error("validateMatchFinding error: ", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}