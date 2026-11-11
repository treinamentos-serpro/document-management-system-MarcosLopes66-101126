function handleError(error, _req, res, _next) {
  if (res.headersSent) return;

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite permitido.' },
    });
  }

  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'A requisição não é válida.' },
    });
  }

  if (error instanceof Error && error.name === 'MulterError') {
    return res.status(400).json({
      error: { code: 'INVALID_UPLOAD', message: 'O envio do arquivo não é válido.' },
    });
  }

  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  const code = status === 500 ? 'INTERNAL_ERROR' : error.code;
  const message = status === 500 ? 'Ocorreu um erro interno.' : error.message;
  return res.status(status).json({ error: { code, message } });
}

module.exports = { handleError };