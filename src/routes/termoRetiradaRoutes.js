import express from "express";
import {
  createTermo,
  getTermoCounts,
  listTermos,
  updateTermoStatus,
  updateTermoData,
  deleteTermo,
} from "../controllers/termoRetiradaController.js";

const router = express.Router();

// GET /api/termos/counts?uid=...
router.get("/counts", getTermoCounts);

// GET /api/termos?uid=...&retirado=false
router.get("/", listTermos);

// POST /api/termos
router.post("/", createTermo);

// PATCH /api/termos/:id/status?uid=...
router.patch("/:id/status", updateTermoStatus);

// PATCH /api/termos/:id?uid=...
router.patch("/:id", updateTermoData);

// DELETE /api/termos/:id?uid=...
router.delete("/:id", deleteTermo);

export default router;
