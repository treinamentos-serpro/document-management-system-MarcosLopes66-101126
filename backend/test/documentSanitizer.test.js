const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cleanMimeType, cleanOriginalName } = require('../src/services/documentSanitizer');

test('cleanOriginalName remove diretórios, caracteres de controle e espaços extras', () => {
  assert.equal(cleanOriginalName('../../etc/passwd'), 'passwd');
  assert.equal(cleanOriginalName('pasta\\nota.txt'), 'nota.txt');
  assert.equal(cleanOriginalName('a\u0001b.txt'), 'a_b.txt');
  assert.equal(cleanOriginalName('  relatorio.pdf  '), 'relatorio.pdf');
});

test('cleanOriginalName usa um nome padrão quando não há nome utilizável', () => {
  assert.equal(cleanOriginalName('   '), 'document');
  assert.equal(cleanOriginalName(undefined), 'document');
});

test('cleanMimeType preserva tipos válidos e usa o padrão para valores inválidos', () => {
  assert.equal(cleanMimeType('text/plain'), 'text/plain');
  assert.equal(cleanMimeType('invalido'), 'application/octet-stream');
  assert.equal(cleanMimeType(''), 'application/octet-stream');
  assert.equal(cleanMimeType(undefined), 'application/octet-stream');
});
