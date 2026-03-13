// === 1. CONFIGURAÇÕES E ESTADO INICIAL ===
const generateId = () => crypto.randomUUID();

let boardState = [
    {
        id: "todo",
        title: "A Fazer",
        cards: [
            { id: generateId(), content: "Configurar o projeto" },
            { id: generateId(), content: "Estudar Drag and Drop" }
        ]
    },
    { id: "doing", title: "Em Andamento", cards: [] },
    { id: "done", title: "Concluído", cards: [] }
];

// === 2. FUNÇÕES DE LÓGICA (AS QUE VOCÊ PERGUNTOU "ONDE?") ===

function handleDragStart(event) {
    event.dataTransfer.setData("text/plain", event.target.id);
}

function handleDrop(event) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain");
    const targetColumnList = event.target.closest('.card-list');
    
    if (targetColumnList) {
        const targetColumnId = targetColumnList.id;
        moveCard(cardId, targetColumnId);
    }
}

function moveCard(cardId, targetColumnId) {
    let cardToMove;
    boardState.forEach(column => {
        const cardIndex = column.cards.findIndex(c => c.id === cardId);
        if (cardIndex !== -1) {
            cardToMove = column.cards.splice(cardIndex, 1)[0];
        }
    });

    const targetColumn = boardState.find(col => col.id === targetColumnId);
    if (targetColumn && cardToMove) {
        targetColumn.cards.push(cardToMove);
    }
    renderBoard(); // Desenha a tela novamente com os novos dados
}

// === 3. FUNÇÃO DE RENDERIZAÇÃO (DESENHAR NA TELA) ===

function renderBoard() {
    const boardElement = document.getElementById('kanban-board');
    if (!boardElement) return;

    boardElement.innerHTML = boardState.map(column => `
        <div class="column">
            <h3>${column.title}</h3>
            <div class="card-list" id="${column.id}" 
                 ondrop="handleDrop(event)" 
                 ondragover="event.preventDefault()">
                
                ${column.cards.map(card => `
                    <div class="card" id="${card.id}" draggable="true" 
                         ondragstart="handleDragStart(event)">
                        ${card.content}
                    </div>
                `).join('')}
                
            </div>
        </div>
    `).join('');
}

// Inicialização
window.onload = renderBoard;
