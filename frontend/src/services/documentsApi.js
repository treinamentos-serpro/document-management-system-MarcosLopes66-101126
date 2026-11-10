const API_PREFIX = '/api';

function userHeaders(userId) {
  return { 'X-User-Id': userId };
}

async function parseResponse(response) {
  if (response.ok) return response;

  const result = await response.json().catch(() => null);
  throw new Error(result?.error?.message || 'Não foi possível concluir a operação.');
}

export async function listDocuments(userId, signal) {
  const response = await parseResponse(await fetch(`${API_PREFIX}/documents`, {
    headers: userHeaders(userId),
    signal,
  }));
  return (await response.json()).documents;
}

export async function uploadDocument(file, userId) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await parseResponse(await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    headers: userHeaders(userId),
    body: formData,
  }));
  return (await response.json()).document;
}

export async function downloadDocument(documentId, userId) {
  const response = await parseResponse(await fetch(
    `${API_PREFIX}/documents/${encodeURIComponent(documentId)}/download`,
    { headers: userHeaders(userId) }
  ));
  return response.blob();
}