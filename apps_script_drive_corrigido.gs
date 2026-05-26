// Apps Script corrigido para a Plataforma Olímpica
// 1) Troque FOLDER_ID pelo ID da sua pasta do Google Drive
// 2) Implante como App da Web: Executar como: Eu / Quem pode acessar: Qualquer pessoa
// 3) Depois de salvar, clique em Implantar > Gerenciar implantações > Editar > Nova versão > Implantar

const FOLDER_ID = "COLE_AQUI_O_ID_DA_SUA_PASTA";
const TOKEN = "avance-olimpico-2026";

function doPost(e) {
  try {
    const data = e.parameter && e.parameter.payload
      ? JSON.parse(e.parameter.payload)
      : JSON.parse(e.postData.contents);

    if (data.token !== TOKEN) {
      return responder({ success: false, error: "Token inválido.", requestId: data.requestId || "" });
    }

    if (data.action === "delete") {
      if (!data.fileId) {
        return responder({ success: false, error: "fileId não informado.", requestId: data.requestId || "" });
      }

      const file = DriveApp.getFileById(data.fileId);
      file.setTrashed(true);

      return responder({ success: true, deleted: true, fileId: data.fileId, requestId: data.requestId || "" });
    }

    if (data.action === "upload" || !data.action) {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const base64 = String(data.fileBase64 || "").split(",").pop();
      const bytes = Utilities.base64Decode(base64);
      const blob = Utilities.newBlob(bytes, data.mimeType || "application/octet-stream", data.fileName || "arquivo");
      const file = folder.createFile(blob);

      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return responder({
        success: true,
        fileId: file.getId(),
        fileName: file.getName(),
        fileUrl: file.getUrl(),
        requestId: data.requestId || ""
      });
    }

    return responder({ success: false, error: "Ação desconhecida.", requestId: data.requestId || "" });
  } catch (err) {
    return responder({ success: false, error: err.message, requestId: "" });
  }
}

function responder(obj) {
  const payload = JSON.stringify(Object.assign({ origem: "avance-drive" }, obj));
  return HtmlService
    .createHtmlOutput(`<script>window.top.postMessage(${payload}, "*");</script>`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
