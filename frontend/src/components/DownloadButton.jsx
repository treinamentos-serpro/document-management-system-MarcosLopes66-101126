export default function DownloadButton({ document, downloading, onDownload }) {
  return (
    <button
      className="button button-download"
      type="button"
      onClick={() => onDownload(document)}
      disabled={downloading}
      aria-label={`Baixar ${document.originalName}`}
      title="Baixar documento"
    >
      {downloading ? 'Baixando...' : 'Baixar'}
      <span aria-hidden="true">↓</span>
    </button>
  );
}
