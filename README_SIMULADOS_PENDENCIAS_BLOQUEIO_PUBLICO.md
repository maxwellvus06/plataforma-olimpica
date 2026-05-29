# Ajuste — Simulados

## O que este pacote corrige

1. Aluno logado agora recebe aviso interno quando tenta finalizar sem responder tudo.
2. O aviso considera objetivas e dissertativas por questão.
3. As respostas dissertativas por questão continuam sendo salvas no envio.
4. Link público ganha bloqueio persistente por e-mail + WhatsApp.
5. Mesmo em aba anônima, se o candidato usar o mesmo e-mail/WhatsApp, o sistema bloqueia nova tentativa.

## Limitação honesta

Não existe como um site comum identificar 100% o mesmo aparelho depois que a pessoa fecha uma janela anônima, porque o navegador apaga localStorage/cookies. O contorno aplicado foi bloquear por e-mail + WhatsApp no Firestore, além do bloqueio local do dispositivo.

Se o candidato usar outro e-mail e outro WhatsApp, tecnicamente ainda consegue tentar burlar. Para fechar mais, o próximo passo seria pedir CPF também no simulado público.

## Regras do Firestore

Este pacote inclui `firestore.rules` novo porque foi criada a coleção:

`anos/{ano}/sistema_simulados_tentativas_publicas`

Ela serve apenas para registrar tentativa pública e bloquear repetição. Ela não permite listagem pública.
