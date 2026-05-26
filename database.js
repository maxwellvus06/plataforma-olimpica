// Banco de Dados Centralizado - Plataforma Olímpica 2026
const DATABASE = {
    // Lista de Credenciais Oficiais e Escopo de Permissões
    usuarios: [
        { login: "admin", senha: "123", nivel: "ADM", nome: "Administrador Master" },
        { login: "coordenador", senha: "456", nivel: "Coordenador Municipal", nome: "Coord. São Braz - PI" },
        { login: "escola", senha: "789", nivel: "Escola", nome: "Unidade Escolar Polo" }
    ],

    // Mapeamento Completo das Olimpíadas Monitoradas pela Rede
    olimpiadas: [
        { id: 1, nome: "Canguru de Matemática Brasil", categoria: "MAT", series: "3º Ano EF ao 3º Ano EM" },
        { id: 2, nome: "OBMEP (Olimpíada Brasileira de Matemática das Escolas Públicas)", categoria: "MAT", series: "6º Ano EF ao 3º Ano EM" },
        { id: 3, nome: "Olimpíada Mandacaru de Matemática", categoria: "MAT", series: "4º Ano EF ao 3º Ano EM" },
        { id: 4, nome: "OBMF (Olimpíada Brasileira de Matemática Financeira)", categoria: "MAT", series: "Ensino Fundamental e Médio" },
        { id: 5, nome: "OBF (Olimpíada Brasileira de Física)", categoria: "CIÊ", series: "9º Ano EF ao 3º Ano EM" },
        { id: 6, nome: "ONC (Olimpíada Nacional de Ciências)", categoria: "CIÊ", series: "6º Ano EF ao 3º Ano EM" },
        { id: 7, nome: "OBQJr (Olimpíada Brasileira de Química Júnior)", categoria: "CIÊ", series: "6º ao 9º Ano EF" },
        { id: 8, nome: "OBA (Olimpíada Brasileira de Astronomia e Astronáutica)", categoria: "HUM", series: "1º Ano EF ao 3º Ano EM" },
        { id: 9, nome: "ONAD (Olimpíada Nacional de Astronomia Digital)", categoria: "HUM", series: "Ensino Fundamental e Médio" },
        { id: 10, nome: "OBGP (Olimpíada Brasileira de Geopolítica)", categoria: "HUM", series: "Nível 1 e Nível 2" }
    ],

    // Cronograma Cronológico de Atividades e Prazos Críticos de 2026
    calendario: [
        { olimpiada: "Canguru de Matemática", etapa: "Fase Única Nacional", data: "19/03 a 25/03/2026", segmento: "3º EF ao 3º EM", acao: "Aplicação local. Enviar folhas de respostas digitais para auditoria UpMat." },
        { olimpiada: "OBGP (Geopolítica)", etapa: "Fase Única Prova", data: "01/04/2026", segmento: "Nível 1 e 2", acao: "Avaliação de repertório contemporâneo e cenários globais." },
        { olimpiada: "OBMF (Matemática Financeira)", etapa: "Fase Única Prova", data: "15/04/2026", segmento: "Todos", acao: "Aplicação nacional focando em tomadas de decisões econômicas básicas." },
        { olimpiada: "Olimpíada Mandacaru", etapa: "Prazo Final Inscrições", data: "10/05/2026", segmento: "4º EF ao 3º EM", acao: "Data limite e improrrogável para inclusão de colégios no sistema." },
        { olimpiada: "OBA (Astronomia)", etapa: "Fase Única Presencial", data: "15/05/2026", segmento: "1º EF ao 3º EM", acao: "Prova nacional (10 questões). Nota >= 9,0 no Nível 3 gera pré-convite internacional." },
        { olimpiada: "Olimpíada Mandacaru", etapa: "Aplicação Regular", data: "21/05 e 22/05/2026", segmento: "4º EF ao 3º EM", acao: "Provas de 3h de duração. Sigilo total de gabarito exigido até 17/06." },
        { olimpiada: "OBMEP", etapa: "Fase 1 (Escolar)", data: "09/06/2026", segmento: "6º EF ao 3º EM", acao: "Prova objetiva (20 questões). Digitalizar cartões via App IMPA imediatamente." },
        { olimpiada: "OBF (Física)", etapa: "Fase 1 (Objetiva)", data: "12/06/2026", segmento: "9º EF ao 3º EM", acao: "Aplicação na escola. Lançamento de notas no portal oficial da SBF." },
        { olimpiada: "OBMEP", etapa: "Janela de Contestações", data: "03/08 a 14/08/2026", segmento: "Classificados", acao: "Divulgação dos aprovados da Fase 1 e prazo para vincular professores." },
        { olimpiada: "ONC (Ciências)", etapa: "Fase 1 (Online)", data: "13/08 a 15/08/2026", segmento: "6º EF ao 3º EM", acao: "Exame digital unificado cobrando Biologia, Química, Física e Astronomia." },
        { olimpiada: "OBMEP", etapa: "Fase 2 (Regional)", data: "10/11/2026", segmento: "Classificados", acao: "Exame discursivo aplicado em centros regionais polo organizados pelo IMPA." }
    ],

    // Registros Iniciais Simulados de Premiações
    premiados: [
        { aluno: "Carlos Eduardo Silva", escola: "U. E. São Braz", municipio: "São Braz - PI", olimpiada: "Canguru de Matemática Brasil", premio: "Ouro" },
        { aluno: "Ana Beatriz Rocha", escola: "U. E. São Braz", municipio: "São Braz - PI", olimpiada: "OBMEP", premio: "Prata" },
        { aluno: "Marcos Vinícius Sousa", escola: "C. M. Governador Alberto Silva", municipio: "São Braz - PI", olimpiada: "Olimpíada Mandacaru de Matemática", premio: "Bronze" },
        { aluno: "Mariana Costa Alves", escola: "U. E. São Braz", municipio: "São Braz - PI", olimpiada: "OBA (Olimpíada Brasileira de Astronomia)", premio: "Menção Honrosa" },
        { aluno: "Lucas Gabriel Ferreira", escola: "C. M. Governador Alberto Silva", municipio: "São Braz - PI", olimpiada: "ONC (Olimpíada Nacional de Ciências)", premio: "Ouro" }
    ]
};