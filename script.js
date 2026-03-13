// 1. Quando o usuário começa a arrastar o card
function handleDragStart(event) {
    // Salva o ID do card que está sendo movido
    event.dataTransfer.setData("text/plain", event.target.id);
    console.log("Arrastando card:", event.target.id);
}

// 2. Quando o card é solto em uma coluna
function handleDrop(event) {
    event.preventDefault();
    
    // Pega o ID do card que salvamos no DragStart
    const cardId = event.dataTransfer.getData("text/plain");
    
    // Descobre qual é a coluna de destino (onde o card foi solto)
    // Usamos .closest() para garantir que pegamos a div da lista mesmo se soltar em cima de outro card
    const targetColumnList = event.target.closest('.card-list');
    
    if (targetColumnList) {
        const targetColumnId = targetColumnList.id;
        moveCard(cardId, targetColumnId);
    }
}

// 3. A lógica que altera os dados (boardState)
function moveCard(cardId, targetColumnId) {
    let cardToMove;
    
    // Remove o card da coluna atual
    boardState.forEach(column => {
        const cardIndex = column.cards.findIndex(c => c.id === cardId);
        if (cardIndex !== -1) {
            cardToMove = column.cards.splice(cardIndex, 1)[0];
        }
    });

    // Adiciona o card na nova coluna
    const targetColumn = boardState.find(col => col.id === targetColumnId);
    if (targetColumn && cardToMove) {
        targetColumn.cards.push(cardToMove);
    }

    // RE-RENDERIZA tudo para refletir a mudança na tela
    renderBoard();
}
