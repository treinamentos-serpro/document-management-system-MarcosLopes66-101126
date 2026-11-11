const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const documentRepository = require('../repositories/documentRepository');
const localFileStorage = require('../repositories/localFileStorage');
const { cleanMimeType, cleanOriginalName } = require('./documentSanitizer');

function configuredPositiveInteger(name, fallback) {
  const configuredValue = Number(process.env[name]);
  return Number.isSafeInteger(configuredValue) && configuredValue > 0
    ? configuredValue
    : fallback;
}

const maxStorageBytes = configuredPositiveInteger('MAX_STORAGE_BYTES', 1024 * 1024 * 1024);
const maxUserStorageBytes = configuredPositiveInteger('MAX_USER_STORAGE_BYTES', 100 * 1024 * 1024);
let documentCreationQueue = Promise.resolve();

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function documentNotFoundError() {
  return createError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
}

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

function buildDocumentRecord(file, owner) {
  return {
    id: randomUUID(),
    originalName: cleanOriginalName(file.originalname),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    mimeType: cleanMimeType(file.mimetype),
    storageName: file.filename,
  };
}

function findOwnedDocument(id, owner) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    throw documentNotFoundError();
  }
  return document;
}

async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw documentNotFoundError();
  }
}

async function getStorageUsage() {
  const entries = await fs.readdir(localFileStorage.storageDirectory, { withFileTypes: true });
  const fileSizes = await Promise.all(entries
    .filter((entry) => entry.isFile())
    .map(async (entry) => (await fs.stat(path.join(localFileStorage.storageDirectory, entry.name))).size));
  return fileSizes.reduce((total, size) => total + size, 0);
}

async function createDocumentRecord(file, owner) {
  if (!file) {
    throw createError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo "file".');
  }

  try {
    const userUsage = documentRepository.findByOwner(owner)
      .reduce((total, document) => total + document.size, 0);
    const storageUsage = await getStorageUsage();

    if (userUsage + file.size > maxUserStorageBytes || storageUsage > maxStorageBytes) {
      throw createError(413, 'STORAGE_LIMIT_EXCEEDED', 'O limite de armazenamento foi excedido.');
    }

    const document = buildDocumentRecord(file, owner);
    documentRepository.create(document);
    return toPublicDocument(document);
  } catch (error) {
    await localFileStorage.removeFile(file.filename).catch(() => {});
    throw error;
  }
}

function createDocument(file, owner) {
  const creation = documentCreationQueue.then(() => createDocumentRecord(file, owner));
  documentCreationQueue = creation.catch(() => {});
  return creation;
}

function listDocuments(owner) {
  return documentRepository.findByOwner(owner).map(toPublicDocument);
}

async function getDocumentForDownload(id, owner) {
  const document = findOwnedDocument(id, owner);
  const filePath = localFileStorage.getFilePath(document.storageName);
  if (!filePath) throw documentNotFoundError();
  await ensureFileExists(filePath);
  return { document: toPublicDocument(document), filePath };
}

module.exports = { createDocument, getDocumentForDownload, listDocuments };