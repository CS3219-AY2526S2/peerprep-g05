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

const router = express.Router();

router.get("/categories", listCategories);
router.get("/companies", listCompanies);
router.get("/", getAllQuestions);
router.get("/random", getRandomQuestion);
router.get("/:id", getQuestionById);
router.post("/", createQuestion);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);

export default router;
