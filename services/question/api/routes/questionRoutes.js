import express from "express";
import {
    getAllQuestions,
    getQuestionById,
    getRandomQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    listTopics,
    listCompanies,
    markQuestionCompleted,
    markQuestionCompletedByUsers,
    getQuestionCompletionStats,
    getCompletedQuestionsByUser,
} from "../controllers/questionController.js";
import {
    acquireLock,
    releaseLock,
    getLockStatus,
} from "../controllers/lockController.js";
import { requirePrivilegedRequester } from "../middlewares/requirePrivilegedRequester.js";

const router = express.Router();

router.get("/topics", listTopics);
router.get("/companies", listCompanies);
router.get("/completions/users/:userId", getCompletedQuestionsByUser);
router.get("/", getAllQuestions);
router.get("/random", getRandomQuestion);
router.get("/:id", getQuestionById);
router.get("/:id/completions", getQuestionCompletionStats);
router.post("/:id/completions", markQuestionCompleted);
router.post("/:id/completions/bulk", markQuestionCompletedByUsers);
router.post("/", requirePrivilegedRequester, createQuestion);
router.put("/:id", requirePrivilegedRequester, updateQuestion);
router.delete("/:id", requirePrivilegedRequester, deleteQuestion);

// Lock routes
router.get("/:id/lock", getLockStatus);
router.post("/:id/lock", requirePrivilegedRequester, acquireLock);
router.delete("/:id/lock", requirePrivilegedRequester, releaseLock);

export default router;
