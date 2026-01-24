import { sendPushNotificationToUser } from "../services/pushNotification.service.js";

const ACTION_TITLES = {
  created: "Novo motor cadastrado",
  updated: "Motor atualizado",
};

export async function notifyMotorChange(req, res, next) {
  try {
    const { userId, motorId, action, actorId, model, brand } = req.body || {};

    if (!userId || !motorId || !action) {
      return res.status(400).json({
        success: false,
        error: "userId, motorId e action são obrigatórios",
      });
    }

    const title = ACTION_TITLES[action] || "Atualização de motor";
    const body =
      action === "created"
        ? `Um novo motor${model ? ` ${model}` : ""}${
            brand ? ` da marca ${brand}` : ""
          } foi cadastrado.`
        : `O motor${model ? ` ${model}` : ""}${
            brand ? ` da marca ${brand}` : ""
          } foi atualizado.`;

    await sendPushNotificationToUser(userId, {
      title,
      body,
      data: {
        type: "motor_change",
        action,
        motorId,
        actorId,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Erro ao notificar mudança de motor:", error);
    next(error);
  }
}





