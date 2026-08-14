import { httpError } from "../middleware/errors.js";
import { aiComplete } from "./ai-router.js";
import { getCloudFile, updateCloudFile } from "./cloud-files-client.js";

const SYSTEM_PROMPT = `Tu es Brain, l'assistant intégré à ETHONE Cloud. Tu reçois des métadonnées de fichier (nom, type, taille, tags existants). Résume en une phrase l'usage probable du fichier. Suggère un dossier parent pertinent parmi ceux fournis. Réponds UNIQUEMENT en JSON sans markdown : {"summary": "...", "suggestedFolderName": "..."}.`;

export async function analyzeFile(env, userId, driveFileId, folders = []) {
  const file = await getCloudFile(env, userId, driveFileId);
  if (!file) throw httpError("PROVIDER_NOT_FOUND", 404);
  const context = JSON.stringify({
    name: file.name,
    type: file.mimeType,
    size: file.size,
    tags: file.tags,
    folders: folders.map((folder) => ({ id: folder.driveFileId || folder.id, name: folder.name }))
  }).slice(0, 4000);

  const prompt = `${SYSTEM_PROMPT}\n\nMétadonnées : ${context}`;
  let result;
  try {
    result = await aiComplete({ ...env, __AUTH_USER_ID: userId }, {
      messages: [{ role: "user", content: prompt }],
      context: {},
      feature: "cloud",
      priority: "low",
      provider: "cloudflare",
    });
  } catch (error) {
    throw httpError("UPSTREAM_UNAVAILABLE", 503, { retryable: true, detail: error?.code });
  }

  let parsed;
  try {
    parsed = JSON.parse(result.content);
  } catch {
    parsed = {};
  }
  const summary = String(parsed.summary || result.content).slice(0, 2000);
  const suggestedName = String(parsed.suggestedFolderName || "").trim();
  const suggestedFolder = folders.find((folder) => String(folder.name).toLowerCase() === suggestedName.toLowerCase()) || null;
  const analyzedAt = new Date().toISOString();
  const patch = {
    brainSummary: summary,
    brainSuggestedFolderId: suggestedFolder?.driveFileId || suggestedFolder?.id || null,
    brainAnalyzedAt: analyzedAt
  };
  await updateCloudFile(env, userId, driveFileId, patch);
  return Object.freeze({
    summary,
    suggestedFolderId: patch.brainSuggestedFolderId,
    suggestedFolderName: suggestedFolder?.name || suggestedName,
    analyzedAt
  });
}
