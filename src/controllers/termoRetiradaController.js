import TermoRetirada from "../models/TermoRetirada.js";
import { getUserPermissions } from "../utils/permissionUtils.js";
import {
  deleteDriveFile,
  uploadImageBase64AsPublicFile,
} from "../services/googleDriveService.js";

/**
 * @desc    Criar termo de retirada
 * @route   POST /api/termos
 */
export const createTermo = async (req, res) => {
  const startedAt = Date.now();
  try {
    const data = req.body;

    console.log("[TERMO] createTermo request", {
      uid: data?.uid,
      hasIdempotencyKey: Boolean(data?.idempotencyKey),
      fotosCount: Array.isArray(data?.fotos) ? data.fotos.length : 0,
      hasThumbDataUri: typeof data?.thumbDataUri === "string" && data.thumbDataUri.length > 0,
      thumbDataUriLen:
        typeof data?.thumbDataUri === "string" ? data.thumbDataUri.length : 0,
      criadoPor: data?.criadoPor?.funcionarioNome || "Não informado",
    });

    if (!data.uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID é obrigatório" });
    }

    // Checagem simples de permissão: precisa poder gerar PDF (mesma regra do app)
    const { isAdmin, config } = await getUserPermissions(data.uid);
    if (!isAdmin && config && config.canGeneratePDF === false) {
      console.warn("[TERMO] createTermo blocked by plan", { uid: data.uid });
      return res.status(403).json({
        success: false,
        message: "Seu plano não permite criar termos.",
      });
    }

    // Idempotência (evita duplicar ao compartilhar/salvar/gerar): se vier idempotencyKey, fazemos upsert
    const idempotencyKey = data.idempotencyKey;

    const payload = {
      uid: data.uid,
      idempotencyKey,
      nomeCliente: data.nomeCliente,
      telefoneCliente: data.telefoneCliente,
      nomeMotor: data.nomeMotor,
      servicoExecutado: data.servicoExecutado || "",
      defeitoEncontrado: data.defeitoEncontrado,
      dataEntrada: data.dataEntrada ? new Date(data.dataEntrada) : new Date(),
      dataRetirada: new Date(data.dataRetirada),
      fotos: Array.isArray(data.fotos) ? data.fotos.slice(0, 5) : [],
      assinatura: data.assinatura,
      observacoes: data.observacoes,
      retirado: false,
      criadoPor: data.criadoPor || undefined,
    };

    // ✅ SEMPRE cria um novo termo independente
    // Cada geração de PDF deve resultar em um novo registro
    // Mesmo que os dados sejam idênticos ou similares
    const termo = await TermoRetirada.create(payload);

    console.log("[TERMO] createTermo saved", {
      uid: data.uid,
      id: termo?._id,
      tookMs: Date.now() - startedAt,
    });

    const termoResponse = termo?.toObject ? termo.toObject() : termo;
    if (termoResponse && typeof termoResponse === "object") {
      // Evita devolver base64s (reduz chance de timeout e uso de memória no app)
      delete termoResponse.fotos;
      delete termoResponse.assinatura;
    }

    // Responde rápido: thumbnail é best-effort em background (evita timeout no app)
    res.status(201).json({ success: true, data: termoResponse });

    // Tentativa best-effort de gerar miniatura a partir da 1ª foto (se vier como data URI)
    // Não bloquear a resposta.
    setImmediate(async () => {
      try {
        if (!termo?.thumbUrl && !termo?.thumbDriveFileId) {
          // Preferir thumb enviada separadamente (bem menor) para evitar payload gigante no termo.
          const thumbCandidate =
            typeof data?.thumbDataUri === "string" && data.thumbDataUri
              ? data.thumbDataUri
              : undefined;

          const firstPhoto =
            thumbCandidate ||
            (Array.isArray(payload.fotos) ? payload.fotos[0] : undefined);
          
          if (
            typeof firstPhoto === "string" &&
            firstPhoto.startsWith("data:image")
          ) {
            console.log("[TERMO] Processando miniatura...", {
              id: termo._id,
              uid: data.uid,
              thumbSize: Math.round(firstPhoto.length / 1024) + "KB",
            });
            
            const match = firstPhoto.match(
              /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/,
            );
            if (match && match[2]) {
              const mimeType = match[1] || "image/jpeg";
              const base64Data = match[2];
              const safeClient = String(payload.nomeCliente || "cliente")
                .replace(/[^a-zA-Z0-9]/g, "_")
                .slice(0, 40);
              const timestamp = Date.now();
              const fileName = `thumb_termo_${safeClient}_${timestamp}.jpg`;

              const uploaded = await uploadImageBase64AsPublicFile({
                base64Data,
                fileName,
                mimeType,
              });

              await TermoRetirada.updateOne(
                { _id: termo._id },
                {
                  $set: {
                    thumbUrl: uploaded.url,
                    thumbDriveFileId: uploaded.fileId,
                  },
                },
              );

              console.log("[TERMO] ✅ Thumbnail uploaded successfully", {
                id: termo._id,
                uid: data.uid,
                url: uploaded.url,
              });
            }
          } else {
            console.log("[TERMO] ⚠️ Nenhuma miniatura disponível para processar", {
              id: termo._id,
              uid: data.uid,
            });
          }
        }
      } catch (e) {
        console.warn(
          "[TERMO] ❌ Falha ao gerar/upload thumbnail do termo:",
          e?.message || e,
        );
      }
    });

    return;
  } catch (error) {
    console.error("[TERMO] createTermo error", {
      message: error?.message,
      tookMs: Date.now() - startedAt,
    });
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Listar termos do usuário
 * @route   GET /api/termos
 */
export const listTermos = async (req, res) => {
  try {
    const { uid, retirado } = req.query;
    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID obrigatório" });
    }

    // SEMPRE filtra por uid - cada usuário vê apenas seus próprios termos
    // Mesmo admins veem apenas seus dados pessoais nesta rota
    const query = { uid };
    if (typeof retirado !== "undefined") {
      query.retirado = retirado === "true";
    }

    const termos = await TermoRetirada.find(query)
      .select("-fotos -assinatura")
      .sort({
      retirado: 1,
      dataRetirada: 1,
      createdAt: -1,
      });

    return res
      .status(200)
      .json({ success: true, count: termos.length, data: termos });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Marcar termo como retirado / não retirado e atualizar status do serviço
 * @route   PATCH /api/termos/:id/status
 */
export const updateTermoStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;
    const { retirado, statusServico, retiradoPor, motivoVoltaPendente } = req.body;

    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID obrigatório" });
    }

    const termo = await TermoRetirada.findById(id);
    if (!termo) {
      return res
        .status(404)
        .json({ success: false, message: "Termo não encontrado" });
    }

    // SEMPRE valida que o termo pertence ao usuário
    if (termo.uid !== uid) {
      console.warn('[TERMO] Tentativa de atualizar termo de outro usuário', {
        termoUid: termo.uid,
        requestUid: uid
      });
      return res.status(403).json({
        success: false,
        message: "Permissão negada.",
      });
    }

    const nextRetirado = Boolean(retirado);

    // Atualizar status de retirada
    termo.retirado = nextRetirado;
    termo.retiradoEm = termo.retirado ? new Date() : null;
    
    // Atualizar status do serviço se fornecido
    if (statusServico) {
      termo.statusServico = statusServico;
    }
    
    // Atualizar funcionário que retirou se fornecido
    if (retiradoPor) {
      termo.retiradoPor = retiradoPor;
    }
    
    // Atualizar motivo ao voltar para pendente se fornecido
    if (!nextRetirado && motivoVoltaPendente) {
      termo.motivoVoltaPendente = motivoVoltaPendente;
    }

    await termo.save();

    return res.status(200).json({ success: true, data: termo });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Atualizar campos básicos do termo (ex: data de retirada)
 * @route   PATCH /api/termos/:id?uid=...
 */
export const updateTermoData = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;
    const {
      dataRetirada,
      dataEntrada,
      nomeCliente,
      telefoneCliente,
      nomeMotor,
      servicoExecutado,
      defeitoEncontrado,
      observacoes,
      fotos,
    } = req.body || {};

    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID obrigatório" });
    }

    const termo = await TermoRetirada.findById(id);
    if (!termo) {
      return res
        .status(404)
        .json({ success: false, message: "Termo não encontrado" });
    }

    if (termo.uid !== uid) {
      console.warn("[TERMO] Tentativa de editar termo de outro usuário", {
        termoUid: termo.uid,
        requestUid: uid,
      });
      return res
        .status(403)
        .json({ success: false, message: "Permissão negada." });
    }

    const updates = {};

    const applyRequiredString = (field, value, label) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
          throw new Error(`${label} é obrigatório`);
        }
        updates[field] = trimmed;
      }
    };

    try {
      applyRequiredString("nomeCliente", nomeCliente, "Nome do cliente");
      applyRequiredString(
        "telefoneCliente",
        telefoneCliente,
        "Telefone do cliente",
      );
      applyRequiredString("nomeMotor", nomeMotor, "Nome do equipamento");
      applyRequiredString(
        "defeitoEncontrado",
        defeitoEncontrado,
        "Defeito encontrado",
      );
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    if (typeof servicoExecutado === "string") {
      updates.servicoExecutado = servicoExecutado;
    }

    if (typeof observacoes === "string") {
      updates.observacoes = observacoes;
    }

    // Adicionar fotos se fornecidas (apenas se o termo não tiver fotos ainda)
    console.log("[TERMO] Verificando fotos recebidas...", {
      fotosRecebidas: Array.isArray(fotos) ? fotos.length : 0,
      fotosExistentes: Array.isArray(termo.fotos) ? termo.fotos.length : 0,
      termoId: termo._id,
    });

    if (Array.isArray(fotos) && fotos.length > 0) {
      // Só permite adicionar fotos se o termo não tiver fotos ainda
      if (!termo.fotos || termo.fotos.length === 0) {
        updates.fotos = fotos.slice(0, 5); // Máx. 5 fotos
        console.log("[TERMO] ✅ Fotos serão adicionadas ao termo:", updates.fotos.length);
      } else {
        console.log("[TERMO] ⚠️ Termo já possui fotos, não adicionando novas");
      }
    }

    const parseDateField = (value, label) => {
      if (value) {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
          throw new Error(`${label} inválida`);
        }
        return parsed;
      }
      return undefined;
    };

    try {
      const nextRetirada = parseDateField(
        dataRetirada,
        "Data de retirada",
      );
      const nextEntrada = parseDateField(dataEntrada, "Data de entrada");
      if (nextRetirada) updates.dataRetirada = nextRetirada;
      if (nextEntrada) updates.dataEntrada = nextEntrada;
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nenhum dado válido para atualizar",
      });
    }

    Object.assign(termo, updates);
    await termo.save();

    console.log("[TERMO] Termo salvo com updates:", Object.keys(updates));

    // Se o termo tem fotos mas não tem thumbnail, gerar thumbnail em background
    const termoFotos = termo.fotos || [];
    const shouldGenerateThumb = termoFotos.length > 0 && !termo.thumbUrl && !termo.thumbDriveFileId;
    console.log("[TERMO] Verificando geração de thumbnail:", {
      termoTemFotos: termoFotos.length,
      hasThumbUrl: !!termo.thumbUrl,
      hasThumbDriveId: !!termo.thumbDriveFileId,
      willGenerate: shouldGenerateThumb,
    });

    if (shouldGenerateThumb) {
      setImmediate(async () => {
        try {
          const firstPhoto = termoFotos[0];
          
          console.log("[TERMO] Iniciando processamento de thumbnail...", {
            id: termo._id,
            uid: termo.uid,
            photoType: typeof firstPhoto,
            isBase64: typeof firstPhoto === "string" && firstPhoto.startsWith("data:image"),
          });
          
          if (typeof firstPhoto === "string" && firstPhoto.startsWith("data:image")) {
            console.log("[TERMO] ✅ Foto é base64 válida, tamanho:", Math.round(firstPhoto.length / 1024) + "KB");
            
            const match = firstPhoto.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
            if (match && match[2]) {
              const mimeType = match[1] || "image/jpeg";
              const base64Data = match[2];
              const safeClient = String(termo.nomeCliente || "cliente")
                .replace(/[^a-zA-Z0-9]/g, "_")
                .slice(0, 40);
              const timestamp = Date.now();
              const fileName = `thumb_termo_${safeClient}_${timestamp}.jpg`;

              console.log("[TERMO] Fazendo upload da thumbnail...", { fileName, mimeType });

              const uploaded = await uploadImageBase64AsPublicFile({
                base64Data,
                fileName,
                mimeType,
              });

              console.log("[TERMO] Upload concluído:", { url: uploaded.url, fileId: uploaded.fileId });

              await TermoRetirada.updateOne(
                { _id: termo._id },
                {
                  $set: {
                    thumbUrl: uploaded.url,
                    thumbDriveFileId: uploaded.fileId,
                  },
                },
              );

              console.log("[TERMO] ✅ Thumbnail gerada e salva com sucesso", {
                id: termo._id,
                url: uploaded.url,
              });
            } else {
              console.warn("[TERMO] ⚠️ Foto base64 não tem formato válido (regex não matchou)");
            }
          } else {
            console.warn("[TERMO] ⚠️ Primeira foto não é string base64 válida");
          }
        } catch (e) {
          console.warn("[TERMO] ⚠️ Erro ao gerar thumbnail na edição:", e?.message || e);
        }
      });
    }

    return res.status(200).json({ success: true, data: termo });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Contar termos pendentes e vencidos (para badge)
 * @route   GET /api/termos/counts?uid=...
 */
export const getTermoCounts = async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "UID obrigatório" });
    }

    // SEMPRE filtra por uid do usuário
    const baseQuery = { uid };
    const now = new Date();

    const pendentesQuery = { ...baseQuery, retirado: false };
    const vencidosQuery = {
      ...baseQuery,
      retirado: false,
      dataRetirada: { $lte: now },
    };

    // "Aviso" = vence em até 5 dias (inclui hoje? não) e ainda não está vencido
    const warningLimit = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const avisosQuery = {
      ...baseQuery,
      retirado: false,
      dataRetirada: { $gt: now, $lte: warningLimit },
    };

    const [pendentes, vencidos, avisos] = await Promise.all([
      TermoRetirada.countDocuments(pendentesQuery),
      TermoRetirada.countDocuments(vencidosQuery),
      TermoRetirada.countDocuments(avisosQuery),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        pendentes,
        vencidos,
        avisos,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Deletar termo e seus arquivos associados
 * @route   DELETE /api/termos/:id?uid=...
 */
export const deleteTermo = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ success: false, message: "UID obrigatório" });
    }

    const termo = await TermoRetirada.findById(id);
    if (!termo) {
      return res.status(404).json({ success: false, message: "Termo não encontrado" });
    }

    // SEMPRE valida que o termo pertence ao usuário
    if (termo.uid !== uid) {
      console.warn('[TERMO] Tentativa de deletar termo de outro usuário', {
        termoUid: termo.uid,
        requestUid: uid
      });
      return res.status(403).json({ success: false, message: "Permissão negada." });
    }

    // Só permite deletar se estiver marcado como retirado
    if (!termo.retirado) {
      return res.status(400).json({
        success: false,
        message: "Apenas termos já retirados podem ser excluídos. Marque como retirado primeiro.",
      });
    }

    console.log("[TERMO] Deletando termo e arquivos associados", {
      id: termo._id,
      uid: termo.uid,
      cliente: termo.nomeCliente,
      thumbDriveFileId: termo.thumbDriveFileId,
    });

    // 1. Deletar thumbnail do Google Drive (se existir)
    if (termo.thumbDriveFileId) {
      try {
        await deleteDriveFile(termo.thumbDriveFileId);
        console.log("[TERMO] ✅ Thumbnail deletada do Drive:", termo.thumbDriveFileId);
      } catch (e) {
        console.warn("[TERMO] ⚠️ Erro ao deletar thumbnail do Drive:", e.message);
        // Não bloquear se falhar
      }
    }

    // 2. Buscar e deletar PDF associado
    try {
      const SavedPDF = (await import("../models/SavedPDF.js")).default;
      
      // Buscar PDF relacionado por termoRetiradaId
      const relatedPdf = await SavedPDF.findOne({
        uid: termo.uid,
        "metadata.termoRetiradaId": termo._id.toString(),
      });

      if (relatedPdf) {
        console.log("[TERMO] PDF relacionado encontrado:", {
          pdfId: relatedPdf._id,
          driveFileId: relatedPdf.driveFileId,
        });

        // Deletar arquivo PDF do Google Drive
        if (relatedPdf.driveFileId) {
          try {
            await deleteDriveFile(relatedPdf.driveFileId);
            console.log("[TERMO] ✅ PDF deletado do Drive:", relatedPdf.driveFileId);
          } catch (e) {
            console.warn("[TERMO] ⚠️ Erro ao deletar PDF do Drive:", e.message);
          }
        }

        // Deletar registro do PDF do MongoDB
        await SavedPDF.deleteOne({ _id: relatedPdf._id });
        console.log("[TERMO] ✅ Registro do PDF deletado do MongoDB");
      } else {
        console.log("[TERMO] ℹ️ Nenhum PDF associado encontrado");
      }
    } catch (e) {
      console.warn("[TERMO] ⚠️ Erro ao deletar PDF associado:", e.message);
      // Não bloquear se falhar
    }

    // 3. Deletar o termo do MongoDB
    await TermoRetirada.deleteOne({ _id: termo._id });
    console.log("[TERMO] ✅ Termo deletado do MongoDB");

    return res.status(200).json({
      success: true,
      message: "Termo e arquivos associados deletados com sucesso",
    });
  } catch (error) {
    console.error("[TERMO] ❌ Erro ao deletar termo:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

