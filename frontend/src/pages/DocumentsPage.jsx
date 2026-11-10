import { useEffect, useState } from 'react';
import DocumentList from '../components/DocumentList.jsx';
import UploadComponent from '../components/UploadComponent.jsx';
import {
  downloadDocument,
  listDocuments,
  uploadDocument,
} from '../services/documentsApi.js';

function getInitialUserId() {
  return window.localStorage.getItem('dms-user-id') || 'usuario-demo';
}

export default function DocumentsPage() {
  const [userId, setUserId] = useState(getInitialUserId);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    window.localStorage.setItem('dms-user-id', userId);
    const controller = new AbortController();
    setLoading(true);
    setError('');

    listDocuments(userId, controller.signal)
      .then(setDocuments)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [userId]);

  async function handleUpload(file) {
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const document = await uploadDocument(file, userId);
      setDocuments((currentDocuments) => [document, ...currentDocuments]);
      setNotice('Documento enviado com sucesso.');
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(document) {
    setDownloadingId(document.id);
    setError('');
    try {
      const blob = await downloadDocument(document.id, userId);
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = document.originalName;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DMS<span className="brand-period">.</span></span>
        </a>
        <label className="user-field">
          <span>ESPAÇO DE TRABALHO</span>
          <input
            aria-label="Identificador do usuário"
            value={userId}
            maxLength={200}
            onChange={(event) => setUserId(event.target.value)}
          />
        </label>
      </header>

      <section className="page-intro">
        <div>
          <p className="eyebrow"><span /> ARQUIVO PESSOAL</p>
          <h1>Documentos<br /><em>em ordem.</em></h1>
        </div>
        <p className="intro-note">
          Um lugar simples para guardar e encontrar<br className="desktop-break" /> seus arquivos importantes.
        </p>
      </section>

      <section className="workspace" aria-label="Gerenciamento de documentos">
        <UploadComponent onUpload={handleUpload} disabled={uploading || !userId.trim()} />
        <DocumentList
          documents={documents}
          loading={loading}
          downloadingId={downloadingId}
          onDownload={handleDownload}
        />
      </section>

      {(error || notice) && (
        <p className={`feedback${error ? ' feedback-error' : ' feedback-success'}`} role="status">
          {error || notice}
        </p>
      )}

      <footer className="page-footer">
        <span>ARMAZENAMENTO LOCAL</span>
        <span>DOCUMENT MANAGEMENT SYSTEM <i>·</i> 01</span>
      </footer>
    </main>
  );
}