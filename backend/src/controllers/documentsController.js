const documentService = require('../services/documentService');

function requireUser(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();
  if (!owner || owner.length > 200 || /[\u0000-\u001f\u007f]/.test(owner)) {
    return res.status(400).json({
      error: { code: 'USER_ID_REQUIRED', message: 'Informe um identificador válido em X-User-Id.' },
    });
  }

  req.userId = owner;
  return next();
}

function uploadDocument(req, res, next) {
  try {
    const document = documentService.createDocument(req.file, req.userId);
    return res.status(201).json({ document });
  } catch (error) {
    return next(error);
  }
}

function listDocuments(req, res, next) {
  try {
    return res.json({ documents: documentService.listDocuments(req.userId) });
  } catch (error) {
    return next(error);
  }
}

async function downloadDocument(req, res, next) {
  try {
    const { document, filePath } = await documentService.getDocumentForDownload(
      req.params.id,
      req.userId
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    return res.download(filePath, document.originalName, { dotfiles: 'allow' }, (error) => {
      if (!error || res.headersSent) {
        if (error) next(error);
        return;
      }
      if (error.code === 'ENOENT') {
        res.status(404).json({
          error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
        });
        return;
      }
      next(error);
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { downloadDocument, listDocuments, requireUser, uploadDocument };