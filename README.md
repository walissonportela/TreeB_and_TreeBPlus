# 🌳 Simulador de Estruturas de Indexação (SGBD)

> Um simulador visual e interativo para **Árvores B** e **Árvores B+**, desenvolvido com estética de rascunho (hand-drawn) para facilitar o ensino e aprendizado de estruturas de dados em Banco de Dados.

![Status do Projeto](https://img.shields.io/badge/Status-Conclu%C3%ADdo-success)
![Tech](https://img.shields.io/badge/Tech-HTML%20%7C%20CSS%20%7C%20JS-blue)

## 📋 Sobre o Projeto

Este projeto é uma ferramenta educacional criada para demonstrar o funcionamento interno dos índices em Sistemas Gerenciadores de Banco de Dados (SGBD). Diferente de visualizadores tradicionais, este projeto foca na experiência de "papel e caneta", utilizando fontes manuscritas e componentes que simulam um caderno de estudos.

O algoritmo segue as definições clássicas de **Silberschatz**, onde o *split* de nós ocorre baseando-se no Fanout (grau) $n$, permitindo até $n-1$ chaves por nó.

## ✨ Funcionalidades

- **Dupla Modalidade:** Alterne facilmente entre simulação de **Árvore B** e **Árvore B+**.
- **Configuração Dinâmica:** Defina o *Fanout* (ordem da árvore) em tempo real (min: 3, max: 10).
- **Operações Completas:**
  - ✅ **Inserção:** Com tratamento visual de *splits* e *overflows*.
  - ❌ **Remoção:** Lógica completa de *merge* e redistribuição de chaves.
  - 🔍 **Busca:** Destaque do caminho percorrido na árvore.
- **Feedback Visual:**
  - Animação passo a passo com controle de velocidade.
  - Estatísticas de **Leituras** e **Escritas** em disco simuladas.
  - Logs interativos com destaque visual (Highlighter).
- **Gerador de Massa:** Inserção automática de números aleatórios para testes de carga.

## 🛠️ Tecnologias Utilizadas

O projeto foi construído utilizando **Vanilla JavaScript** (JS puro) e bibliotecas via CDN, não necessitando de instalação de pacotes (npm/yarn).

* **Core:** HTML5, CSS3, JavaScript (ES6+)
* **Visualização de Grafos:** [Vis.js](https://visjs.org/)
* **Interface (UI):** [PaperCSS](https://www.getpapercss.com/) (Estilo 8-bit/Hand-drawn)
* **Anotações:** [RoughNotation](https://roughnotation.com/) (Efeitos de marca-texto)
* **Tipografia:** Fonte 'Patrick Hand' (Google Fonts)

## 🚀 Como Executar

Como o projeto é estático, não há necessidade de build.

### Opção 1: Rodar Localmente
1. Clone este repositório ou baixe os arquivos.
2. Abra o arquivo `index.html` diretamente em seu navegador.
3. **Recomendado:** Use uma extensão como "Live Server" no VS Code para evitar problemas de CORS com módulos locais, embora o projeto esteja configurado para funcionar diretamente.

### Opção 2: Hospedagem (Vercel)
- Link: https://tree-b-and-tree-b-plus.vercel.app/
  
## 🧠 Lógica Implementada

### Árvore B
- Chaves e dados distribuídos em todos os níveis.
- Crescimento bottom-up (de baixo para cima).
- Split preventivo ou reativo baseado no preenchimento `n`.

### Árvore B+
- Cópias das chaves nos nós internos apenas para indexação.
- Todos os dados reais residem nas folhas.
- Folhas conectadas sequencialmente (Lista Encadeada) para facilitar *range scans* (visualizado com setas tracejadas).

## 🎨 Estrutura de Arquivos

```text
/
├── index.html      # Estrutura principal e importação de CDNs
├── style.css       # Estilização customizada e overrides do PaperCSS
├── main.js         # Controle da interface, eventos e integração com Vis.js
├── treeB.js        # Classe e lógica da Árvore B
└── treeBPlus.js    # Classe e lógica da Árvore B+
