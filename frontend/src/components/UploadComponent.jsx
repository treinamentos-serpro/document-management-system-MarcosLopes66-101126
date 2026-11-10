import { useRef, useState } from 'react';

export default function UploadComponent({ onUpload, disabled }) {
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || disabled) return;
    try {
      await onUpload(file);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      // A mensagem de erro é apresentada pelo componente da página.
    }
  }

  return (
    <form className="upload-panel" onSubmit={handleSubmit}>
      <div className="section-heading">
        <span className="section-index">01</span>
        <div>
          <h2>Novo documento</h2>
          <p>Adicione um arquivo ao seu espaço.</p>
        </div>
      </div>
      <label className={`drop-zone${file ? ' has-file' : ''}`} htmlFor="document-file">
        <span className="upload-mark" aria-hidden="true">↑</span>
        <span className="drop-title">{file ? file.name : 'Escolha um arquivo'}</span>
        <span className="drop-hint">Selecione um arquivo do seu dispositivo</span>
        <input
          ref={inputRef}
          id="document-file"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>
      <div className="upload-actions">
        <span className="file-note">Limite por arquivo definido no servidor</span>
        <button className="button button-primary" type="submit" disabled={!file || disabled}>
          {disabled ? 'Enviando...' : 'Enviar documento'}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </form>
  );
}