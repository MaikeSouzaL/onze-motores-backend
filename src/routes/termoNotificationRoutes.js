import express from "express";
import {
  getTermosNotifications,
  dismissNotification,
  dismissAllNotifications,
} from "../controllers/termoNotificationController.js";

const router = express.Router();

// GET /api/termos/notifications?uid=...
router.get("/", getTermosNotifications);

// POST /api/termos/notifications/dismiss
router.post("/dismiss", dismissNotification);

// POST /api/termos/notifications/dismiss-all
router.post("/dismiss-all", dismissAllNotifications);

export default router;
