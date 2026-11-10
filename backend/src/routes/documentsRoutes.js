const express = require('express');
const documentsController = require('../controllers/documentsController');
const { upload } = require('../repositories/localFileStorage');

const router = express.Router();

router.post(
  '/upload',
  documentsController.requireUser,
  upload.single('file'),
  documentsController.uploadDocument
);
router.get('/documents', documentsController.requireUser, documentsController.listDocuments);
router.get(
  '/documents/:id/download',
  documentsController.requireUser,
  documentsController.downloadDocument
);

module.exports = router;