import express from "express";
import {
  createFuncionario,
  listFuncionarios,
  updateFuncionario,
  deleteFuncionario,
} from "../controllers/funcionarioController.js";

const router = express.Router();

// POST /api/funcionarios
router.post("/", createFuncionario);

// GET /api/funcionarios?uid=...&ativo=true
router.get("/", listFuncionarios);

// PUT /api/funcionarios/:id?uid=...
router.put("/:id", updateFuncionario);

// DELETE /api/funcionarios/:id?uid=...
router.delete("/:id", deleteFuncionario);

export default router;
