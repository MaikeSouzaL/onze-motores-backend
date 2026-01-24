import Empresa from '../models/Empresa.js';

/**
 * @desc    Obter dados da empresa do usuário
 * @route   GET /api/empresas/:uid
 */
export const getEmpresa = async (req, res) => {
  try {
    const { uid } = req.params;

    const empresa = await Empresa.findOne({ uid });

    if (!empresa) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
    }

    res.status(200).json({
      success: true,
      data: empresa,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Salvar ou Atualizar empresa
 * @route   POST /api/empresas
 */
export const saveEmpresa = async (req, res) => {
  try {
    const { uid, ...empresaData } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID é obrigatório' });
    }

    const empresa = await Empresa.findOneAndUpdate(
      { uid },
      { uid, ...empresaData },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: empresa,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
