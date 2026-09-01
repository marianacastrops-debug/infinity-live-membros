export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, nome } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatorio' });

    const SB_URL = 'https://fbjxampsauqfngdennpi.supabase.co';
    const SB_SECRET = 'sb_secret_2gsqX6fKbuD-oqInc37Usg_qq-QUT-E';
    const SB_KEY = 'sb_publishable_RMqVdkC4rGHAJZEKitBqcA_yUwA9LYg';
    const hS = { 'Content-Type': 'application/json', 'apikey': SB_SECRET, 'Authorization': `Bearer ${SB_SECRET}` };

    // Gerar nova senha
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    let senha = '';
    for (let i = 0; i < 10; i++) senha += chars[Math.floor(Math.random() * chars.length)];

    // Buscar usuário pelo email
    const listRes = await fetch(`${SB_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: hS });
    const listData = await listRes.json();
    const user = (listData.users || []).find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });

    // Atualizar senha
    await fetch(`${SB_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT', headers: hS,
      body: JSON.stringify({ password: senha })
    });

    // Reenviar email
    const nomeAluno = nome || user.user_metadata?.nome || email.split('@')[0];
    await fetch(`${SB_URL}/rest/v1/rpc/enviar_email_resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
      body: JSON.stringify({ p_nome: nomeAluno, p_email: email, p_senha: senha })
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
