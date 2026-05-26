// Banco de Dados Centralizado - Plataforma Olímpica 2026
const DATABASE = {
    // Lista de Credenciais Oficiais e Escopo de Permissões (4 Níveis Solicitados)
    usuarios: [
        { login: "admin", senha: "123", nivel: "Adm", nome: "Administrador Master", cidade: "Todas", escola: "Todas" },
        { login: "gestor", senha: "456", nivel: "Gestor", nome: "Gestor Municipal", cidade: "São Braz - PI", escola: "Todas" },
        { login: "escola", senha: "789", nivel: "Escola", nome: "U. E. Polo Municipal", cidade: "São Braz - PI", escola: "U. E. São Braz" },
        { login: "aluno", senha: "111", nivel: "Aluno", nome: "Carlos Eduardo Silva", cidade: "São Braz - PI", escola: "U. E. São Braz" }
    ],

    // Mapeamento das Olimpíadas Monitoradas pela Rede
    olimpiadas: [
        { id: 1, nome: "Canguru de Matemática Brasil", categoria: "MAT", series: "3º Ano EF ao 3º Ano EM" },
        { id: 2, nome: "OBMEP (Olimpíada Brasileira de Matemática das Escolas Públicas)", categoria: "MAT", series: "6º Ano EF ao 3º Ano EM" },
        { id: 3, nome: "Olimpíada Mandacaru de Matemática", categoria: "MAT", series: "4º Ano EF ao 3º Ano EM" },
        { id: 4, nome: "OBMF (Olimpíada Brasileira de Matemática Financeira)", categoria: "MAT", series: "Ensino Fundamental e Médio" },
        { id: 5, nome: "OBF (Olimpíada Brasileira de Física)", categoria: "CIÊ", series: "9º Ano EF ao 3º Ano EM" },
        { id: 6, nome: "ONC (Olimpíada Nacional de Ciências)", categoria: "CIÊ", series: "6º Ano EF ao 3º Ano EM" },
        { id: 7, nome: "OBA (Olimpíada Brasileira de Astronomia e Astronáutica)", categoria: "HUM", series: "1º Ano EF ao 3º Ano EM" }
    ],

    // Cronograma Cronológico de Atividades e Prazos Críticos de 2026
    calendario: [
        { olimpiada: "Canguru de Matemática", etapa: "Fase Única Nacional", data: "19/03 a 25/03/2026", segmento: "3º EF ao 3º EM", acao: "Aplicação local. Enviar folhas de respostas digitais." },
        { olimpiada: "OBA (Astronomia)", etapa: "Fase Única Presencial", data: "15/05/2026", segmento: "1º EF ao 3º EM", acao: "Prova nacional na escola (10 questões)." },
        { olimpiada: "Olimpíada Mandacaru", etapa: "Aplicação Regular", data: "21/05 e 22/05/2026", segmento: "4º EF ao 3º EM", acao: "Provas de 3h de duração. Sigilo total de gabarito." },
        { olimpiada: "OBMEP", etapa: "Fase 1 (Escolar)", data: "09/06/2026", segmento: "6º EF ao 3º EM", acao: "Prova objetiva de 20 questões." }
    ],

    // Registros de Notas e Conquistas dos Alunos
    premiados: [
        { aluno: "Carlos Eduardo Silva", escola: "U. E. São Braz", municipio: "São Braz - PI", olimpiada: "Canguru de Matemática Brasil", premio: "Ouro" },
        { aluno: "Ana Beatriz Rocha", escola: "U. E. São Braz", municipio: "São Braz - PI", olimpiada: "OBMEP", premio: "Prata" },
        { aluno: "Marcos Vinícius Sousa", escola: "C. M. Alberto Silva", municipio: "São Braz - PI", olimpiada: "Olimpíada Mandacaru de Matemática", premio: "Bronze" },
        { aluno: "Mariana Costa Alves", escola: "U. E. São Braz", municipio: "São Braz - PI", olimpiada: "OBA (Olimpíada Brasileira de Astronomia)", premio: "Menção Honrosa" }
    ]
};