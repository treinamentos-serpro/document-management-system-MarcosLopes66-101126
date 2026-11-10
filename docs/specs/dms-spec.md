# Especificação - Document Management System

## 1. Objetivo

Permitir que cada usuário envie, liste e baixe seus documentos, armazenados no filesystem local da aplicação, com metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos do usuário identificado na requisição.
- Download de um documento pelo identificador, limitado ao usuário associado.
- Interface web React para upload, listagem e download.
- Verificação de saúde do backend pelo endpoint `/health`.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Versionamento, exclusão, edição ou compartilhamento de documentos.
- Banco de dados, persistência de metadados entre reinicializações ou recuperação de arquivos órfãos.
- Autenticação, cadastro de usuários, pesquisa e paginação.
- Validação do conteúdo real ou lista permitida de tipos de arquivo.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo em `multipart/form-data`, no campo `file`. |
| RF-02 | O envio exige um identificador de usuário no cabeçalho `X-User-Id`. |
| RF-03 | O sistema gera um identificador único e um nome interno de armazenamento que não depende do nome original. |
| RF-04 | O sistema retorna os metadados públicos do documento após o envio bem-sucedido. |
| RF-05 | O sistema lista somente documentos associados ao usuário da requisição. |
| RF-06 | O usuário pode baixar um documento próprio usando seu identificador. |
| RF-07 | O sistema retorna erro apropriado para usuário inválido, arquivo ausente, upload inválido, tamanho excedido ou documento indisponível. |
| RF-08 | O sistema responde a `GET /health` com o estado do backend. |
| RF-09 | A interface permite informar o identificador do usuário e realizar upload, listagem e download. |
| RF-10 | A interface apresenta estados de carregamento, sucesso e erro. |
| RF-11 | O identificador do usuário informado na interface é mantido no armazenamento local do navegador para uso nas próximas visitas. |
| RF-12 | A listagem apresenta nome, tamanho e data de envio de cada documento, além de uma ação para baixá-lo. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Arquivos são gravados em `backend/storage` via Multer com `diskStorage`; nenhum provedor externo é utilizado. |
| RNF-02 | Metadados são mantidos em memória e se perdem quando o processo backend reinicia. |
| RNF-03 | Porta, diretório local e limite de upload podem ser configurados por variáveis de ambiente: `PORT` (padrão `3000`), `STORAGE_DIR` (padrão `backend/storage`) e `MAX_FILE_SIZE_BYTES` (padrão `10485760`). |
| RNF-04 | O tamanho máximo padrão é 10 MiB e pode ser alterado por `MAX_FILE_SIZE_BYTES`. |
| RNF-05 | Nome original não é usado como caminho de armazenamento; caminhos internos não são expostos pela API. |
| RNF-06 | Erros da API são JSON; downloads bem-sucedidos retornam conteúdo binário como anexo. |
| RNF-07 | O backend preserva o fluxo `routes -> controllers -> services -> repositories`. |
| RNF-08 | O frontend consome a API pelo prefixo `/api`, removido pelo proxy de desenvolvimento do Vite. |
| RNF-09 | Cada requisição de upload aceita no máximo um arquivo, no campo `file`. |
| RNF-10 | O identificador de usuário é obrigatório, removido de espaços nas extremidades, limitado a 200 caracteres e não pode conter caracteres de controle. |
| RNF-11 | O tipo MIME informado pelo cliente é tratado como não confiável; tipos inválidos são representados como `application/octet-stream`. |

## 5. Modelo de dados

### Metadados públicos

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único UUID. |
| `originalName` | string | Nome original saneado, usado para exibição e download. |
| `size` | number | Tamanho em bytes. |
| `uploadedAt` | string | Data e hora do upload em ISO 8601/UTC. |
| `owner` | string | Identificador recebido em `X-User-Id`. |
| `mimeType` | string | Tipo de mídia informado no upload, tratado como não confiável. |

O identificador `id` é gerado pelo servidor como UUID. `originalName` é saneado para remover caminhos e caracteres de controle; se ficar vazio, usa `document`. `size` é expresso em bytes e `uploadedAt` é UTC no formato ISO 8601.

### Dado interno

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `storageName` | string | Nome UUID gerado pelo servidor para localizar o arquivo; nunca é retornado pela API. |

O repositório em memória é indexado por `id`. Uma reinicialização elimina os metadados; arquivos locais sem metadados podem permanecer sem referência.

## 6. Contratos de API

As rotas da API são `/upload`, `/documents` e `/documents/:id/download`. No frontend em desenvolvimento, são chamadas como `/api/upload`, `/api/documents` e `/api/documents/:id/download`; o proxy Vite remove `/api`. Todas exigem `X-User-Id`, que identifica o contexto do protótipo e **não é autenticação**.

### `POST /upload`

- Entrada: cabeçalho `X-User-Id` e `multipart/form-data` com exatamente um arquivo no campo `file`.
- Sucesso: `201 Created` com `{ "document": { ...metadados públicos } }`.
- Erros: `400 USER_ID_REQUIRED` para usuário ausente/inválido; `400 FILE_REQUIRED` para arquivo ausente; `400 INVALID_UPLOAD` para envio inválido; `413 FILE_TOO_LARGE` quando o arquivo ultrapassar o limite; `500 INTERNAL_ERROR` para falha inesperada.

### `GET /documents`

- Entrada: cabeçalho `X-User-Id`.
- Sucesso: `200 OK` com `{ "documents": [...] }`; retorna array vazio quando não houver documentos.
- Erro: `400 USER_ID_REQUIRED` para usuário ausente ou inválido.

### `GET /documents/:id/download`

- Entrada: cabeçalho `X-User-Id` e identificador na URL.
- Sucesso: `200 OK`, conteúdo binário e `Content-Disposition: attachment` com o nome original; incluir `X-Content-Type-Options: nosniff`.
- Erro: `400 USER_ID_REQUIRED` para usuário ausente/inválido; `404 DOCUMENT_NOT_FOUND` se o documento não existir, não pertencer ao usuário ou o arquivo não estiver disponível, sem revelar qual condição ocorreu.

### `GET /health`

- Entrada: sem cabeçalho de usuário.
- Sucesso: `200 OK` com `{ "status": "ok" }`.

### Formato de erro

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

## 7. Decisões arquiteturais

- `routes/` compõe caminhos, valida a identidade da requisição e aplica o middleware de upload.
- Multer utiliza `diskStorage` em `backend/storage` (ou `STORAGE_DIR` configurado), com nome físico UUID e limite de tamanho configurável; aceita um único arquivo por requisição.
- `controllers/` adapta entrada e saída HTTP e traduz erros para respostas JSON.
- `services/` aplica as regras de criação, listagem e autorização por proprietário.
- `repositories/` mantém metadados em memória e encapsula o acesso aos arquivos locais; o campo interno `storageName` não atravessa a resposta pública.
- O frontend usa componentes React e um serviço `fetch` pelo proxy `/api` do Vite.
- `X-User-Id` não oferece segurança de autenticação: o chamador pode falsificá-lo. Produção requer mecanismo de identidade/autorização fora deste escopo.

## 8. Plano de execução

1. **Backend: persistência local e metadados.** Configurar Multer com `diskStorage`, UUID físico, limite configurável e repositório em memória. Validar nome público, MIME e ausência de exposição do nome interno.
2. **Backend: regras e API.** Implementar services, controllers e rotas para upload, listagem, download e health check, incluindo validação do usuário e erros JSON padronizados.
3. **Backend: testes HTTP.** Cobrir upload válido/ausente/inválido/acima do limite, listagem isolada por usuário, download autorizado/não autorizado, arquivo ausente e health check.
4. **Frontend: fluxos do usuário.** Implementar identificação do usuário, upload, listagem e download, estados de carregamento/sucesso/erro e chamadas pelo proxy `/api`.
5. **Integração e aceite.** Executar testes do backend e build do frontend; validar os três fluxos principais, isolamento por usuário, limites e respostas de erro. Corrigir apenas divergências em relação aos contratos desta especificação.

Estas etapas descrevem trabalho futuro. Nesta entrega, somente este documento de especificação deve ser criado ou atualizado; não implementar arquivos de backend ou frontend.

## 9. Critérios de aceite e limitações

- Upload válido retorna metadados e grava bytes em armazenamento local.
- Listagem e download estão limitados ao `X-User-Id` da requisição.
- Arquivos internos não são expostos nas respostas; upload acima do limite retorna `413`.
- `GET /health` retorna `200` e `{ "status": "ok" }`; erros da API seguem o envelope JSON definido nesta especificação.
- Interface permite realizar as três operações e informa falhas/carregamento.
- Metadados são voláteis; arquivos podem ficar órfãos após reinicialização.
- A identificação por cabeçalho é somente uma convenção de protótipo, não controle de acesso para produção.