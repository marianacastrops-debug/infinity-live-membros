export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatorio' });

    const SB_URL = 'https://fbjxampsauqfngdennpi.supabase.co';
    const SB_SECRET = 'sb_secret_UIykqcvYhYwNWjf8Afrgdg_4jur-OWD';
    const headers = { 'Content-Type': 'application/json', 'apikey': SB_SECRET, 'Authorization': `Bearer ${SB_SECRET}` };

    // Buscar ID pelo email
    const listRes = await fetch(`${SB_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers });
    const listData = await listRes.json();
    const user = (listData.users || []).find(u => u.email === email);

    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });

    // Deletar usuário
    await fetch(`${SB_URL}/auth/v1/admin/users/${user.id}`, { method: 'DELETE', headers });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
