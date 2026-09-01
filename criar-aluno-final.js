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
    const hS = { 'Content-Type': 'application/json', 'apikey': SB_SECRET, 'Authorization': `Bearer ${SB_SECRET}` };
    const hK = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

    // Criar usuário
    const createRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
      method: 'POST', headers: hS,
      body: JSON.stringify({ email, password: senha, email_confirm: true, user_metadata: { nome, origem: 'manual' } })
    });
    const data = await createRes.json();
    if (!data.id) return res.status(400).json({ error: data.msg || data.message || JSON.stringify(data) });
    const userId = data.id;

    // Buscar módulos com bloqueio_7dias=true e inserir bloqueios
    const modsRes = await fetch(`${SB_URL}/rest/v1/modulos?bloqueio_7dias=eq.true&select=id`, { headers: hK });
    const mods = await modsRes.json();
    if (Array.isArray(mods) && mods.length > 0) {
      const d = new Date(); d.setDate(d.getDate() + 7);
      await fetch(`${SB_URL}/rest/v1/modulos_bloqueados`, {
        method: 'POST',
        headers: { ...hS, 'Prefer': 'return=minimal' },
        body: JSON.stringify(mods.map(m => ({ user_id: userId, modulo_id: m.id, desbloqueio_em: d.toISOString(), liberado_manualmente: false })))
      });
    }

    // Enviar email
    await fetch(`${SB_URL}/rest/v1/rpc/enviar_email_resend`, {
      method: 'POST', headers: hK,
      body: JSON.stringify({ p_nome: nome, p_email: email, p_senha: senha })
    });

    return res.status(200).json({ ok: true, id: userId });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
