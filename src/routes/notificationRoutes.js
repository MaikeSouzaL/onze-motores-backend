import express from 'express';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

// Listar notificações do usuário
router.get('/:uid', notificationController.getUserNotifications);

// Marcar notificação como lida
router.put('/:uid/:notificationId/read', notificationController.markAsRead);

// Marcar todas como lidas
router.put('/:uid/read-all', notificationController.markAllAsRead);

// Deletar notificação
router.delete('/:uid/:notificationId', notificationController.deleteNotification);

export default router;
