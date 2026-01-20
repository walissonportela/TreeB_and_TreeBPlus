// ==================================================================
// VARIAVEIS GLOBAIS
// ==================================================================
let arvoreAtual = null;
let tipoAtual = '';
let network = null;
let nodes = null;
let edges = null;
let notation = null; 

// ==================================================================
// INICIALIZAÇÃO
// ==================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa Vis.js
    if (typeof vis === 'undefined') { alert('ERRO: Vis.js não carregou.'); return; }
    
    // Verifica se RoughNotation carregou
    if (typeof RoughNotation === 'undefined') { console.warn('Aviso: RoughNotation não carregou (efeitos visuais desligados).'); }

    nodes = new vis.DataSet([]);
    edges = new vis.DataSet([]);
    const container = document.getElementById('mynetwork');
    if (container) network = new vis.Network(container, { nodes, edges }, options);
    
    // Configura o slider de velocidade
    const speedRange = document.getElementById('speedRange');
});

const options = {
    layout: {
        hierarchical: {
            direction: "UD", 
            sortMethod: "directed", 
            levelSeparation: 80, 
            nodeSpacing: 120
        }
    },
    physics: false,
    nodes: {
        shape: 'box', 
        margin: 10, 
        borderWidth: 2,
        shadow: false,
        font: { size: 18, face: 'Patrick Hand', color: '#000' },
        color: { background: '#ffffff', border: '#41403e', highlight: { background: '#fff3cd', border: '#000' }}
    },
    edges: {
        color: '#41403e', 
        width: 1, 
        smooth: { type: 'discrete', forceDirection: 'vertical', roundness: 0 },
        arrows: { to: { enabled: true, scaleFactor: 0.5 } }
    },
    interaction: { dragNodes: false, zoomView: true, dragView: true, hover: false }
};

// ==================================================================
// FUNÇÕES DE CONTROLE (Globais)
// ==================================================================
window.selecionarArvore = function(tipo) {
    tipoAtual = tipo;
    
    // Validação extra para garantir que as classes carregaram
    if (tipo === 'B' && typeof ArvoreB === 'undefined') { alert('Erro: treeB.js não foi carregado.'); return; }
    if (tipo === 'B+' && typeof ArvoreBPlus === 'undefined') { alert('Erro: treeBPlus.js não foi carregado.'); return; }

    document.getElementById('selection-screen').classList.add('hidden');
    document.getElementById('simulation-screen').classList.remove('hidden');
    document.getElementById('titulo-arvore').innerHTML = `Simulação: <span style="color: #41403e; text-decoration: underline;">Árvore ${tipo}</span>`;
    
    reiniciarArvore();
}

window.voltarSelecao = function() {
    document.getElementById('selection-screen').classList.remove('hidden');
    document.getElementById('simulation-screen').classList.add('hidden');
    arvoreAtual = null;
    if(nodes) nodes.clear();
    resetStats();
}

window.reiniciarArvore = function() {
    const grauInput = document.getElementById('fanout');
    let grau = parseInt(grauInput.value);
    if (isNaN(grau) || grau < 3) { alert('Fanout mínimo é 3.'); grau = 3; grauInput.value = 3; }
    
    try {
        arvoreAtual = (tipoAtual === 'B') ? new ArvoreB(grau) : new ArvoreBPlus(grau);
        log(`Árvore ${tipoAtual} (Fanout ${grau}) iniciada.`);
    } catch (e) {
        alert('Erro ao criar árvore: ' + e.message);
    }
    
    resetStats();
    desenhar();
}

window.inserir = async function() {
    if (!arvoreAtual) return;
    const val = parseInt(document.getElementById('valorInput').value);
    if (isNaN(val)) { alert('Digite um número.'); return; }

    bloquearBotoes(true);
    try {
        await arvoreAtual.inserir(val, true);
    } catch (e) {
        console.error(e);
    }
    bloquearBotoes(false);
    
    document.getElementById('valorInput').value = "";
    document.getElementById('valorInput').focus();
    atualizarStats();
}

window.remover = async function() {
    if (!arvoreAtual) return;
    const val = parseInt(document.getElementById('valorInput').value);
    if (isNaN(val)) return;

    bloquearBotoes(true);
    await arvoreAtual.remover(val);
    bloquearBotoes(false);
    
    document.getElementById('valorInput').value = "";
    atualizarStats();
}

window.buscar = async function() {
    if (!arvoreAtual) return;
    const val = parseInt(document.getElementById('valorInput').value);
    if (isNaN(val)) return;

    bloquearBotoes(true);
    let achou = await arvoreAtual.buscar(val);
    bloquearBotoes(false);

    if (achou) await log(`Valor ${val} ENCONTRADO!`, null, 'success');
    else await log(`Valor ${val} NÃO encontrado.`, null, 'error');
}

window.gerarAleatorio = async function() {
    if (!arvoreAtual) return;
    const qtd = parseInt(document.getElementById('qtdAleatorio').value);
    if (!qtd || qtd <= 0) return;

    bloquearBotoes(true);
    const logOriginal = window.log;
    window.log = async () => {}; // Silencia log visual temporariamente

    for(let i=0; i<qtd; i++) {
        let val = Math.floor(Math.random() * 200);
        // Tenta inserir apenas se não existir (para evitar alertas de erro em loop)
        if(!(await arvoreAtual.buscar(val))) {
             await arvoreAtual.inserir(val, false);
        }
    }
    
    window.log = logOriginal;
    desenhar();
    atualizarStats();
    bloquearBotoes(false);
    log(`Lote de ${qtd} processado.`);
}

// ==================================================================
// UTILITÁRIOS & ROUGH NOTATION
// ==================================================================

const sleep = (ms) => {
    const slider = document.getElementById('speedRange');
    const delay = slider ? (1000 - slider.value) : ms;
    if (delay <= 10) return Promise.resolve();
    return new Promise(r => setTimeout(r, delay));
};

// Log com efeito de marcação Rough
window.log = async function(msg, highlightId = null, type = 'info') {
    const st = document.getElementById('status-text');
    if (st) {
        st.innerText = msg;
        
        // Remove anotação anterior se existir
        if (notation) notation.remove();
        
        // Se a biblioteca RoughNotation carregou, usa ela
        if (typeof RoughNotation !== 'undefined') {
            let color = '#f1c40f'; // Amarelo padrão
            if (type === 'error') color = '#e74c3c'; // Vermelho
            if (type === 'success') color = '#2ecc71'; // Verde

            // UMA MUDANÇA IMPORTANTE AQUI: RoughNotation.annotate
            notation = RoughNotation.annotate(st, { type: 'highlight', color: color, padding: 5 });
            notation.show();
        }
    }
    
    const slider = document.getElementById('speedRange');
    const isTurbo = slider && slider.value > 950;

    if (!isTurbo) {
        desenhar(highlightId);
        await sleep(700);
    }
}

function atualizarStats() {
    if(arvoreAtual && arvoreAtual.stats) {
        document.getElementById('read-count').innerText = arvoreAtual.stats.reads;
        document.getElementById('write-count').innerText = arvoreAtual.stats.writes;
    }
}

function resetStats() {
    if(arvoreAtual) arvoreAtual.stats = { reads: 0, writes: 0 };
    atualizarStats();
    document.getElementById('timer-display').innerText = "0ms";
}

function desenhar(highlightId = null) {
    if (!network || !arvoreAtual || !arvoreAtual.raiz) {
        if(nodes) nodes.clear(); if(edges) edges.clear(); return;
    }

    let data;
    try {
        data = arvoreAtual.gerarDadosVisuais(); 
    } catch(e) { console.error("Erro ao gerar dados visuais:", e); return; }
    
    if(highlightId) {
        const target = data.nodes.find(n => n.id === highlightId);
        if(target) {
            target.color = { background: '#fff3cd', border: '#e67e22' };
            target.borderWidth = 3;
        }
    }

    nodes.clear(); 
    edges.clear();
    nodes.add(data.nodes); 
    edges.add(data.edges);
    
    // Fit somente se for pequeno para não ficar pulando
    if (data.nodes.length < 15) network.fit();
}

function bloquearBotoes(b) {
    document.querySelectorAll('button').forEach(btn => btn.disabled = b);
}