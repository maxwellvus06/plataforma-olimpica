/* app.js - Inteligência de Negócio e Processamento */
let bancoDeDados = [];
let chartInstance = null;

// Lote inicial com base nos resultados reais de São Braz - PI
function gerarLoteInicial() {
    for (let i = 0; i < 6; i++) bancoDeDados.push({ aluno: "Aluno Destaque", escola: "Escola Polo", municipio: "São Braz - PI", olimpiada: "Olimpíada Canguru de Matemática", premio: "Ouro" });
    for (let i = 0; i < 20; i++) bancoDeDados.push({ aluno: "Aluno Destaque", escola: "Escola Polo", municipio: "São Braz - PI", olimpiada: "Olimpíada Canguru de Matemática", premio: "Prata" });
    for (let i = 0; i < 39; i++) bancoDeDados.push({ aluno: "Aluno Destaque", escola: "Escola Polo", municipio: "São Braz - PI", olimpiada: "OLIMPÍADA BRASILEIRA DO SABER", premio: "Bronze" });
    for (let i = 0; i < 36; i++) bancoDeDados.push({ aluno: "Aluno Destaque", escola: "Escola Polo", municipio: "São Braz - PI", olimpiada: "Olimpíada Brasileira de Matemática Financeira", premio: "Menção Honrosa" });
}

function atualizarDashboard() {
    const oSel = document.getElementById("filtro-olimpiada").value;
    const mSel = document.getElementById("filtro-municipio").value;

    let filtrados = bancoDeDados.filter(item => {
        return (mSel === "todos" || item.municipio === mSel) && (oSel === "todas" || item.olimpiada === oSel);
    });

    let o = 0, p = 0, b = 0, m = 0;
    filtrados.forEach(item => {
        if (item.premio === "Ouro") o++;
        else if (item.premio === "Prata") p++;
        else if (item.premio === "Bronze") b++;
        else if (item.premio === "Menção Honrosa") m++;
    });

    document.getElementById("card-ouro").innerText = o;
    document.getElementById("card-prata").innerText = p;
    document.getElementById("card-bronze").innerText = b;
    document.getElementById("card-mencao").innerText = m;
    document.getElementById("card-total").innerText = o + p + b + m;
    document.getElementById("card-medalhas").innerText = o + p + b;

    renderizarGraficoReal(o, p, b);
    renderizarTabelaFeed(filtrados);
}

function renderizarGraficoReal(ouro, prata, bronze) {
    const ctx = document.getElementById('chartReal').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['🥇 Ouro', '🥈 Prata', '🥉 Bronze'],
            datasets: [{
                label: 'Quantidade de Medalhas',
                data: [ouro, prata, bronze],
                backgroundColor: ['#eab308', '#94a3b8', '#ea580c']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderizarTabelaFeed(lista) {
    let html = "";
    lista.slice(-5).reverse().forEach(item => {
        html += `<tr><td><b>${item.aluno}</b><br><small>${item.escola}</small></td><td>${item.olimpiada}</td><td>${item.premio}</td></tr>`;
    });
    document.getElementById("tabela-feed").innerHTML = html || "<tr><td colspan='3'>Nenhum registro lançado.</td></tr>";
}

function carregarCalendarioCompleto() {
    let html = "";
    CALENDAR_DATA.forEach(oly => {
        html += `<tr>
            <td><span class="badge bg-${oly.cat.toLowerCase()}">${oly.cat}</span> <b>${oly.nome}</b></td>
            <td>${oly.target}</td>
            <td style='text-align:center; font-weight:bold;'>${oly.data}</td>
            <td style='text-align:center;'><a href='${oly.site}' target='_blank'>Acessar Site</a></td>
        </tr>`;
    });
    document.getElementById("tabela-calendario-completo").innerHTML = html;
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    event.target.classList.add('active');
}

function processarCSV(event) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let linhas = e.target.result.split("\n");
        for (let i = 1; i < linhas.length; i++) {
            let col = linhas[i].split(",");
            if (col.length >= 5) {
                bancoDeDados.push({ aluno: col[0].trim(), escola: col[1].trim(), municipio: col[2].trim(), olimpiada: col[3].trim(), premio: col[4].trim() });
            }
        }
        alert("✓ Planilha importada com sucesso!");
        atualizarDashboard();
        switchTab('dashboard');
    };
    reader.readAsText(file);
}

window.onload = function() {
    gerarLoteInicial();
    carregarCalendarioCompleto();
    atualizarDashboard();
};