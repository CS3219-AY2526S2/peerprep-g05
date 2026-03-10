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

// List all distinct categories
router.get("/categories", listCategories);

// List all distinct companies
router.get("/companies", listCompanies);

// Get all questions (with optional filters, pagination, search)
router.get("/", getAllQuestions);

// Get a random question (with optional filters)
router.get("/random", getRandomQuestion);

// Get a specific question by ID
router.get("/:id", getQuestionById);

// Create a new question
router.post("/", createQuestion);

// Update a question
router.put("/:id", updateQuestion);

// Delete a question
router.delete("/:id", deleteQuestion);

export default router;
