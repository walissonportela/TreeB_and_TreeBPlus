class No {
    constructor() {
        this.id = 'no_' + Math.random().toString(36).substr(2, 9);
        this.valores = [];
        this.filhos = [];
    }

    eh_folha() {
        return this.filhos.length === 0;
    }

    // Split baseado em Fanout (n)
    // Silberschatz: Nó cheio tem n-1 chaves. Ao inserir a n-ésima, ocorre split.
    split(fanout) {
        let meio = Math.floor(this.valores.length / 2);
        let valor_promovido = this.valores[meio];

        let novo_no = new No();
        
        // Direita recebe chaves após o meio
        novo_no.valores = this.valores.slice(meio + 1);

        if (!this.eh_folha()) {
            novo_no.filhos = this.filhos.slice(meio + 1);
        }

        // Esquerda mantém chaves antes do meio
        this.valores = this.valores.slice(0, meio);
        
        if (!this.eh_folha()) {
            this.filhos = this.filhos.slice(0, meio + 1);
        }

        return { chave: valor_promovido, novoNo: novo_no };
    }

    // ... (Métodos de remoção mantidos similares, mas atenção ao merge)
    // A lógica de remoção complexa já estava razoável, focaremos na inserção/validação
    
    // Método auxiliar para remoção (mantido do original com ajustes se necessário)
    async remover(k, fanout) {
        let idx = this.encontrar_indice(k);

        // Chave encontrada neste nó
        if (idx < this.valores.length && this.valores[idx] === k) {
            if (this.eh_folha()) {
                this.valores.splice(idx, 1);
            } else {
                await this.remover_de_nao_folha(idx, fanout);
            }
        } else {
            // Chave não está aqui
            if (this.eh_folha()) return false; // Não achou

            let filho = this.filhos[idx];
            let min_chaves = Math.ceil(fanout / 2) - 1;

            if (filho.valores.length <= min_chaves) {
                await this.preencher_filho(idx, fanout);
                if (idx > this.valores.length) {
                    await this.filhos[idx - 1].remover(k, fanout);
                } else {
                    let novoIdx = this.encontrar_indice(k);
                    if (novoIdx < this.valores.length && this.valores[novoIdx] === k) {
                         await this.remover(k, fanout);
                    } else {
                         await this.filhos[novoIdx].remover(k, fanout);
                    }
                }
            } else {
                await this.filhos[idx].remover(k, fanout);
            }
        }
        return true;
    }

    encontrar_indice(k) {
        let idx = 0;
        while (idx < this.valores.length && this.valores[idx] < k) idx++;
        return idx;
    }

    async remover_de_nao_folha(idx, fanout) {
        let k = this.valores[idx];
        let min_chaves = Math.ceil(fanout / 2) - 1;

        if (this.filhos[idx].valores.length > min_chaves) {
            let pred = this.pegar_predecessor(idx);
            this.valores[idx] = pred;
            await this.filhos[idx].remover(pred, fanout);
        } else if (this.filhos[idx + 1].valores.length > min_chaves) {
            let suc = this.pegar_sucessor(idx);
            this.valores[idx] = suc;
            await this.filhos[idx + 1].remover(suc, fanout);
        } else {
            await this.mesclar(idx);
            await this.filhos[idx].remover(k, fanout);
        }
    }

    pegar_predecessor(idx) {
        let cur = this.filhos[idx];
        while (!cur.eh_folha()) cur = cur.filhos[cur.filhos.length - 1];
        return cur.valores[cur.valores.length - 1];
    }

    pegar_sucessor(idx) {
        let cur = this.filhos[idx + 1];
        while (!cur.eh_folha()) cur = cur.filhos[0];
        return cur.valores[0];
    }

    async preencher_filho(idx, fanout) {
        let min_chaves = Math.ceil(fanout / 2) - 1;

        if (idx !== 0 && this.filhos[idx - 1].valores.length > min_chaves) {
            this.emprestar_do_anterior(idx);
        } else if (idx !== this.filhos.length - 1 && this.filhos[idx + 1].valores.length > min_chaves) {
            this.emprestar_do_proximo(idx);
        } else {
            if (idx !== this.filhos.length - 1) {
                await this.mesclar(idx);
            } else {
                await this.mesclar(idx - 1);
            }
        }
    }

    emprestar_do_anterior(idx) {
        let filho = this.filhos[idx];
        let irmao = this.filhos[idx - 1];
        filho.valores.unshift(this.valores[idx - 1]);
        this.valores[idx - 1] = irmao.valores.pop();
        if (!filho.eh_folha()) filho.filhos.unshift(irmao.filhos.pop());
    }

    emprestar_do_proximo(idx) {
        let filho = this.filhos[idx];
        let irmao = this.filhos[idx + 1];
        filho.valores.push(this.valores[idx]);
        this.valores[idx] = irmao.valores.shift();
        if (!filho.eh_folha()) filho.filhos.push(irmao.filhos.shift());
    }

    async mesclar(idx) {
        let filho = this.filhos[idx];
        let irmao = this.filhos[idx + 1];
        filho.valores.push(this.valores[idx]);
        filho.valores = filho.valores.concat(irmao.valores);
        if (!filho.eh_folha()) filho.filhos = filho.filhos.concat(irmao.filhos);
        this.valores.splice(idx, 1);
        this.filhos.splice(idx + 1, 1);
    }
}

class ArvoreB {
    constructor(fanout = 3) {
        this.raiz = null;
        this.fanout = fanout;
        this.stats = { reads: 0, writes: 0 };
        this.caminhoPercorrido = new Set();
    }

    // --- BUSCA (PÚBLICA) ---
    async buscar(valor) {
        this.caminhoPercorrido.clear();
        if (!this.raiz) return false;
        return await this._buscarRecursivo(this.raiz, valor);
    }

    async _buscarRecursivo(no, valor) {
        this.stats.reads++;
        this.caminhoPercorrido.add(no.id);
        
        let i = 0;
        while (i < no.valores.length && valor > no.valores[i]) i++;

        if (i < no.valores.length && valor === no.valores[i]) {
            return true;
        }

        if (no.eh_folha()) return false;

        this.caminhoPercorrido.add(`${no.id}-${no.filhos[i].id}`);
        return await this._buscarRecursivo(no.filhos[i], valor);
    }

    // --- INSERÇÃO ---
    async inserir(valor, animar = true) {
        // 1. Verificação de Existência (Regra do Usuário)
        const existe = await this.buscar(valor);
        if (existe) {
            if (animar) await log(`ERRO: O valor ${valor} já existe na árvore!`, null, 'error');
            return; // Aborta
        }

        this.caminhoPercorrido.clear();
        this.stats.writes++;

        if (this.raiz === null) {
            this.raiz = new No();
            this.raiz.valores.push(valor);
            this.caminhoPercorrido.add(this.raiz.id);
            if(animar) await log(`Raiz criada com ${valor}`);
            return;
        }

        let resultadoSplit = await this._inserirRecursivo(this.raiz, valor, animar);

        if (resultadoSplit) {
            if(animar) await log("Overflow na raiz. Nova raiz criada (Aumentou altura).");
            let novaRaiz = new No();
            novaRaiz.valores.push(resultadoSplit.chave);
            novaRaiz.filhos.push(this.raiz);
            novaRaiz.filhos.push(resultadoSplit.novoNo);
            this.raiz = novaRaiz;
        }
        
        if(animar) await log(`Valor ${valor} inserido com sucesso!`);
    }

    async _inserirRecursivo(no, k, animar) {
        this.stats.reads++;
        this.caminhoPercorrido.add(no.id);

        if (no.eh_folha()) {
            let i = 0;
            while (i < no.valores.length && k > no.valores[i]) i++;
            no.valores.splice(i, 0, k);
            this.stats.writes++;
            
            // Verifica Overflow baseado no Fanout (n)
            // Se tem 'n' chaves, estourou (o máximo é n-1)
            if (no.valores.length === this.fanout) {
                return no.split(this.fanout);
            }
            return null;
        }

        let i = 0;
        while (i < no.valores.length && k > no.valores[i]) i++;
        
        this.caminhoPercorrido.add(`${no.id}-${no.filhos[i].id}`);
        let resultadoFilho = await this._inserirRecursivo(no.filhos[i], k, animar);

        if (resultadoFilho) {
            no.valores.splice(i, 0, resultadoFilho.chave);
            no.filhos.splice(i + 1, 0, resultadoFilho.novoNo);
            this.stats.writes++;

            if (no.valores.length === this.fanout) {
                return no.split(this.fanout);
            }
        }
        return null;
    }

    // --- REMOÇÃO ---
    async remover(valor) {
        // 1. Verificação de Existência
        const existe = await this.buscar(valor);
        if (!existe) {
            await log(`ERRO: O valor ${valor} não está na árvore!`, null, 'error');
            return; // Aborta
        }

        if (!this.raiz) return;
        this.caminhoPercorrido.clear();
        this.stats.writes++;
        
        await log(`Iniciando remoção de ${valor}...`);
        
        await this.raiz.remover(valor, this.fanout);

        if (this.raiz.valores.length === 0) {
            if (this.raiz.eh_folha()) {
                this.raiz = null;
            } else {
                this.raiz = this.raiz.filhos[0];
            }
        }
        
        await log(`Valor ${valor} removido.`);
    }

    // Dados Visuais (Estilo PaperCSS via opções globais no main.js)
    gerarDadosVisuais() {
        let nodes = [];
        let edges = [];

        const percorrer = (no) => {
            if (!no) return;
            
            let highlighted = this.caminhoPercorrido.has(no.id);
            let label = ` ${no.valores.join(' | ')} `;
            
            nodes.push({
                id: no.id,
                label: label,
                // Cores ajustadas para parecer papel/rascunho
                color: { 
                    background: highlighted ? '#fff3cd' : '#ffffff', 
                    border: '#41403e',
                    borderWidth: highlighted ? 3 : 2
                },
                font: { face: 'Patrick Hand', size: 18 }
            });

            no.filhos.forEach(filho => {
                let edgeId = `${no.id}-${filho.id}`;
                let edgeHigh = this.caminhoPercorrido.has(edgeId);
                
                edges.push({ 
                    from: no.id, 
                    to: filho.id,
                    color: edgeHigh ? '#ff0000' : '#41403e', // Vermelho para destaque
                    width: edgeHigh ? 2 : 1
                });
                percorrer(filho);
            });
        };

        if (this.raiz) percorrer(this.raiz);
        return { nodes, edges };
    }
}