const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

const defaultStorageDirectory = path.join(__dirname, '../../storage');
const storageDirectory = path.resolve(process.env.STORAGE_DIR || defaultStorageDirectory);
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
  return path.join(storageDirectory, storageName);
}

module.exports = { getFilePath, upload };