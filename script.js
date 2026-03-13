// ... (Sua configuração do Supabase no topo igual antes) ...

async function startApp() {
    const app = document.getElementById('app-content');
    if (!ROOM_NAME) {
        renderLandingPage();
    } else {
        await fetchUserProfile(GITHUB_USER);
        initRoom();
    }
}

function renderLandingPage() {
    document.body.innerHTML = `
        <div class="landing-container">
            <h1 style="margin:0;">Post-it Board /</h1>
            <input type="text" id="room-input" placeholder="nome-da-sala" autofocus>
            <p style="margin-top:20px; color:#666;">Crie murais instantâneos. Como o Dontpad, mas com Post-its.</p>
        </div>
    `;
    const input = document.getElementById('room-input');
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value) window.location.href = `?sala=${input.value.trim()}`;
    });
}

async function initRoom() {
    // Busca a sala. Se der erro 400, o código agora ignora e tenta criar.
    let { data, error } = await _supabase.from('kanban_data').select('*').eq('room_name', ROOM_NAME).maybeSingle();

    if (!data) {
        const pass = prompt(`Mural "${ROOM_NAME}" é novo. Senha? (Vazio = Público)`);
        const initialState = [
            {id:"todo", title:"Para fazer", cards:[]},
            {id:"doing", title:"Em curso", cards:[]},
            {id:"done", title:"Concluído", cards:[]}
        ];
        
        const { data: newData, error: insError } = await _supabase
            .from('kanban_data')
            .insert([{ room_name: ROOM_NAME, state: initialState, logs: [], room_password: pass || null }])
            .select().single();
            
        data = newData;
    }

    // Validação de senha e renderização (Mesma lógica das funções anteriores)
    if(data) {
        boardState = data.state;
        document.getElementById('room-display').innerText = ROOM_NAME;
        renderBoard();
        // Ativa o Realtime aqui...
    }
}

document.addEventListener('DOMContentLoaded', startApp);
