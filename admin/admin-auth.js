// =====================================================
// AUTENTICAÇÃO ADMIN — SUPABASE
// =====================================================

const _sbAdmin = supabase.createClient(
  'https://fbjxampsauqfngdennpi.supabase.co',
  'sb_publishable_RMqVdkC4rGHAJZEKitBqcA_yUwA9LYg'
);

// ---- FUNÇÕES DO ADMIN ----

// Adicionar novo aluno
async function criarAluno(nome, email, senha, plano) {
  try {
    // Criar usuário no Supabase Auth
    const { data, error } = await _sbAdmin.auth.admin ?
      // Se tiver acesso admin (service key)
      _sbAdmin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome, plano } }) :
      // Fallback: usar signUp normal
      _sbAdmin.auth.signUp({ email, password: senha, options: { data: { nome, plano } } });

    if (error) throw error;
    return { sucesso: true, data };
  } catch(e) {
    return { sucesso: false, erro: e.message };
  }
}

// Listar alunos (via tabela profiles)
async function listarAlunos() {
  const { data, error } = await _sbAdmin.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// Bloquear/desbloquear aluno
async function alterarStatusAluno(userId, novoStatus) {
  const { error } = await _sbAdmin.from('profiles')
    .update({ status: novoStatus })
    .eq('id', userId);
  return !error;
}

// Pegar progresso de um aluno específico
async function getProgressoAluno(userId) {
  const { data } = await _sbAdmin.from('progresso')
    .select('*')
    .eq('user_id', userId)
    .eq('concluida', true);
  return data || [];
}
