const fs = require('node:fs/promises');
const path = require('node:path');
const documentRepository = require('../repositories/documentRepository');
const localFileStorage = require('../repositories/localFileStorage');

function configuredPositiveInteger(name, fallback) {
  const configuredValue = Number(process.env[name]);
  return Number.isSafeInteger(configuredValue) && configuredValue > 0
    ? configuredValue
    : fallback;
}

const maxStorageBytes = configuredPositiveInteger('MAX_STORAGE_BYTES', 1024 * 1024 * 1024);
const maxUserStorageBytes = configuredPositiveInteger('MAX_USER_STORAGE_BYTES', 100 * 1024 * 1024);

async function getStorageUsage() {
  const entries = await fs.readdir(localFileStorage.storageDirectory, { withFileTypes: true });
  const fileSizes = await Promise.all(entries
    .filter((entry) => entry.isFile())
    .map(async (entry) => (await fs.stat(path.join(localFileStorage.storageDirectory, entry.name))).size));
  return fileSizes.reduce((total, size) => total + size, 0);
}

async function hasCapacityFor(file, owner) {
  const userUsage = documentRepository.findByOwner(owner)
    .reduce((total, document) => total + document.size, 0);
  const storageUsage = await getStorageUsage();

  return userUsage + file.size <= maxUserStorageBytes && storageUsage <= maxStorageBytes;
}

module.exports = { hasCapacityFor };