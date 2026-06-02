export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, acao } = req.body; // acao: 'liberar' ou 'bloquear'
    if (!email) return res.status(400).json({ error: 'Email obrigatorio' });

    const SB_URL = 'https://fbjxampsauqfngdennpi.supabase.co';
    const SB_SECRET = 'sb_secret_UIykqcvYhYwNWjf8Afrgdg_4jur-OWD';
    const SB_KEY = 'sb_publishable_RMqVdkC4rGHAJZEKitBqcA_yUwA9LYg';
    const hSecret = { 'Content-Type': 'application/json', 'apikey': SB_SECRET, 'Authorization': `Bearer ${SB_SECRET}` };
    const hKey = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

    // Buscar UUID pelo email
    const listRes = await fetch(`${SB_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: hSecret });
    const listData = await listRes.json();
    const user = (listData.users || []).find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
    const userId = user.id;

    if (acao === 'liberar') {
      // Deletar registros e inserir como liberado manualmente
      await fetch(`${SB_URL}/rest/v1/modulos_bloqueados?user_id=eq.${userId}`, { method: 'DELETE', headers: hSecret });

      const modsRes = await fetch(`${SB_URL}/rest/v1/modulos?bloqueio_7dias=eq.true&select=id`, { headers: hKey });
      const mods = await modsRes.json();

      if (Array.isArray(mods) && mods.length > 0) {
        await fetch(`${SB_URL}/rest/v1/modulos_bloqueados`, {
          method: 'POST',
          headers: { ...hSecret, 'Prefer': 'return=minimal' },
          body: JSON.stringify(mods.map(m => ({
            user_id: userId, modulo_id: m.id,
            desbloqueio_em: new Date().toISOString(),
            liberado_manualmente: true
          })))
        });
      }
      return res.status(200).json({ ok: true, acao: 'liberado' });

    } else {
      // Reativar bloqueio
      await fetch(`${SB_URL}/rest/v1/modulos_bloqueados?user_id=eq.${userId}`, { method: 'DELETE', headers: hSecret });

      const modsRes = await fetch(`${SB_URL}/rest/v1/modulos?bloqueio_7dias=eq.true&select=id`, { headers: hKey });
      const mods = await modsRes.json();

      if (Array.isArray(mods) && mods.length > 0) {
        const d = new Date(); d.setDate(d.getDate() + 7);
        await fetch(`${SB_URL}/rest/v1/modulos_bloqueados`, {
          method: 'POST',
          headers: { ...hSecret, 'Prefer': 'return=minimal' },
          body: JSON.stringify(mods.map(m => ({
            user_id: userId, modulo_id: m.id,
            desbloqueio_em: d.toISOString(),
            liberado_manualmente: false
          })))
        });
      }
      return res.status(200).json({ ok: true, acao: 'bloqueado' });
    }

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
