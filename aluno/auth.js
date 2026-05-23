// =====================================================
// AUTENTICAÇÃO SUPABASE — INFINITY LIVE
// =====================================================

const _sb = supabase.createClient(
  'https://fbjxampsauqfngdennpi.supabase.co',
  'sb_publishable_RMqVdkC4rGHAJZEKitBqcA_yUwA9LYg',
  {
    auth: {
      persistSession: true,
      storageKey: 'il_session',
      autoRefreshToken: true
    }
  }
);

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

async function fazerLogout() {
  await _sb.auth.signOut();
  window.location.href = '../login.html';
}

async function getDadosAluno() {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await _sb.from('profiles').select('*').eq('id', user.id).single();
  return { ...user, ...profile };
}

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

async function getProgresso() {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return [];
  const { data } = await _sb.from('progresso').select('*').eq('user_id', user.id).eq('concluida', true);
  return data || [];
}
