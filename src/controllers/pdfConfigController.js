import PdfConfig from '../models/PdfConfig.js';

/**
 * @desc    Obter configurações de PDF do usuário
 * @route   GET /api/pdf-config/:uid
 */
export const getPdfConfig = async (req, res) => {
  try {
    const { uid } = req.params;

    let config = await PdfConfig.findOne({ uid });

    if (!config) {
      // Retorna default sem criar no banco para não poluir
      return res.status(200).json({
        success: true,
        data: {
          uid,
          mostrarLogoNoHeader: true,
          mostrarLogoNoFooter: false,
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
 * @desc    Salvar configurações de PDF
 * @route   POST /api/pdf-config
 */
export const savePdfConfig = async (req, res) => {
  try {
    const { uid, mostrarLogoNoHeader, mostrarLogoNoFooter } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID é obrigatório' });
    }

    const config = await PdfConfig.findOneAndUpdate(
      { uid },
      {
        uid,
        mostrarLogoNoHeader,
        mostrarLogoNoFooter
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
