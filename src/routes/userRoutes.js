import express from 'express';
import { getUser, addFavorite, removeFavorite, getFavorites } from '../controllers/userController.js';

const router = express.Router();

router.get('/:uid', getUser);
router.get('/:uid/favorites', getFavorites);
router.post('/:uid/favorites', addFavorite);
router.delete('/:uid/favorites/:motorId', removeFavorite);

export default router;
