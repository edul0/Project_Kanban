async function initRoom() {
    // 1. Busca os dados da sala, incluindo a senha
    let { data, error } = await _supabase.from('kanban_data').select('*').eq('room_name', ROOM_NAME).maybeSingle();

    // 2. Se a sala não existir, cria agora com opção de senha
    if (!data) {
        const pass = prompt(`Mural "${ROOM_NAME}" é novo. Criar uma senha? (Deixe vazio para mural público)`);
        const initialState = [
            {id:"todo", title:"Para fazer", cards:[]},
            {id:"doing", title:"Em curso", cards:[]},
            {id:"done", title:"Concluído", cards:[]}
        ];
        
        const { data: newData, error: insError } = await _supabase
            .from('kanban_data')
            .insert([{ 
                room_name: ROOM_NAME, 
                state: initialState, 
                logs: [`Mural criado por @${currentUser.login}`], 
                room_password: pass || null 
            }])
            .select().single();
            
        data = newData;
        if (pass) sessionStorage.setItem(`auth_${ROOM_NAME}`, pass);
    }

    // 3. SE A SALA TEM SENHA, VALIDA ANTES DE MOSTRAR O BOARD
    if (data.room_password) {
        let sessionAuth = sessionStorage.getItem(`auth_${ROOM_NAME}`);
        
        if (sessionAuth !== data.room_password) {
            const userAttempt = prompt("Este mural é privado. Digite a senha:");
            
            if (userAttempt === data.room_password) {
                sessionStorage.setItem(`auth_${ROOM_NAME}`, userAttempt);
            } else {
                alert("Senha incorreta. Acesso negado.");
                window.location.href = "index.html"; // Volta para a landing page
                return;
            }
        }
    }

    // 4. Se passou pela segurança, carrega o board
    boardState = data.state;
    activityLogs = data.logs || [];
    
    // Atualiza o cadeado no cabeçalho se houver senha
    const lockIcon = data.room_password ? "🔒" : "🔓";
    document.getElementById('app-container').querySelector('.room-info strong').innerHTML += ` ${lockIcon}`;

    renderBoard();
    renderLogs();
    
    // Canal Realtime filtrado para esta sala
    _supabase.channel(`room-${ROOM_NAME}`).on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'kanban_data', filter: `room_name=eq.${ROOM_NAME}` 
    }, payload => {
        boardState = payload.new.state;
        activityLogs = payload.new.logs || [];
        renderBoard(); renderLogs();
    }).subscribe();
}
