import { sendBroadcastNotification } from "./pushNotification.service.js";

const ACTION_TITLES = {
  created: "Novo motor cadastrado",
  updated: "Motor atualizado",
  deleted: "Motor removido",
};

function buildBody(action, data) {
  const model = data?.modelo || data?.model || "";
  const brand = data?.marca || data?.brand || "";

  switch (action) {
    case "created":
      return `Novo motor disponível: ${model ? `${model}` : "Sem modelo"}${
        brand ? ` - ${brand}` : ""
      }`;
    case "updated":
      return `Motor atualizado: ${model ? `${model}` : "Sem modelo"}${
        brand ? ` - ${brand}` : ""
      }`;
    case "deleted":
      return `Motor removido: ${model ? `${model}` : "Sem modelo"}`;
    default:
      return "Atualização na lista de motores.";
  }
}

/**
 * Notificar todos os usuários sobre mudanças em motores
 * Deve ser chamado pelos Controllers quando houver mudanças no MongoDB
 * 
 * @param {string} action - 'created' | 'updated' | 'deleted'
 * @param {object} motorData - Dados do motor
 */
export async function notifyMotorChange(action, motorData) {
  try {
    // Para broadcast, não precisamos filtrar por usuário
    // Envia para todos os dispositivos cadastrados
    await sendBroadcastNotification({
      title: ACTION_TITLES[action] || "Atualização de motor",
      body: buildBody(action, motorData),
      data: {
        type: "motor_change",
        action,
        motorId: motorData._id || motorData.id,
      },
    });
  } catch (error) {
    console.error("Erro ao enviar broadcast de motor:", error);
  }
}

// Funções legadas do watcher (mantidas para compatibilidade com server.js)
// Futuramente podem ser substituídas por MongoDB Change Streams
export function startMotorWatcher() {
  console.log("👀 Motor Watcher (MongoDB): Aguardando eventos via Controller Hooks");
}

export function stopMotorWatcher() {
  console.log("👀 Motor Watcher parado");
}
