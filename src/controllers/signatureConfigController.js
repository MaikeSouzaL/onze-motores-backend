import SignatureConfig from '../models/SignatureConfig.js';

/**
 * @desc    Obter configurações de assinatura do usuário
 * @route   GET /api/signature-config/:uid
 */
export const getSignatureConfig = async (req, res) => {
  try {
    const { uid } = req.params;

    let config = await SignatureConfig.findOne({ uid });

    if (!config) {
      // Retorna default sem criar no banco para não poluir
      return res.status(200).json({
        success: true,
        data: {
          uid,
          assinaturaUrl: '',
          nomeAssinatura: '',
          cargoAssinatura: '',
          mostrarEmDocumentos: true,
        },
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
 * @desc    Salvar configurações de assinatura
 * @route   POST /api/signature-config
 */
export const saveSignatureConfig = async (req, res) => {
  try {
    const { uid, assinaturaUrl, nomeAssinatura, cargoAssinatura, mostrarEmDocumentos } = req.body;

    let config = await SignatureConfig.findOne({ uid });

    if (!config) {
      config = new SignatureConfig({ uid, assinaturaUrl, nomeAssinatura, cargoAssinatura, mostrarEmDocumentos });
    } else {
      config.assinaturaUrl = assinaturaUrl;
      config.nomeAssinatura = nomeAssinatura;
      config.cargoAssinatura = cargoAssinatura;
      config.mostrarEmDocumentos = mostrarEmDocumentos;
    }

    await config.save();

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
