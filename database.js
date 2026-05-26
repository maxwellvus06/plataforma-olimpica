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
        { id: 6, nome: "OBQJr (Olimpíada Brasileira de Química Júnior)", categoria: "CIÊ", series: "6º Ano EF ao 9º Ano EM" },
        { id: 7, nome: "OBA (Olimpíada Brasileira de Astronomia e Astronáutica)", categoria: "AST", series: "1º Ano EF ao 3º Ano EM" },
        { id: 8, nome: "ONC (Olimpíada Nacional de Ciências)", categoria: "INTEG", series: "6º Ano EF ao 3º Ano EM" }
    ],

    // Cronograma Consolidado de Eventos Críticos
    cronograma: [
        { olimpiada: "Canguru de Matemática", etapa: "Aplicação Oficial", data: "16/03 a 22/03/2026", segmento: "Todos os Níveis", acao: "Realização das provas objetivas em ambiente presencial controlado." },
        { olimpiada: "OBA (Astronomia)", etapa: "Exame Fase Única", data: "15/05/2026", segmento: "Todos os Níveis", acao: "Aplicação da prova nacional única nas escolas cadastradas." },
        { olimpiada: "OBMEP", etapa: "Fase 1 (Objetiva)", data: "02/06/2026", segmento: "6º EF ao 3º EM", acao: "Aplicação e correção interna dos cartões-resposta das 20 questões." },
        { olimpiada: "OBMEP", etapa: "Janela de Contestações", data: "03/08 a 14/08/2026", segmento: "Classificados", acao: "Divulgação dos aprovados da Fase 1 e prazo para vincular professores." },
        { olimpiada: "ONC (Ciências)", etapa: "Fase 1 (Online)", data: "13/08 a 15/08/2026", segmento: "6º EF ao 3º EM", acao: "Exame digital unificado cobrando Biologia, Química, Física e Astronomia." },
        { olimpiada: "OBMEP", etapa: "Fase 2 (Regional)", data: "10/11/2026", segmento: "Classificados", acao: "Exame discursivo aplicado em centros regionais polo organizados pelo IMPA." }
    ],

    // Registros Iniciais Simulados de Premiações
    premiados: [
        { aluno: "Carlos Eduardo Silva", escola: "U. E. São Braz", municipio: "São Braz - PI", olimpiada: "Canguru de Matemática Brasil", premio: "Ouro" },
        { aluno: "Ana Beatriz Rocha", escola: "U. E. São Braz", municipio: "São Braz - PI", olimpiada: "OBMEP", premio: "Prata" },
        { aluno: "Marcos Vinícius Sousa", escola: "C. M. Governador Alberto Silva", municipio: "São Braz - PI", olimpiada: "Olimpíada Mandacaru de Matemática", premio: "Bronze" },
        { aluno: "Juliana Mendes Costa", escola: "U. E. São Braz", municipio: "São Braz - PI", olimpiada: "ONC (Olimpíada Nacional de Ciências)", premio: "Menção Honrosa" }
    ]
};

// Valores padrão de inicialização segura para manter a nova regra de negócio das Cidades/Escolas
const CONFIG_CIDADES_INICIAIS = [
    { id: "1", nome: "São Braz", sigla: "SBZ", uf: "PI" }
];

const CONFIG_ESCOLAS_INICIAIS = [
    { id: "1", nome: "U. E. São Braz", razaoSocial: "Unidade Escolar São Braz LTDA", cnpj: "12.345.678/0001-99", inep: "2201923", endereco: "Rua Central, 100", cep: "64.758-000", diretor: "Prof. Antônio Silva", email: "polo@saobraz.pi.gov.br", cidadeId: "1" },
    { id: "2", nome: "C. M. Governador Alberto Silva", razaoSocial: "Colégio Municipal Alberto Silva S/A", cnpj: "98.765.432/0001-11", inep: "2204561", endereco: "Av. Principal, s/n", cep: "64.758-050", diretor: "Profa. Maria Mendes", email: "albertosilva@saobraz.pi.gov.br", cidadeId: "1" }
];

if (!localStorage.getItem("app_cidades")) {
    localStorage.setItem("app_cidades", JSON.stringify(CONFIG_CIDADES_INICIAIS));
}
if (!localStorage.getItem("app_escolas")) {
    localStorage.setItem("app_escolas", JSON.stringify(CONFIG_ESCOLAS_INICIAIS));
}