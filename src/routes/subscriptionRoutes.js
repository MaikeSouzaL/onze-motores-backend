import express from 'express';
import {
  getSubscription,
  startTrial,
  updateSubscriptionStatus,
  markWelcomeShown,
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.get('/:uid', getSubscription);
router.post('/trial', startTrial);
router.post('/status', updateSubscriptionStatus); // Proteja esta rota com middleware de admin no futuro
router.post('/welcome-shown', markWelcomeShown);

export default router;
