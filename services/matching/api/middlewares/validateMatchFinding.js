import { findActiveMatch } from "../../domain/match/matchRepository.js";
import { postgres } from "../../infrastructure/postgres/client.js";

export async function validateMatchFinding(req, res, next) {
    const user_id = req.user?.userId;

    if (!user_id) {
        return res.status(400).json({ error: "user_id is requied" });
    }

    try {
        const client = await postgres.connect();
        try {
            const activeMatch = await findActiveMatch(client, user_id);
            console.log(user_id);

            if (activeMatch) {
                return res.status(409).json({
                    error: "User is already in an active match",
                    match_id: activeMatch.match_id,
                    status: activeMatch.status
                });
            }
            if (activeMatch && activeMatch.status !== "WAITING") {
                return res.status(409).json({
                    error: "User is already in an active match",
                    match_id: activeMatch.match_id,
                    status: activeMatch.status
                });
            }

            next();
        } catch (err) {
            console.error("validateMatchFinding error: ", err);
            return res.status(500).json({ error: "Internal Server Error" });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("validateMatchFinding connection error: ", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}