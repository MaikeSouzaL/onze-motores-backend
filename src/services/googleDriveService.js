import { google } from "googleapis";
import { Readable } from "stream";

// Este serviço suporta Service Account OU OAuth2
// Service Account (mais simples para backend):
// - GOOGLE_DRIVE_CLIENT_EMAIL
// - GOOGLE_DRIVE_PRIVATE_KEY
// OAuth2 (fallback, usa credenciais do app):
// - DRIVE_CLIENT_ID
// - DRIVE_CLIENT_SECRET
// - DRIVE_REFRESH_TOKEN
// Ambos aceitam:
// - GOOGLE_DRIVE_FOLDER_ID ou DRIVE_BACKUP_FOLDER_ID

function getPrivateKeyFromEnv() {
  const raw = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  if (!raw) return undefined;
  // Normaliza quebras de linha quando vem de ENV com \n
  return raw.replace(/\\n/g, "\n");
}

function getDriveClient() {
  // Tentar Service Account primeiro
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = getPrivateKeyFromEnv();

  if (clientEmail && privateKey) {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    return google.drive({ version: "v3", auth });
  }

  // Fallback para OAuth2
  const oauth2ClientId = process.env.DRIVE_CLIENT_ID;
  const oauth2ClientSecret = process.env.DRIVE_CLIENT_SECRET;
  const oauth2RefreshToken = process.env.DRIVE_REFRESH_TOKEN;

  if (oauth2ClientId && oauth2ClientSecret && oauth2RefreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      oauth2ClientId,
      oauth2ClientSecret,
    );

    oauth2Client.setCredentials({
      refresh_token: oauth2RefreshToken,
    });

    return google.drive({ version: "v3", auth: oauth2Client });
  }

  throw new Error(
    "Credenciais do Google Drive ausentes. Configure Service Account (GOOGLE_DRIVE_CLIENT_EMAIL/GOOGLE_DRIVE_PRIVATE_KEY) ou OAuth2 (DRIVE_CLIENT_ID/DRIVE_CLIENT_SECRET/DRIVE_REFRESH_TOKEN)",
  );
}

export async function uploadImageBase64AsPublicFile({
  base64Data,
  fileName,
  mimeType = "image/jpeg",
  folderId,
}) {
  const drive = getDriveClient();
  const effectiveFolderId =
    folderId ||
    process.env.GOOGLE_DRIVE_FOLDER_ID ||
    process.env.DRIVE_BACKUP_FOLDER_ID ||
    undefined;

  const fileMetadata = {
    name: fileName,
    ...(effectiveFolderId ? { parents: [effectiveFolderId] } : {}),
  };

  // Converter Buffer para Stream (googleapis precisa de stream)
  const buffer = Buffer.from(base64Data, "base64");
  const stream = Readable.from(buffer);

  const media = {
    mimeType,
    body: stream,
  };

  const createRes = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, webViewLink, webContentLink",
  });

  const fileId = createRes?.data?.id;
  if (!fileId) {
    throw new Error("Falha ao criar arquivo no Google Drive (sem fileId)");
  }

  // Tornar público
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  // Link público direto (melhor para <Image />)
  const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

  return {
    fileId,
    url: publicUrl,
    webViewLink: createRes.data.webViewLink,
    webContentLink: createRes.data.webContentLink,
  };
}

export async function deleteDriveFile(fileId) {
  if (!fileId) return;
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}
