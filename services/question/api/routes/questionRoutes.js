import express from "express";
import {
    getAllQuestions,
    getQuestionById,
    getRandomQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    listCategories,
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

const router = express.Router();

router.get("/categories", listCategories);
router.get("/companies", listCompanies);
router.get("/completions/users/:userId", getCompletedQuestionsByUser);
router.get("/", getAllQuestions);
router.get("/random", getRandomQuestion);
router.get("/:id", getQuestionById);
router.get("/:id/completions", getQuestionCompletionStats);
router.post("/:id/completions", markQuestionCompleted);
router.post("/:id/completions/bulk", markQuestionCompletedByUsers);
router.post("/", createQuestion);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);

// Lock routes
router.get("/:id/lock", getLockStatus);
router.post("/:id/lock", acquireLock);
router.delete("/:id/lock", releaseLock);

export default router;
