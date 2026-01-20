class NoBPlus {
    constructor(ehFolha = true) {
        this.id = 'no_' + Math.random().toString(36).substr(2, 9);
        this.valores = [];
        this.filhos = [];
        this.proximo = null;
        this.ehFolhaProp = ehFolha;
    }

    eh_folha() {
        return this.ehFolhaProp;
    }

    split(fanout) {
        let meio = Math.floor(this.valores.length / 2);
        let valor_promovido = this.valores[meio];
        let novo_no = new NoBPlus(this.eh_folha());
        
        if (this.eh_folha()) {
            // B+ Folha: Direita inclui o meio
            novo_no.valores = this.valores.slice(meio);
            this.valores = this.valores.slice(0, meio);
            
            novo_no.proximo = this.proximo;
            this.proximo = novo_no;
            
            // Retorna cópia da chave para o índice
            return { chave: novo_no.valores[0], novoNo: novo_no };
        } else {
            // B+ Interno: Meio sobe e some daqui
            novo_no.valores = this.valores.slice(meio + 1);
            novo_no.filhos = this.filhos.slice(meio + 1);
            
            this.valores = this.valores.slice(0, meio);
            this.filhos = this.filhos.slice(0, meio + 1);
            
            return { chave: valor_promovido, novoNo: novo_no };
        }
    }

    async remover(k, fanout) {
        if (!this.eh_folha()) {
            let i = 0;
            while (i < this.valores.length && k >= this.valores[i]) i++;
            
            let min_chaves = Math.ceil(fanout / 2) - 1;
            
            if (this.filhos[i].valores.length <= min_chaves) {
                await this.preencher_filho(i, fanout);
                i = 0; 
                while (i < this.valores.length && k >= this.valores[i]) i++;
            }

            return await this.filhos[i].remover(k, fanout);
        }

        let idx = this.valores.indexOf(k);
        if (idx !== -1) {
            this.valores.splice(idx, 1);
            return true;
        }
        return false;
    }

    // ... (Métodos auxiliares preencher_filho, emprestar, mesclar iguais ao anterior, omitidos por brevidade mas devem estar no arquivo)
    // CERTIFIQUE-SE de copiar os métodos auxiliares (preencher_filho, etc) da versão anterior do treeBPlus.js
    // A lógica neles não muda drasticamente com o Fanout Silberschatz, pois dependem de length e min_chaves.
    
    async preencher_filho(idx, fanout) {
        let min_chaves = Math.ceil(fanout / 2) - 1;
        if (idx !== 0 && this.filhos[idx - 1].valores.length > min_chaves) {
            this.emprestar_do_anterior(idx);
        } else if (idx !== this.filhos.length - 1 && this.filhos[idx + 1].valores.length > min_chaves) {
            this.emprestar_do_proximo(idx);
        } else {
            if (idx !== this.filhos.length - 1) await this.mesclar(idx);
            else await this.mesclar(idx - 1);
        }
    }

    emprestar_do_anterior(idx) {
        let filho = this.filhos[idx];
        let irmao = this.filhos[idx - 1];
        if (filho.eh_folha()) {
            let val = irmao.valores.pop();
            filho.valores.unshift(val);
            this.valores[idx - 1] = filho.valores[0];
        } else {
            filho.valores.unshift(this.valores[idx - 1]);
            this.valores[idx - 1] = irmao.valores.pop();
            filho.filhos.unshift(irmao.filhos.pop());
        }
    }

    emprestar_do_proximo(idx) {
        let filho = this.filhos[idx];
        let irmao = this.filhos[idx + 1];
        if (filho.eh_folha()) {
            let val = irmao.valores.shift();
            filho.valores.push(val);
            this.valores[idx] = irmao.valores[0];
        } else {
            filho.valores.push(this.valores[idx]);
            this.valores[idx] = irmao.valores.shift();
            filho.filhos.push(irmao.filhos.shift());
        }
    }

    async mesclar(idx) {
        let filho = this.filhos[idx];
        let irmao = this.filhos[idx + 1];
        if (filho.eh_folha()) {
            filho.valores = filho.valores.concat(irmao.valores);
            filho.proximo = irmao.proximo;
            this.valores.splice(idx, 1);
            this.filhos.splice(idx + 1, 1);
        } else {
            filho.valores.push(this.valores[idx]);
            filho.valores = filho.valores.concat(irmao.valores);
            filho.filhos = filho.filhos.concat(irmao.filhos);
            this.valores.splice(idx, 1);
            this.filhos.splice(idx + 1, 1);
        }
    }
}

class ArvoreBPlus {
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

        if (no.eh_folha()) {
            let found = no.valores.includes(valor);
            return found;
        }

        let i = 0;
        while (i < no.valores.length && valor >= no.valores[i]) i++;

        this.caminhoPercorrido.add(`${no.id}-${no.filhos[i].id}`);
        return await this._buscarRecursivo(no.filhos[i], valor);
    }

    // --- INSERÇÃO ---
    async inserir(valor, animar = true) {
        // Validação de Unicidade
        const existe = await this.buscar(valor);
        if (existe) {
            if (animar) await log(`ERRO: Valor ${valor} já existe!`, null, 'error');
            return;
        }

        this.caminhoPercorrido.clear();
        this.stats.writes++;

        if (this.raiz === null) {
            this.raiz = new NoBPlus(true);
            this.raiz.valores.push(valor);
            this.caminhoPercorrido.add(this.raiz.id);
            if(animar) await log(`Raiz (folha) criada com ${valor}`);
            return;
        }

        let resultadoSplit = await this._inserirRecursivo(this.raiz, valor, animar);

        if (resultadoSplit) {
            if(animar) await log("Raiz estourou. Nova raiz índice criada.");
            let novaRaiz = new NoBPlus(false);
            novaRaiz.valores.push(resultadoSplit.chave);
            novaRaiz.filhos.push(this.raiz);
            novaRaiz.filhos.push(resultadoSplit.novoNo);
            this.raiz = novaRaiz;
        }
        
        if(animar) await log(`Valor ${valor} inserido.`);
    }

    async _inserirRecursivo(no, k, animar) {
        this.stats.reads++;
        this.caminhoPercorrido.add(no.id);

        if (no.eh_folha()) {
            let i = 0;
            while (i < no.valores.length && k > no.valores[i]) i++;
            no.valores.splice(i, 0, k);
            this.stats.writes++;
            
            // Overflow se atingir 'fanout' chaves (max é fanout-1)
            if (no.valores.length === this.fanout) {
                return no.split(this.fanout);
            }
            return null;
        }

        let i = 0;
        while (i < no.valores.length && k >= no.valores[i]) i++;
        
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
        // Validação
        const existe = await this.buscar(valor);
        if (!existe) {
            await log(`ERRO: Valor ${valor} não existe para remover!`, null, 'error');
            return;
        }

        if (!this.raiz) return;
        this.caminhoPercorrido.clear();
        this.stats.writes++;
        
        await log(`Buscando folha para remover ${valor}...`);
        
        await this.raiz.remover(valor, this.fanout);

        if (this.raiz.valores.length === 0 && !this.raiz.eh_folha()) {
            this.raiz = this.raiz.filhos[0];
        } else if (this.raiz.valores.length === 0 && this.raiz.eh_folha()) {
            this.raiz = null;
        }
        
        await log(`Valor removido.`);
    }

    // Geração Visual
    gerarDadosVisuais() {
        let nodes = [];
        let edges = [];
        let visitados = new Set();

        const percorrer = (no) => {
            if (!no || visitados.has(no.id)) return;
            visitados.add(no.id);
            
            let highlighted = this.caminhoPercorrido.has(no.id);
            let label = ` ${no.valores.join(' | ')} `;
            
            nodes.push({
                id: no.id,
                label: label,
                color: { 
                    background: highlighted ? '#fff3cd' : '#ffffff', 
                    border: no.eh_folha() ? '#2E7D32' : '#8E24AA',
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
                    color: edgeHigh ? '#ff0000' : '#41403e',
                    width: edgeHigh ? 2 : 1
                });
                percorrer(filho);
            });

            if (no.eh_folha() && no.proximo) {
                edges.push({ 
                    from: no.id, 
                    to: no.proximo.id, 
                    color: '#F44336', 
                    dashes: [5, 5], // Tracejado rústico
                    width: 1,
                    arrows: 'to',
                    smooth: { type: 'curvedCW', roundness: 0.2 }
                });
                percorrer(no.proximo);
            }
        };

        if (this.raiz) percorrer(this.raiz);
        return { nodes, edges };
    }
}