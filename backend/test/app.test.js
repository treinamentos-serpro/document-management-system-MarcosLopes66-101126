const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const storageDirectory = path.join(__dirname, '../storage', `test-${process.pid}`);
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '32';
process.env.MAX_STORAGE_BYTES = '32';
process.env.MAX_USER_STORAGE_BYTES = '32';

const app = require('../src/app');
const localFileStorage = require('../src/repositories/localFileStorage');

test('caminhos de armazenamento rejeitam nomes fora do formato UUID', () => {
  assert.equal(localFileStorage.getFilePath('../../etc/passwd'), null);
  assert.equal(localFileStorage.getFilePath('arquivo.txt'), null);
});

test('documentos podem ser enviados, listados e baixados somente pelo dono', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const healthResponse = await fetch(`${baseUrl}/health`);
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await healthResponse.json(), { status: 'ok' });

    const missingUserResponse = await fetch(`${baseUrl}/documents`);
    assert.equal(missingUserResponse.status, 400);

    const formData = new FormData();
    formData.append('file', new Blob(['documento local'], { type: 'text/plain' }), 'nota.txt');

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'usuario-a' },
      body: formData,
    });
    assert.equal(uploadResponse.status, 201);

    const { document } = await uploadResponse.json();
    assert.equal(document.originalName, 'nota.txt');
    assert.equal(document.size, 15);
    assert.equal(document.owner, 'usuario-a');
    assert.equal(typeof document.id, 'string');
    assert.equal(typeof document.uploadedAt, 'string');
    assert.equal(Object.hasOwn(document, 'storageName'), false);

    const storageLimitForm = new FormData();
    storageLimitForm.append('file', new Blob(['x'.repeat(20)]), 'limite.txt');
    const storageLimitResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'usuario-a' },
      body: storageLimitForm,
    });
    assert.equal(storageLimitResponse.status, 413);
    assert.equal((await storageLimitResponse.json()).error.code, 'STORAGE_LIMIT_EXCEEDED');
    assert.equal((await fs.readdir(storageDirectory)).length, 1);

    const ownerListResponse = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'usuario-a' },
    });
    assert.deepEqual((await ownerListResponse.json()).documents, [document]);

    const otherUserListResponse = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'usuario-b' },
    });
    assert.deepEqual((await otherUserListResponse.json()).documents, []);

    const forbiddenDownloadResponse = await fetch(
      `${baseUrl}/documents/${document.id}/download`,
      { headers: { 'X-User-Id': 'usuario-b' } }
    );
    assert.equal(forbiddenDownloadResponse.status, 404);
    await forbiddenDownloadResponse.text();

    const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: { 'X-User-Id': 'usuario-a' },
    });
    const downloadedContent = await downloadResponse.text();
    assert.equal(downloadResponse.status, 200, downloadedContent);
    assert.equal(downloadedContent, 'documento local');
    assert.match(downloadResponse.headers.get('content-disposition'), /nota\.txt/);

    const oversizedForm = new FormData();
    oversizedForm.append('file', new Blob(['x'.repeat(64)]), 'grande.txt');
    const oversizedResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'usuario-a' },
      body: oversizedForm,
    });
    assert.equal(oversizedResponse.status, 413);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(storageDirectory, { recursive: true, force: true });
  }
});
