import DownloadButton from './DownloadButton.jsx';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, loading, downloadingId, onDownload }) {
  return (
    <section className="documents-panel" aria-labelledby="documents-title">
      <div className="section-heading list-heading">
        <span className="section-index">02</span>
        <div>
          <h2 id="documents-title">Seus documentos</h2>
          <p>{documents.length} {documents.length === 1 ? 'arquivo armazenado' : 'arquivos armazenados'}</p>
        </div>
        <span className="document-count" aria-label={`${documents.length} documentos`}>
          {String(documents.length).padStart(2, '0')}
        </span>
      </div>

      {loading ? (
        <p className="empty-state">Carregando documentos...</p>
      ) : documents.length === 0 ? (
        <p className="empty-state">Nenhum documento por aqui. O primeiro pode ser seu.</p>
      ) : (
        <ul className="document-list">
          {documents.map((document) => (
            <li className="document-row" key={document.id}>
              <span className="file-glyph" aria-hidden="true">DOC</span>
              <div className="document-info">
                <span className="document-name" title={document.originalName}>
                  {document.originalName}
                </span>
                <span className="document-meta">
                  {formatSize(document.size)} <span aria-hidden="true">·</span> {formatDate(document.uploadedAt)}
                </span>
              </div>
              <DownloadButton
                document={document}
                downloading={downloadingId === document.id}
                onDownload={onDownload}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}