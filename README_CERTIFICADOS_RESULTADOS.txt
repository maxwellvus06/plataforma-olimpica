# Certificados nos Resultados Olímpicos

## O que entrou

- Na edição de um resultado, o ADM pode anexar um certificado em PDF ou imagem.
- O certificado é enviado para Firebase Storage em `plataforma/{ano}/certificados/`.
- O resultado salva no Firestore os campos:
  - `certificadoUrl`
  - `certificadoStoragePath`
  - `certificadoNomeArquivo`
  - `certificadoMimeType`
  - `certificadoTamanho`
  - `certificadoEnviadoEm`
  - `certificadoEnviadoPorId`
  - `certificadoEnviadoPorNome`
- A tabela de Resultados mostra o link do certificado quando existir.
- O painel do aluno “Meus Resultados” também mostra o certificado para download/visualização.

## Atenção às regras do Storage

A pasta `plataforma/` precisa estar liberada para usuários autenticados. O arquivo `storage.rules` do pacote já cobre isso.

Substitua principalmente:

- `index.html`
- `app.js`

Pode subir o pacote inteiro para manter tudo alinhado.
