const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

const defaultStorageDirectory = path.join(__dirname, '../../storage');
const storageDirectory = path.resolve(process.env.STORAGE_DIR || defaultStorageDirectory);
const storageNamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const configuredFileSize = Number(process.env.MAX_FILE_SIZE_BYTES);
const maxFileSize = Number.isSafeInteger(configuredFileSize) && configuredFileSize > 0
  ? configuredFileSize
  : 10 * 1024 * 1024;

fs.mkdirSync(storageDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, storageDirectory),
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: maxFileSize, files: 1 },
});

function getFilePath(storageName) {
  if (typeof storageName !== 'string' || !storageNamePattern.test(storageName)) return null;

  const filePath = path.resolve(storageDirectory, storageName);
  return path.dirname(filePath) === storageDirectory ? filePath : null;
}

async function removeFile(storageName) {
  const filePath = getFilePath(storageName);
  if (filePath) await fs.promises.rm(filePath, { force: true });
}

module.exports = { getFilePath, removeFile, storageDirectory, upload };