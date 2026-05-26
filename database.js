// database.js - Banco de Dados Unificado de Olimpíadas e Governança 2026

// Cadastro Geral de Usuários e Níveis de Permissão
const USERS_DB = {
    "admin": { senha: "123", role: "ADM", nome: "Administrador Geral", escopo: "Total" },
    "coordenador": { senha: "456", role: "Coordenador Municipal", nome: "Coord. São Braz - PI", escopo: "São Braz - PI" },
    "escola": { senha: "789", role: "Escola", nome: "U.E. Polo Municipal", escopo: "U.E. Polo Municipal" }
};

// Cadastro Geral das 45 Olimpíadas e seus Canais Estratégicos 2026
const OLYMPIADS_DB = [
    { id: "opm", nome: "Olimpíada Piauiense de Matemática", target: "6º Ano EF a 3ª Série EM", data: "Setembro/Outubro", site: "http://www.ufpi.br", insta: "@opm_piaui", cat: "MAT" },
    { id: "tm2", nome: "TM²", target: "6º Ano EF a 3ª Série EM", data: "16/10", site: "https://www.tm2.org.br", insta: "@torneio_matematica", cat: "MAT" },
    { id: "one", nome: "Olimpíada Nacional de Energia", target: "6º Ano EF a 3ª Série EM", data: "14/09 a 18/09", site: "https://www.onenergia.org", insta: "@onenergia", cat: "MULTI" },
    { id: "vitalis", nome: "VITALIS: Olimpíada de Medicina", target: "6º Ano EF a 3ª Série EM", data: "Novembro/2026", site: "https://olimpiadavitalis.com.br", insta: "@olimpiadavitalis", cat: "BIO" },
    { id: "opq", nome: "Olimpíada Piauiense de Química - OPQ", target: "9º Ano EF a 3ª Série EM", data: "Setembro", site: "http://piaui.obquimica.org", insta: "@opq_piaui", cat: "QUIM" },
    { id: "obqjr", nome: "Olimpíada Brasileira de Química Jr.", target: "6º Ano EF a 9º Ano EF", data: "03/06 a 21/08", site: "http://obquimica.org", insta: "@obq_oficial", cat: "QUIM" },
    { id: "onneq", nome: "Olimpíada Norte Nordeste de Química", target: "1ª Série EM a 3ª Série EM", data: "29/05", site: "http://obquimica.org", insta: "@obq_oficial", cat: "QUIM" },
    { id: "tvq", nome: "Torneio Virtual de Química", target: "9º Ano EF a 3ª Série EM", data: "18/05 a 11/10", site: "https://tvq.com.br", insta: "@tvq_unicamp", cat: "QUIM" },
    { id: "camaleao", nome: "Olimpíada Camaleão de Química", target: "1ª Série EM a 3ª Série EM", data: "Pendente", site: "http://obquimica.org", insta: "@obq_oficial", cat: "QUIM" },
    { id: "tnf", nome: "Torneio Nacional de Física", target: "8º Ano EF a 3ª Série EM", data: "Pendente", site: "http://fisica.org.br", insta: "@sbf_fisica", cat: "FIS" },
    { id: "quimeninas", nome: "Química Para Meninas", target: "9º Ano EF a 3ª Série EM", data: "18/09", site: "http://obquimica.org", insta: "@obq_oficial", cat: "QUIM" },
    { id: "oim_conhec", nome: "Olimpíada Inter. de Mat. e do Conhecimento", target: "4º Ano EF a 3ª Série EM", data: "Pendente", site: "https://oimconhecimento.com", insta: "@oim_conhecimento", cat: "MULTI" },
    { id: "ovf", nome: "Olimpíada Virtual de Física", target: "4º Ano EF a 3ª Série EM", data: "Pendente", site: "http://fisica.org.br", insta: "@ovf_oficial", cat: "FIS" },
    { id: "iypt", nome: "IYPT BR", target: "6º Ano EF a 9º Ano EF", data: "Pendente", site: "https://iypt.com.br", insta: "@iyptbr", cat: "FIS" },
    { id: "obecon", nome: "OBECON (Economia)", target: "9º Ano EF a 3ª Série EM", data: "04/05 a 02/08", site: "https://obecon.org", insta: "@obecon_oficial", cat: "MULTI" },
    { id: "obsat", nome: "OBSAT TEÓRICA", target: "6º Ano a 3ª Série Médio", data: "Pendente", site: "https://obsat.com.br", insta: "@obsat_br", cat: "MULTI" },
    { id: "jacob", nome: "Olimpíada Jacob Palis Jr", target: "6º Ano EF a 3ª Série EM", data: "29/05", site: "http://obm.org.br", insta: "@obm_oficial", cat: "MAT" },
    { id: "obf", nome: "Olimpíada Brasileira de Física", target: "6º Ano EF a 3ª Série EM", data: "12/06 a 07/10", site: "http://fisica.org.br/olimpiada", insta: "@sbf_fisica", cat: "FIS" },
    { id: "onee", nome: "Olimpíada Nacional de Eficiência Energética", target: "6º Ano EF a 9º Ano EF", data: "Pendente", site: "https://onee.org.br", insta: "@onee.oficial", cat: "MULTI" },
    { id: "dna", nome: "Desafio Nacional Acadêmico", target: "6º Ano EF a 3ª Série EM", data: "23/05 e 24/05", site: "https://theolymp.com/dna", insta: "@dna_desafio", cat: "MULTI" },
    { id: "obr", nome: "Olimpíada Brasileira de Robótica", target: "6º Ano EF a 3ª Série EM", data: "08/06 a 13/08", site: "http://www.obr.org.br", insta: "@obr_oficial", cat: "MULTI" },
    { id: "mirim", nome: "OBMEP MIRIM", target: "2º Ano EF a 5º Ano EF", data: "25/08 e 10/11", site: "http://obmep.org.br", insta: "@obmep_oficial", cat: "MAT" },
    { id: "obad", nome: "Olimpíada Brasileira de Astronomia Digital", target: "1º Ano EF a 3ª Série EM", data: "06/04 a 22/06", site: "https://onad.com.br", insta: "@onad_digital", cat: "ASTRO" },
    { id: "itabirana", nome: "Olimpíada Itabirana de Matemática", target: "6º Ano EF a 3ª Série EM", data: "14/06 a 19/06", site: "https://oim.org.br", insta: "@oim_itabirana", cat: "MAT" },
    { id: "canguru", nome: "Olimpíada Canguru de Matemática", target: "3º Ano EF a 3ª Série EM", data: "19/03 a 25/03", site: "http://cangurudematematicabrasil.com.br", insta: "@cangurubrasil", cat: "MAT" },
    { id: "obmep", nome: "OBMEP (Públicas e Privadas)", target: "6º Ano EF a 3ª Série EM", data: "09/06", site: "http://obmep.org.br", insta: "@obmep_oficial", cat: "MAT" },
    { id: "msf", nome: "Olimpíada Matemática Sem Fronteiras", target: "4º Ano EF a 3ª Série EM", data: "19/05 a 26/05", site: "https://matematicasemfronteiras.org", insta: "@msf_brasil", cat: "MAT" },
    { id: "mandacaru", nome: "Olimpíada Mandacaru", target: "4º Ano EF a 3ª Série EM", data: "21/05 e 22/05", site: "http://olimpiadamandacaru.com.br", insta: "@olimpiadamandacaru", cat: "MAT" },
    { id: "oba", nome: "Olimpíada Brasileira de Astronomia-OBA", target: "1º Ano EF a 3ª Série EM", data: "15/05", site: "http://site.oba.org.br", insta: "@oba_oficial", cat: "ASTRO" },
    { id: "obb", nome: "Olimpíada Brasileira de Biologia", target: "1ª Série EM a 3ª Série EM", data: "03/03 a 18/03", site: "http://olimpiadasdebiologia.butantan.gov.br", insta: "@obb_butantan", cat: "BIO" },
    { id: "obc", nome: "Olimpíada Brasileira de Ciências", target: "6º Ano EF a 3ª Série EM", data: "08/05 a 27/06", site: "http://obciencias.com.br", insta: "@obc_ijso", cat: "MULTI" },
    { id: "tbc", nome: "Torneio Brasileiro de Ciências", target: "4º Ano EF a 3ª Série EM", data: "02/09", site: "http://seletaeducacao.com.br/tbc", insta: "@seleta.educacao", cat: "MULTI" },
    { id: "tbb", nome: "Torneio Brasileiro de Biologia", target: "6º Ano EF a 3ª Série EM", data: "20/05", site: "http://seletaeducacao.com.br/tnbio", insta: "@seleta.educacao", cat: "BIO" },
    { id: "obgp", nome: "Olimpíada Brasileira de Geopolítica", target: "6º Ano EF a 3ª Série EM", data: "01/04", site: "https://seletaeducacao.com.br/obgp", insta: "@seleta.educacao", cat: "MULTI" },
    { id: "obi", nome: "Olimpíada Brasileira de Inglês", target: "4º Ano EF a 3ª Série EM", data: "06/05", site: "https://obli.org", insta: "@obli_oficial", cat: "MULTI" },
    { id: "obmf", nome: "Olimpíada Brasileira de Matemática Financeira", target: "4º Ano EF a 3ª Série EM", data: "15/04", site: "https://obmf.org", insta: "@obmf_oficial", cat: "MAT" },
    { id: "obsaber", nome: "OLIMPÍADA BRASILEIRA DO SABER", target: "8º Ano EF a 3ª Série EM", data: "16 e 17/03", site: "https://olimpiadadosaber.com.br", insta: "@obsaber", cat: "MULTI" },
    { id: "portugues", nome: "OLIMPÍADA DE PORTUGUÊS", target: "6º Ano EF a 3ª Série EM", data: "21/05 a 23/05", site: "https://olimpiadadeportugues.org", insta: "@olimpiadadeportugues", cat: "MULTI" },
    { id: "literatura", nome: "OLIMPÍADA DE LITERATURA", target: "LIVRE", data: "06/05 a 14/05", site: "https://olimpiadadeliteratura.org", insta: "@oliteratura", cat: "MULTI" },
    { id: "obrl", nome: "Olimpíada Brasileira de Raciocínio Lógico", target: "4º Ano EF a 3ª Série EM", data: "24/08 a 10/10", site: "https://obrl.com.br", insta: "@obrl_oficial", cat: "MAT" },
    { id: "onc", nome: "Olimpíada Nacional Ciências", target: "6º Ano EF a 3ª Série EM", data: "13/08 a 15/08", site: "http://onciencias.org", insta: "@onciencias", cat: "MULTI" },
    { id: "onhb", nome: "Olimpíada Nacional em História do Brasil", target: "8º Ano EF a 3ª Série EM", data: "09/05 a 13/06", site: "https://olimpiadadehistoria.com.br", insta: "@onhb_oficial", cat: "MULTI" },
    { id: "obbiotec", nome: "Olimpíada Brasileira de Biotecnologia", target: "8º Ano EF a 3ª Série EM", data: "04/05 a 08/05", site: "http://obbiotec.com.br", insta: "@obbiotec", cat: "BIO" },
    { id: "obg", nome: "Olimpíada Brasileira de Geografia-OBG", target: "9º Ano EF a 3ª Série EM", data: "04/08 a 19/08", site: "https://olimpiadadegeografia.com.br", insta: "@obg_brasil", cat: "MULTI" },
    { id: "thebing", nome: "Olimpíada THEBING CHALLENGE", target: "4º Ano EF a 3ª Série EM", data: "24/08 a 12/09", site: "https://thebingchallenge.com", insta: "@thebingchallenge", cat: "MULTI" }
];
