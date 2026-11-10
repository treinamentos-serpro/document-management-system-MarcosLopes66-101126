const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const documentRepository = require('../repositories/documentRepository');
const localFileStorage = require('../repositories/localFileStorage');

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

function cleanOriginalName(originalName) {
  const fileName = path.basename(String(originalName || '').replace(/\\/g, '/'));
  const cleanName = fileName.replace(/[\u0000-\u001f\u007f]/g, '_').trim();
  return cleanName || 'document';
}

function cleanMimeType(mimeType) {
  return /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(mimeType || '')
    ? mimeType
    : 'application/octet-stream';
}

function createDocument(file, owner) {
  if (!file) {
    throw createError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo "file".');
  }

  const document = {
    id: randomUUID(),
    originalName: cleanOriginalName(file.originalname),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    mimeType: cleanMimeType(file.mimetype),
    storageName: file.filename,
  };

  documentRepository.create(document);
  return toPublicDocument(document);
}

function listDocuments(owner) {
  return documentRepository.findByOwner(owner).map(toPublicDocument);
}

async function getDocumentForDownload(id, owner) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    throw createError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  const filePath = localFileStorage.getFilePath(document.storageName);
  try {
    await fs.access(filePath);
  } catch {
    throw createError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return { document: toPublicDocument(document), filePath };
}

module.exports = { createDocument, getDocumentForDownload, listDocuments };