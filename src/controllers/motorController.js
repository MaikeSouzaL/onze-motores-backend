import Motor from "../models/Motor.js";
import User from "../models/User.js";
import { getUserPermissions } from "../utils/permissionUtils.js";
import {
  notifyAdminsNewMotor,
  notifyFavoriteUpdate,
} from "./notificationController.js";
import { uploadPdfToDrive, deleteFileFromDrive } from "../services/googleDrive.service.js";

/**
 * @desc    Contar motores do usuário
 * @route   GET /api/motors/count
 */
export const countMotors = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID obrigatório" });
    }

    // Verificar permissões
    const { isAdmin, config } = await getUserPermissions(uid);

    // Se não for admin e tiver bloqueio de visualização
    if (!isAdmin && config && config.canViewMotors === false) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Seu plano não permite visualizar a contagem de motores.",
        });
    }

    let count;
    if (isAdmin) {
      // Admin vê total geral
      count = await Motor.countDocuments({});
    } else {
      // Usuário comum vê seus próprios
      count = await Motor.countDocuments({ uid });
    }

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Listar motores do usuário
 * @route   GET /api/motors
 */
export const getMotors = async (req, res) => {
  try {
    const { uid } = req.query; // Temporariamente pegando UID da query até implementar middleware JWT

    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID obrigatório" });
    }

    // Verificar permissões
    const { isAdmin, config } = await getUserPermissions(uid);

    // Se não for admin e tiver bloqueio de visualização
    if (!isAdmin && config && config.canViewMotors === false) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Seu plano não permite visualizar a lista de motores.",
        });
    }

    // Filtros avançados
    const {
      marca,
      modelo,
      pacote,
      diametro,
      canal, // Ranhuras
      voltagem,
    } = req.query;

    const query = {};

    // Aplicar filtros se existirem
    if (marca) query.marca = { $regex: marca, $options: "i" };
    if (modelo) query.modelo = { $regex: modelo, $options: "i" };
    if (pacote) query.pacote = pacote;
    if (diametro) query.diametro = diametro;
    if (canal) query.canal = canal; // Ranhuras
    if (voltagem) query.voltagem = { $regex: voltagem, $options: "i" };

    // Excluir campos pesados da listagem para evitar erro de rede (payload muito grande)
    // Mantemos fotosMotorUrls pois cada motor tem poucas fotos e são apenas URLs curtas
    const fieldsToSelect = "-esquemaLigacao -servicoImagem";

    let motors;
    if (isAdmin) {
      // Admin vê TODOS os motores (sem campos pesados)
      motors = await Motor.find(query)
        .select(fieldsToSelect)
        .sort({ updatedAt: -1 });
    } else {
      // Verificar configuração de privacidade
      const canSeeAll = config && config.canOnlySeeOwnMotors === false;

      if (canSeeAll) {
        // Se o admin permitiu ver todos os motores (ex: modo catálogo público)
        motors = await Motor.find(query)
          .select(fieldsToSelect)
          .sort({ updatedAt: -1 });
      } else {
        // Padrão: Apenas seus próprios motores + filtros
        query.uid = uid; // Forçar UID do usuário
        motors = await Motor.find(query)
          .select(fieldsToSelect)
          .sort({ updatedAt: -1 });
      }
    }

    res.status(200).json({
      success: true,
      count: motors.length,
      data: motors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Criar novo motor
 * @route   POST /api/motors
 */
export const createMotor = async (req, res) => {
  try {
    const motorData = req.body;

    // Validação básica
    if (!motorData.uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID é obrigatório" });
    }

    // Verificar permissões e limites
    const { isAdmin, plan, config } = await getUserPermissions(motorData.uid);

    if (!isAdmin) {
      // 1. Verificar se pode registrar motores
      if (config && config.canRegisterMotors === false) {
        return res.status(403).json({
          success: false,
          message: "Seu plano atual não permite cadastrar novos motores.",
        });
      }

      // 2. Verificar limite de quantidade (apenas se não for unlimited)
      if (config && config.maxMotors !== "unlimited") {
        const currentCount = await Motor.countDocuments({ uid: motorData.uid });
        const limit = Number(config.maxMotors);

        if (currentCount >= limit) {
          return res.status(403).json({
            success: false,
            message: `Limite de motores atingido (${limit}). Faça upgrade para cadastrar mais.`,
          });
        }
      }
    }

    const motor = await Motor.create(motorData);

    // Notificar admins sobre novo motor cadastrado (em background)
    notifyAdminsNewMotor(motor, motorData.uid).catch((err) =>
      console.error("Erro ao notificar admins:", err)
    );

    res.status(201).json({
      success: true,
      data: motor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Atualizar motor
 * @route   PUT /api/motors/:id
 */
export const updateMotor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const requestUid = req.query.uid || req.body.requestUid || req.body.uid; // Quem está pedindo

    if (!requestUid) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Usuário não identificado (UID obrigatório)",
        });
    }

    // Buscar motor original para checar dono
    const existingMotor = await Motor.findById(id);
    if (!existingMotor) {
      return res
        .status(404)
        .json({ success: false, message: "Motor não encontrado" });
    }

    // Verificar permissão
    const user = await User.findOne({ uid: requestUid });
    const isAdmin = user && user.role === "admin";
    const isOwner = existingMotor.uid === requestUid;

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Permissão negada. Você não é o dono deste motor.",
        });
    }

    // Atualizar
    const motor = await Motor.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // Notificar usuários que favoritaram este motor (em background)
    notifyFavoriteUpdate(motor, requestUid).catch((err) =>
      console.error("Erro ao notificar favoritos:", err)
    );

    res.status(200).json({
      success: true,
      data: motor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Excluir motor
 * @route   DELETE /api/motors/:id
 */
/**
 * @desc    Excluir motor
 * @route   DELETE /api/motors/:id
 */
export const deleteMotor = async (req, res) => {
  try {
    const { id } = req.params;
    const requestUid = req.query.uid || req.body.uid; // Quem está pedindo

    if (!requestUid) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Usuário não identificado (UID obrigatório)",
        });
    }

    // Buscar motor original para checar dono
    const existingMotor = await Motor.findById(id);
    if (!existingMotor) {
      return res
        .status(404)
        .json({ success: false, message: "Motor não encontrado" });
    }

    // Verificar permissão
    const user = await User.findOne({ uid: requestUid });
    const isAdmin = user && user.role === "admin";
    const isOwner = existingMotor.uid === requestUid;

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Permissão negada. Você não é o dono deste motor.",
        });
    }

    await Motor.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Motor excluído com sucesso",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Obter detalhes de um motor específico
 * @route   GET /api/motors/:id
 */
export const getMotorById = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;

    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID obrigatório" });
    }

    // Buscar motor COMPLETO (sem restrições de campos)
    const motor = await Motor.findById(id);

    if (!motor) {
      return res
        .status(404)
        .json({ success: false, message: "Motor não encontrado" });
    }

    // Verificar permissões
    const { isAdmin, config } = await getUserPermissions(uid);

    // Se for o dono, sempre pode ver
    const isOwner = motor.uid === uid;

    // Se não for dono, verificar regras
    if (!isOwner) {
      if (isAdmin) {
        // Admin pode ver tudo
      } else {
        // Verificar se usuário tem permissão de ver outros motores
        const canSeeAll = config && config.canOnlySeeOwnMotors === false;

        if (!canSeeAll) {
          return res
            .status(403)
            .json({
              success: false,
              message:
                "Permissão negada. Você não tem permissão para visualizar este motor.",
            });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: motor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Duplicar motor (criar cópia)
 * @route   POST /api/motors/:id/duplicate
 */
export const duplicateMotor = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, modifications } = req.body;

    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID obrigatório" });
    }

    // Buscar motor original
    const originalMotor = await Motor.findById(id);

    if (!originalMotor) {
      return res
        .status(404)
        .json({ success: false, message: "Motor não encontrado" });
    }

    // Verificar permissões
    const { isAdmin, config } = await getUserPermissions(uid);

    // Verificar se pode visualizar o motor original
    const isOwner = originalMotor.uid === uid;
    if (!isOwner && !isAdmin) {
      const canSeeAll = config && config.canOnlySeeOwnMotors === false;
      if (!canSeeAll) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Permissão negada para duplicar este motor.",
          });
      }
    }

    // Verificar permissão de cadastro
    if (!isAdmin && config && config.canRegisterMotors === false) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Seu plano não permite cadastrar novos motores.",
        });
    }

    // Criar cópia do motor (remover _id, criadoEm, atualizadoEm)
    const motorData = originalMotor.toObject();
    delete motorData._id;
    delete motorData.criadoEm;
    delete motorData.atualizadoEm;
    delete motorData.__v;

    // ⚠️ IMPORTANTE: Remover URLs de fotos para evitar deletar fotos do motor original
    // quando o motor duplicado for excluído.
    //
    // NOTA: O esquemaLigacao (desenho) É COPIADO e isso é intencional!
    // Cada motor tem seu próprio desenho independente. Quando o motor duplicado
    // for excluído, apenas o desenho dele será deletado, não afetando o original.
    delete motorData.fotoPlacaUrl;
    delete motorData.fotosMotorUrls;

    // Aplicar modificações se fornecidas
    const newMotorData = {
      ...motorData,
      uid, // Sempre usar o UID do usuário que está duplicando
      ...modifications, // Permite sobrescrever campos específicos
      modelo: modifications?.modelo || `${motorData.modelo} (Cópia)`, // Adicionar "(Cópia)" se não especificado
      fotoPlacaUrl: "", // Motor duplicado sem fotos (usuário pode adicionar novas)
      fotosMotorUrls: [], // Motor duplicado sem fotos (usuário pode adicionar novas)
      // esquemaLigacao: mantido da cópia - cada motor tem seu desenho independente
    };

    // Criar novo motor
    const duplicatedMotor = await Motor.create(newMotorData);

    console.log(
      `✅ Motor duplicado: ${originalMotor._id} -> ${duplicatedMotor._id} por ${uid}`
    );
    console.log(`   📊 Dados: COPIADOS (reutilização)`);
    console.log(`   🎨 Desenhos: COPIADOS (independentes)`);
    console.log(`   📸 Fotos: NÃO copiadas (usuário pode adicionar novas)`);

    res.status(201).json({
      success: true,
      data: duplicatedMotor,
      message: "Motor duplicado com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao duplicar motor:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Sugerir motores similares baseado em características
 * @route   POST /api/motors/suggest-similar
 */
export const suggestSimilarMotors = async (req, res) => {
  try {
    const { uid, motorData, limit = 5 } = req.body;

    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID obrigatório" });
    }

    // Verificar permissões
    const { isAdmin, config } = await getUserPermissions(uid);

    if (!isAdmin && config && config.canViewMotors === false) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Permissão negada para visualizar motores.",
        });
    }

    // Construir query de similaridade
    const query = {};

    // Critérios de similaridade (em ordem de importância)
    if (motorData.marca) {
      query.marca = new RegExp(motorData.marca, "i");
    }

    if (motorData.potenciaCV) {
      // Buscar motores com potência similar (±20%)
      const potenciaMin = motorData.potenciaCV * 0.8;
      const potenciaMax = motorData.potenciaCV * 1.2;
      query.potenciaCV = { $gte: potenciaMin, $lte: potenciaMax };
    }

    if (motorData.voltagem) {
      query.voltagem = motorData.voltagem;
    }

    if (motorData.tipo) {
      query.tipo = new RegExp(motorData.tipo, "i");
    }

    // Se não houver critérios, retornar vazio
    if (Object.keys(query).length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "Nenhum critério de similaridade fornecido",
      });
    }

    // Buscar motores similares
    let similarMotors = await Motor.find(query)
      .limit(parseInt(limit))
      .sort({ criadoEm: -1 });

    // Calcular score de similaridade
    similarMotors = similarMotors.map((motor) => {
      let score = 0;

      if (
        motorData.marca &&
        motor.marca &&
        motor.marca.toLowerCase() === motorData.marca.toLowerCase()
      ) {
        score += 30;
      }

      if (motorData.potenciaCV && motor.potenciaCV) {
        const diff =
          Math.abs(motor.potenciaCV - motorData.potenciaCV) /
          motorData.potenciaCV;
        score += Math.max(0, 25 * (1 - diff)); // Quanto mais próximo, maior o score
      }

      if (motorData.voltagem && motor.voltagem === motorData.voltagem) {
        score += 20;
      }

      if (
        motorData.tipo &&
        motor.tipo &&
        motor.tipo.toLowerCase() === motorData.tipo.toLowerCase()
      ) {
        score += 15;
      }

      if (motorData.rpm && motor.rpm === motorData.rpm) {
        score += 10;
      }

      return {
        ...motor.toObject(),
        similarityScore: Math.round(score),
      };
    });

    // Ordenar por score de similaridade
    similarMotors.sort((a, b) => b.similarityScore - a.similarityScore);

    console.log(
      `🔍 ${similarMotors.length} motores similares encontrados para ${uid}`
    );

    res.status(200).json({
      success: true,
      data: similarMotors,
      count: similarMotors.length,
    });
  } catch (error) {
    console.error("❌ Erro ao sugerir motores similares:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Buscar motores similares a um motor específico
 * @route   GET /api/motors/:id/similar
 */
export const getSimilarMotors = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, limit = 5 } = req.query;

    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID obrigatório" });
    }

    // Buscar motor de referência
    const referenceMotor = await Motor.findById(id);

    if (!referenceMotor) {
      return res
        .status(404)
        .json({ success: false, message: "Motor não encontrado" });
    }

    // Verificar permissões
    const { isAdmin, config } = await getUserPermissions(uid);

    if (!isAdmin && config && config.canViewMotors === false) {
      return res
        .status(403)
        .json({ success: false, message: "Permissão negada." });
    }

    // Construir query de similaridade
    const query = {
      _id: { $ne: id }, // Excluir o próprio motor
    };

    if (referenceMotor.marca) {
      query.marca = referenceMotor.marca;
    }

    if (referenceMotor.potenciaCV) {
      const potenciaMin = referenceMotor.potenciaCV * 0.8;
      const potenciaMax = referenceMotor.potenciaCV * 1.2;
      query.potenciaCV = { $gte: potenciaMin, $lte: potenciaMax };
    }

    // Buscar motores similares
    const similarMotors = await Motor.find(query)
      .limit(parseInt(limit))
      .sort({ criadoEm: -1 });

    console.log(`🔍 ${similarMotors.length} motores similares ao motor ${id}`);

    res.status(200).json({
      success: true,
      data: similarMotors,
      reference: {
        id: referenceMotor._id,
        marca: referenceMotor.marca,
        modelo: referenceMotor.modelo,
        potenciaCV: referenceMotor.potenciaCV,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar motores similares:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Upload de PDF do motor para Google Drive
 * @route   POST /api/motors/:id/upload-pdf
 */
export const uploadMotorPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.body?.uid || req.query?.uid;
    const { pdfBase64, fileName } = req.body;

    if (!uid || !pdfBase64 || !fileName) {
      return res.status(400).json({
        success: false,
        message: "UID, pdfBase64 e fileName são obrigatórios",
      });
    }

    // Buscar motor
    const motor = await Motor.findById(id);

    if (!motor) {
      return res.status(404).json({
        success: false,
        message: "Motor não encontrado",
      });
    }

    // Verificar se o usuário é dono do motor ou admin
    const { isAdmin } = await getUserPermissions(uid);
    
    if (!isAdmin && motor.uid !== uid) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para modificar este motor",
      });
    }

    // Se já existir um PDF, deletar o antigo primeiro
    if (motor.pdfMotorId) {
      try {
        await deleteFileFromDrive(motor.pdfMotorId);
        console.log(`🗑️ PDF antigo deletado: ${motor.pdfMotorId}`);
      } catch (error) {
        console.warn("⚠️ Erro ao deletar PDF antigo (pode já estar deletado):", error.message);
      }
    }

    // Upload do novo PDF
    console.log(`📤 Fazendo upload do PDF: ${fileName}`);
    const { url, fileId } = await uploadPdfToDrive(pdfBase64, fileName);

    // Atualizar motor com URL e ID do PDF
    motor.pdfMotorUrl = url;
    motor.pdfMotorId = fileId;
    motor.pdfMotorName = fileName;
    await motor.save();

    console.log(`✅ PDF do motor ${id} salvo no Google Drive`);

    res.status(200).json({
      success: true,
      message: "PDF enviado com sucesso",
      data: {
        pdfMotorUrl: url,
        pdfMotorId: fileId,
        pdfMotorName: fileName,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao fazer upload do PDF:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao fazer upload do PDF: " + error.message,
    });
  }
};

/**
 * @desc    Deletar PDF do motor
 * @route   DELETE /api/motors/:id/pdf
 */
export const deleteMotorPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "UID é obrigatório",
      });
    }

    // Buscar motor
    const motor = await Motor.findById(id);

    if (!motor) {
      return res.status(404).json({
        success: false,
        message: "Motor não encontrado",
      });
    }

    // Verificar se o usuário é dono do motor ou admin
    const { isAdmin } = await getUserPermissions(uid);
    
    if (!isAdmin && motor.uid !== uid) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para modificar este motor",
      });
    }

    // Verificar se o motor tem PDF
    if (!motor.pdfMotorId) {
      return res.status(404).json({
        success: false,
        message: "Este motor não possui PDF anexado",
      });
    }

    // Deletar do Google Drive
    try {
      await deleteFileFromDrive(motor.pdfMotorId);
      console.log(`🗑️ PDF deletado do Google Drive: ${motor.pdfMotorId}`);
    } catch (error) {
      console.warn("⚠️ Erro ao deletar do Google Drive:", error.message);
      // Continua mesmo se falhar (pode já estar deletado)
    }

    // Remover do motor
    motor.pdfMotorUrl = undefined;
    motor.pdfMotorId = undefined;
    motor.pdfMotorName = undefined;
    await motor.save();

    console.log(`✅ PDF removido do motor ${id}`);

    res.status(200).json({
      success: true,
      message: "PDF deletado com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao deletar PDF:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao deletar PDF: " + error.message,
    });
  }
};
