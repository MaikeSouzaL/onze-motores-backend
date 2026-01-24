import TermoRetirada from "../models/TermoRetirada.js";
import TermoNotificationDismiss from "../models/TermoNotificationDismiss.js";
import { getUserPermissions } from "../utils/permissionUtils.js";

/**
 * @desc    Obter termos que precisam de notificação (vencidos ou próximos a vencer)
 * @route   GET /api/termos/notifications?uid=...
 */
export const getTermosNotifications = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ success: false, message: "UID obrigatório" });
    }

    const { isAdmin } = await getUserPermissions(uid);
    const now = new Date();

    // Data limite: 5 dias a partir de agora
    const warningLimit = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // Buscar termos pendentes (não retirados) que estão vencidos ou próximos a vencer
    const termosQuery = isAdmin
      ? { retirado: false }
      : { uid, retirado: false };

    const termos = await TermoRetirada.find({
      ...termosQuery,
      dataRetirada: { $lte: warningLimit }, // Vence em até 5 dias ou já venceu
    }).sort({ dataRetirada: 1 }); // Mais urgentes primeiro

    // Buscar quais notificações o usuário já dispensou
    const dismissed = await TermoNotificationDismiss.find({ uid });
    const dismissedMap = new Map();
    dismissed.forEach((d) => {
      const key = `${d.termoId}_${d.notificationType}`;
      dismissedMap.set(key, d);
    });

    // Filtrar termos que ainda não foram dispensados
    const notifications = [];

    for (const termo of termos) {
      const isVencido = new Date(termo.dataRetirada) < now;
      const notificationType = isVencido ? "vencido" : "proximo_vencer";
      const key = `${termo._id}_${notificationType}`;

      // Se já foi dispensada, pular
      if (dismissedMap.has(key)) {
        continue;
      }

      // Calcular dias restantes
      const dataRetirada = new Date(termo.dataRetirada);
      const diffMs = dataRetirada.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

      notifications.push({
        _id: termo._id,
        nomeCliente: termo.nomeCliente,
        telefoneCliente: termo.telefoneCliente,
        nomeMotor: termo.nomeMotor,
        defeitoEncontrado: termo.defeitoEncontrado,
        dataRetirada: termo.dataRetirada,
        daysLeft,
        isVencido,
        notificationType,
        thumbUrl: termo.thumbUrl,
      });
    }

    return res.status(200).json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error("[NOTIF] Erro ao buscar notificações:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Marcar notificação como vista (usuário tomou conhecimento)
 * @route   POST /api/termos/notifications/dismiss
 */
export const dismissNotification = async (req, res) => {
  try {
    const { uid, termoId, notificationType } = req.body;

    if (!uid || !termoId || !notificationType) {
      return res.status(400).json({
        success: false,
        message: "uid, termoId e notificationType são obrigatórios",
      });
    }

    // Buscar o termo para pegar a dataRetirada
    const termo = await TermoRetirada.findById(termoId);
    if (!termo) {
      return res.status(404).json({ success: false, message: "Termo não encontrado" });
    }

    // Criar ou atualizar registro de dismiss
    await TermoNotificationDismiss.findOneAndUpdate(
      { uid, termoId, notificationType },
      {
        uid,
        termoId,
        notificationType,
        dataRetirada: termo.dataRetirada,
        dismissedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log("[NOTIF] Notificação dispensada:", {
      uid,
      termoId,
      notificationType,
    });

    return res.status(200).json({
      success: true,
      message: "Notificação marcada como vista",
    });
  } catch (error) {
    console.error("[NOTIF] Erro ao dispensar notificação:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Dispensar todas as notificações de uma vez
 * @route   POST /api/termos/notifications/dismiss-all
 */
export const dismissAllNotifications = async (req, res) => {
  try {
    const { uid, termoIds } = req.body;

    if (!uid || !Array.isArray(termoIds)) {
      return res.status(400).json({
        success: false,
        message: "uid e termoIds (array) são obrigatórios",
      });
    }

    // Buscar todos os termos
    const termos = await TermoRetirada.find({ _id: { $in: termoIds } });

    // Criar registros de dismiss para cada termo
    const dismissPromises = termos.map(async (termo) => {
      const now = new Date();
      const isVencido = new Date(termo.dataRetirada) < now;
      const notificationType = isVencido ? "vencido" : "proximo_vencer";

      return TermoNotificationDismiss.findOneAndUpdate(
        { uid, termoId: termo._id.toString(), notificationType },
        {
          uid,
          termoId: termo._id.toString(),
          notificationType,
          dataRetirada: termo.dataRetirada,
          dismissedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(dismissPromises);

    console.log("[NOTIF] Todas as notificações dispensadas:", {
      uid,
      count: termoIds.length,
    });

    return res.status(200).json({
      success: true,
      message: `${termoIds.length} notificações marcadas como vistas`,
    });
  } catch (error) {
    console.error("[NOTIF] Erro ao dispensar todas notificações:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
