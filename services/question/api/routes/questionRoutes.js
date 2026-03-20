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
} from "../controllers/questionController.js";
import {
    acquireLock,
    releaseLock,
    getLockStatus,
} from "../controllers/lockController.js";

const router = express.Router();

router.get("/categories", listCategories);
router.get("/companies", listCompanies);
router.get("/", getAllQuestions);
router.get("/random", getRandomQuestion);
router.get("/:id", getQuestionById);
router.post("/", createQuestion);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);

// Lock routes
router.get("/:id/lock", getLockStatus);
router.post("/:id/lock", acquireLock);
router.delete("/:id/lock", releaseLock);

export default router;
