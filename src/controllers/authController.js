import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * @desc    Login ou Registro com Google
 * @route   POST /api/auth/google
 * @access  Public
 */
export const loginWithGoogle = async (req, res) => {
  try {
    const { email, name, photo, uid, provider } = req.body;

    if (!email || !uid) {
      return res.status(400).json({
        success: false,
        message: 'Email e UID são obrigatórios',
      });
    }

    // Verificar se usuário já existe pelo email ou uid
    let user = await User.findOne({ $or: [{ email }, { uid }] });

    if (user) {
      // Atualizar dados se necessário (ex: foto mudou)
      user.name = name || user.name;
      user.photoUrl = photo || user.photoUrl;
      if (provider) user.provider = provider;
      
      // Se encontrou por email mas não tinha UID (caso raro de migração), atualiza UID
      if (!user.uid) user.uid = uid;
      
      await user.save();
    } else {
      // Criar novo usuário
      user = await User.create({
        uid,
        email,
        name,
        photoUrl: photo,
        provider: provider || 'google',
      });
    }

    // Gerar JWT
    const token = jwt.sign(
      { id: user._id, uid: user.uid, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    return res.status(user.isNew ? 201 : 200).json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      user,
      isNewUser: user.isNew || false,
    });
  } catch (error) {
    console.error('Erro no login Google:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
    });
  }
};

