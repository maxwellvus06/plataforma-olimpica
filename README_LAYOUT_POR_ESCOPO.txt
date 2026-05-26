EDITOR DE LAYOUT POR ESCOPO

O módulo ADM de layout agora permite criar regras visuais por escopo.

Precedência aplicada automaticamente:
1. Usuário específico
2. Escola
3. Cidade
4. Nível de acesso
5. Layout global

Coleção usada no Firestore:
sistema_layout

Documentos principais:
- global
- nivel_ADM, nivel_Gestor, nivel_Escola, nivel_Aluno, nivel_Monitor
- cidade_<id>
- escola_<id>
- usuario_<id>

Como usar:
1. Entre como ADM.
2. Abra Editor de Layout.
3. Em "Escopo do layout", escolha se quer aplicar para todos, nível, cidade, escola ou usuário.
4. Escolha o alvo.
5. Configure cores, nomes, logo e banner.
6. Clique em Salvar layout.

Observação:
O layout global continua existindo. Regras específicas só sobrescrevem o global para o alvo selecionado.
