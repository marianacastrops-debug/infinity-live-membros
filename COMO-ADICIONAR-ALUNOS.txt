// =====================================================
// AUTENTICAÇÃO SUPABASE — INFINITY LIVE
// Inclua este script em todas as páginas do aluno
// =====================================================

const _sb = supabase.createClient(
  'https://fbjxampsauqfngdennpi.supabase.co',
  'sb_publishable_RMqVdkC4rGHAJZEKitBqcA_yUwA9LYg'
);

// Verificar se o aluno está logado
// Se não estiver, redireciona para o login
async function verificarSessao() {
  try {
    const { data: { session } } = await _sb.auth.getSession();
    if (!session) {
      window.location.href = '../login.html';
      return null;
    }
    return session;
  } catch(e) {
    window.location.href = '../login.html';
    return null;
  }
}

// Fazer logout
async function fazerLogout() {
  await _sb.auth.signOut();
  window.location.href = '../login.html';
}

// Pegar dados do usuário logado
async function getDadosAluno() {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await _sb.from('profiles').select('*').eq('id', user.id).single();
  return { ...user, ...profile };
}

// Salvar progresso de uma aula
async function marcarAulaConcluida(aulaId, moduloId) {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return;
  await _sb.from('progresso').upsert({
    user_id: user.id,
    aula_id: aulaId,
    modulo_id: moduloId,
    concluida: true,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,aula_id' });
}

// Pegar progresso do aluno
async function getProgresso() {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return [];
  const { data } = await _sb.from('progresso').select('*').eq('user_id', user.id).eq('concluida', true);
  return data || [];
}
