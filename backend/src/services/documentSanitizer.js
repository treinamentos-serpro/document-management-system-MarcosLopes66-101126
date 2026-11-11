const path = require('node:path');

const MIME_TYPE_PATTERN = /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/;
const DEFAULT_MIME_TYPE = 'application/octet-stream';
const DEFAULT_NAME = 'document';

function cleanOriginalName(originalName) {
  const fileName = path.basename(String(originalName || '').replace(/\\/g, '/'));
  const cleanName = fileName.replace(/[\u0000-\u001f\u007f]/g, '_').trim();
  return cleanName || DEFAULT_NAME;
}

function cleanMimeType(mimeType) {
  return MIME_TYPE_PATTERN.test(mimeType || '') ? mimeType : DEFAULT_MIME_TYPE;
}

module.exports = { cleanMimeType, cleanOriginalName };