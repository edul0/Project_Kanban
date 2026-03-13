// 1. Função para gerar IDs únicos (UUID v4)
const generateId = () => crypto.randomUUID();

// 2. O "Coração" do App: O Estado Inicial
let boardState = [
    {
        id: "todo",
        title: "A Fazer",
        cards: [
            { id: generateId(), content: "Configurar o projeto" },
            { id: generateId(), content: "Estudar Drag and Drop" }
        ]
    },
    {
        id: "doing",
        title: "Em Andamento",
        cards: []
    },
    {
        id: "done",
        title: "Concluído",
        cards: []
    }
];
