import User from '../models/User.js';
import Favorite from '../models/Favorite.js';

/**
 * @desc    Obter detalhes do usuário pelo UID
 * @route   GET /api/users/:uid
 */
export const getUser = async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID obrigatório' });
    }

    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Adicionar motor aos favoritos
 * @route   POST /api/users/:uid/favorites
 */
export const addFavorite = async (req, res) => {
  try {
    const { uid } = req.params;
    const { motorId } = req.body;

    if (!motorId) {
      return res.status(400).json({ success: false, message: 'ID do motor obrigatório' });
    }

    // Validar se o motorId é um ObjectId válido
    if (!motorId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'ID do motor inválido' });
    }

    // Tentar criar favorito (o índice unique impede duplicatas)
    try {
        await Favorite.create({ uid, motorId });
        console.log(`✅ Favorito adicionado: Usuário ${uid} -> Motor ${motorId}`);
    } catch (err) {
        // Se for erro de duplicidade (E11000), ignorar e retornar sucesso
        if (err.code !== 11000) {
            console.error(`❌ Erro ao adicionar favorito:`, err);
            throw err;
        }
        console.log(`ℹ️ Favorito já existe: Usuário ${uid} -> Motor ${motorId}`);
    }

    // Retornar lista atualizada
    const allFavorites = await Favorite.find({ uid }).select('motorId');
    const favoritesList = allFavorites.map(f => f.motorId.toString());

    res.status(200).json({ success: true, favorites: favoritesList });
  } catch (error) {
    console.error(`❌ Erro no addFavorite:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Remover motor dos favoritos
 * @route   DELETE /api/users/:uid/favorites/:motorId
 */
export const removeFavorite = async (req, res) => {
  try {
    const { uid, motorId } = req.params;

    // Validar se o motorId é um ObjectId válido
    if (!motorId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'ID do motor inválido' });
    }

    const result = await Favorite.deleteOne({ uid, motorId });
    
    if (result.deletedCount > 0) {
      console.log(`✅ Favorito removido: Usuário ${uid} -> Motor ${motorId}`);
    } else {
      console.log(`ℹ️ Favorito não encontrado: Usuário ${uid} -> Motor ${motorId}`);
    }

    // Retornar lista atualizada
    const allFavorites = await Favorite.find({ uid }).select('motorId');
    const favoritesList = allFavorites.map(f => f.motorId.toString());

    res.status(200).json({ success: true, favorites: favoritesList });
  } catch (error) {
    console.error(`❌ Erro no removeFavorite:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Listar favoritos do usuário
 * @route   GET /api/users/:uid/favorites
 */
export const getFavorites = async (req, res) => {
    try {
        const { uid } = req.params;
        
        const allFavorites = await Favorite.find({ uid }).select('motorId');
        const favoritesList = allFavorites.map(f => f.motorId.toString());
        
        console.log(`📋 Listando favoritos: Usuário ${uid} tem ${favoritesList.length} favorito(s)`);
        
        res.status(200).json({ success: true, favorites: favoritesList });
    } catch (error) {
        console.error(`❌ Erro no getFavorites:`, error);
        res.status(500).json({ success: false, message: error.message });
    }
};
