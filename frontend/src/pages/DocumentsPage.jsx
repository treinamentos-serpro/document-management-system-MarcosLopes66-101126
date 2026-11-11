import { useEffect, useRef, useState } from 'react';
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
  const [documentsOwner, setDocumentsOwner] = useState(userId);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    window.localStorage.setItem('dms-user-id', userId);
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDocuments([]);
    setDocumentsOwner(null);
    setNotice('');

    listDocuments(userId, controller.signal)
      .then((loadedDocuments) => {
        if (userIdRef.current === userId) {
          setDocuments(loadedDocuments);
          setDocumentsOwner(userId);
        }
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError' && userIdRef.current === userId) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [userId]);

  async function handleUpload(file) {
    const uploadUserId = userId;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const document = await uploadDocument(file, uploadUserId);
      setDocuments((currentDocuments) => userIdRef.current === uploadUserId
        ? [document, ...currentDocuments]
        : currentDocuments);
      if (userIdRef.current === uploadUserId) {
        setDocumentsOwner(uploadUserId);
        setNotice('Documento enviado com sucesso.');
      }
    } catch (requestError) {
      if (userIdRef.current === uploadUserId) setError(requestError.message);
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
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
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
          documents={documentsOwner === userId ? documents : []}
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