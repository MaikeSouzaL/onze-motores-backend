import AppConfig from '../models/AppConfig.js';

/**
 * @desc    Obter configurações do aplicativo
 * @route   GET /api/config
 * @access  Public
 */
export const getAppConfig = async (req, res) => {
  try {
    // Busca o documento único de configuração (padrão 'settings')
    let config = await AppConfig.findOne({ key: 'settings' });

    if (!config) {
      // Se não existir, cria com valores padrão
      config = await AppConfig.create({
        key: 'settings',
        pricing: {
          monthly: 29.90,
          annual: 288.00,
          annualDiscountPercent: 20,
          useDynamicPricing: true
        }
      });
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Atualizar configurações (Admin)
 * @route   POST /api/config
 * @access  Private (Admin)
 */
export const updateAppConfig = async (req, res) => {
  try {
    const updateData = req.body;
    
    // Remove campos protegidos se necessário
    delete updateData.key; 

    const config = await AppConfig.findOneAndUpdate(
      { key: 'settings' },
      updateData,
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: config,
      message: 'Configurações atualizadas com sucesso'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
