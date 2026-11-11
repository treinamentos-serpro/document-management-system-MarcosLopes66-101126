const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const storageDirectory = path.join(__dirname, '../storage', `endpoints-${process.pid}`);
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '64';
process.env.MAX_STORAGE_BYTES = String(1024 * 1024);
process.env.MAX_USER_STORAGE_BYTES = String(1024 * 1024);

const app = require('../src/app');

let server;
let baseUrl;

function uploadFile(owner, content, fileName, type = 'text/plain') {
  const formData = new FormData();
  formData.append('file', new Blob([content], { type }), fileName);
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: owner ? { 'X-User-Id': owner } : {},
    body: formData,
  });
}

function listDocuments(owner) {
  return fetch(`${baseUrl}/documents`, {
    headers: owner ? { 'X-User-Id': owner } : {},
  });
}

function downloadDocument(id, owner) {
  return fetch(`${baseUrl}/documents/${id}/download`, {
    headers: owner ? { 'X-User-Id': owner } : {},
  });
}

async function uploadAndGetDocument(owner, content, fileName) {
  const response = await uploadFile(owner, content, fileName);
  assert.equal(response.status, 201);
  return (await response.json()).document;
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(storageDirectory, { recursive: true, force: true });
});

describe('POST /upload', () => {
  it('cria o documento com metadados públicos e grava o arquivo no storage', async () => {
    const response = await uploadFile('upload-metadados', 'conteúdo', 'relatorio.txt');

    assert.equal(response.status, 201);
    const { document } = await response.json();
    assert.equal(document.originalName, 'relatorio.txt');
    assert.equal(document.size, Buffer.byteLength('conteúdo'));
    assert.equal(document.owner, 'upload-metadados');
    assert.equal(document.mimeType, 'text/plain');
    assert.equal(typeof document.id, 'string');
    assert.ok(!Number.isNaN(Date.parse(document.uploadedAt)));
    assert.equal(Object.hasOwn(document, 'storageName'), false);

    const storedFiles = await fs.readdir(storageDirectory);
    assert.ok(storedFiles.length >= 1);
  });

  it('remove diretórios do nome original enviado pelo cliente', async () => {
    const document = await uploadAndGetDocument('upload-nome', 'x', 'pasta/segredo.txt');

    assert.equal(document.originalName, 'segredo.txt');
  });

  it('rejeita requisição sem X-User-Id', async () => {
    const response = await uploadFile(null, 'conteúdo', 'sem-dono.txt');

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'USER_ID_REQUIRED');
  });

  it('rejeita requisição sem o campo "file"', async () => {
    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'upload-sem-arquivo' },
      body: new FormData(),
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'FILE_REQUIRED');
  });

  it('rejeita arquivo acima do limite configurado com 413', async () => {
    const response = await uploadFile('upload-grande', 'x'.repeat(65), 'grande.txt');

    assert.equal(response.status, 413);
    assert.equal((await response.json()).error.code, 'FILE_TOO_LARGE');
  });
});

describe('GET /documents', () => {
  it('lista apenas os documentos do usuário informado', async () => {
    const owner = 'listagem-dono';
    const first = await uploadAndGetDocument(owner, 'um', 'um.txt');
    const second = await uploadAndGetDocument(owner, 'dois', 'dois.txt');
    await uploadAndGetDocument('listagem-outro', 'outro', 'outro.txt');

    const response = await listDocuments(owner);

    assert.equal(response.status, 200);
    const { documents } = await response.json();
    assert.deepEqual(
      documents.map((document) => document.id).sort(),
      [first.id, second.id].sort()
    );
    assert.ok(documents.every((document) => document.owner === owner));
  });

  it('retorna lista vazia para usuário sem documentos', async () => {
    const response = await listDocuments('listagem-vazia');

    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).documents, []);
  });

  it('rejeita requisição sem X-User-Id', async () => {
    const response = await listDocuments(null);

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'USER_ID_REQUIRED');
  });
});

describe('GET /documents/:id/download', () => {
  it('baixa o conteúdo original para o dono com cabeçalhos seguros', async () => {
    const owner = 'download-dono';
    const document = await uploadAndGetDocument(owner, 'conteúdo para download', 'baixar.txt');

    const response = await downloadDocument(document.id, owner);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'conteúdo para download');
    assert.match(response.headers.get('content-disposition'), /baixar\.txt/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('content-type'), 'application/octet-stream');
  });

  it('retorna 404 quando outro usuário tenta baixar o documento', async () => {
    const document = await uploadAndGetDocument('download-dono-2', 'privado', 'privado.txt');

    const response = await downloadDocument(document.id, 'download-intruso');

    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
  });

  it('retorna 404 para identificador inexistente', async () => {
    const response = await downloadDocument('00000000-0000-4000-8000-000000000000', 'download-dono-3');

    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
  });

  it('retorna 404 quando o arquivo foi removido do storage', async () => {
    const owner = 'download-arquivo-removido';
    const document = await uploadAndGetDocument(owner, 'some', 'sumiu.txt');
    const storedFiles = await fs.readdir(storageDirectory);
    await Promise.all(storedFiles.map((file) => fs.rm(path.join(storageDirectory, file))));

    const response = await downloadDocument(document.id, owner);

    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
  });

  it('rejeita requisição sem X-User-Id', async () => {
    const response = await downloadDocument('00000000-0000-4000-8000-000000000000', null);

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'USER_ID_REQUIRED');
  });
});
