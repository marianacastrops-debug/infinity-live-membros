export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Dados incompletos' });

    const SB_URL = 'https://fbjxampsauqfngdennpi.supabase.co';
    const SB_SECRET = 'sb_secret_UIykqcvYhYwNWjf8Afrgdg_4jur-OWD';
    const SB_KEY = 'sb_publishable_RMqVdkC4rGHAJZEKitBqcA_yUwA9LYg';
    const headersSecret = { 'Content-Type': 'application/json', 'apikey': SB_SECRET, 'Authorization': `Bearer ${SB_SECRET}` };
    const headersKey = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

    // 1. Criar usuário
    const createRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
      method: 'POST', headers: headersSecret,
      body: JSON.stringify({ email, password: senha, email_confirm: true, user_metadata: { nome, origem: 'manual' } })
    });
    const data = await createRes.json();
    console.log('Create user response:', JSON.stringify(data).slice(0,200));
    if (!data.id) return res.status(400).json({ error: data.msg || data.message || 'Erro ao criar usuario' });
    const userId = data.id;

    // 2. Buscar módulos com bloqueio_7dias=true
    const modsRes = await fetch(`${SB_URL}/rest/v1/modulos?bloqueio_7dias=eq.true&select=id`, { headers: headersKey });
    const mods = await modsRes.json();
    console.log('Modulos bloqueados encontrados:', Array.isArray(mods) ? mods.length : mods);

    // 3. Inserir bloqueios
    if (Array.isArray(mods) && mods.length > 0) {
      const desbloqueioEm = new Date();
      desbloqueioEm.setDate(desbloqueioEm.getDate() + 7);
      const registros = mods.map(m => ({
        user_id: userId,
        modulo_id: m.id,
        desbloqueio_em: desbloqueioEm.toISOString(),
        liberado_manualmente: false
      }));
      const bloqRes = await fetch(`${SB_URL}/rest/v1/modulos_bloqueados`, {
        method: 'POST',
        headers: { ...headersSecret, 'Prefer': 'return=minimal' },
        body: JSON.stringify(registros)
      });
      console.log('Bloqueio insert status:', bloqRes.status);
      if (!bloqRes.ok) {
        const err = await bloqRes.text();
        console.log('Bloqueio insert error:', err);
      }
    }

    // 4. Enviar email
    await fetch(`${SB_URL}/rest/v1/rpc/enviar_email_resend`, {
      method: 'POST', headers: headersKey,
      body: JSON.stringify({ p_nome: nome, p_email: email, p_senha: senha })
    });

    return res.status(200).json({ ok: true, id: userId, modulos_bloqueados: Array.isArray(mods) ? mods.length : 0 });
  } catch (e) {
    console.error('Erro:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
