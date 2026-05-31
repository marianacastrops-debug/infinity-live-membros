export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, msg: 'Webhook Infinity Live ativo!' });
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    const body = req.body;
    const event = body.event || '';
    const data = body.data || {};

    if (event !== 'purchase_approved') {
      return res.status(200).json({ ok: true, msg: 'Evento ignorado: ' + event });
    }

    const nome = data?.customer?.name || 'Aluno';
    const email = data?.customer?.email;

    if (!email) return res.status(200).json({ ok: true, msg: 'Email nao encontrado' });

    const SB_URL = 'https://fbjxampsauqfngdennpi.supabase.co';
    const SB_SECRET = 'sb_secret_UIykqcvYhYwNWjf8Afrgdg_4jur-OWD';
    const SB_KEY = 'sb_publishable_RMqVdkC4rGHAJZEKitBqcA_yUwA9LYg';

    // Gerar senha
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    let senha = '';
    for (let i = 0; i < 10; i++) senha += chars[Math.floor(Math.random() * chars.length)];

    // Criar usuário via REST API admin
    const createRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_SECRET,
        'Authorization': `Bearer ${SB_SECRET}`
      },
      body: JSON.stringify({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome }
      })
    });

    const createData = await createRes.json();
    console.log('Create response:', JSON.stringify(createData));

    // Se já existe, buscar e atualizar senha
    if (createData.code === 'email_exists' || createData.msg?.includes('already')) {
      const listRes = await fetch(`${SB_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
        headers: {
          'apikey': SB_SECRET,
          'Authorization': `Bearer ${SB_SECRET}`
        }
      });
      const listData = await listRes.json();
      const user = (listData.users || []).find(u => u.email === email);
      if (user) {
        await fetch(`${SB_URL}/auth/v1/admin/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SB_SECRET,
            'Authorization': `Bearer ${SB_SECRET}`
          },
          body: JSON.stringify({ password: senha })
        });
      }
    }

    // Enviar e-mail via RPC
    const emailRes = await fetch(`${SB_URL}/rest/v1/rpc/enviar_email_resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`
      },
      body: JSON.stringify({ p_nome: nome, p_email: email, p_senha: senha })
    });

    const emailData = await emailRes.json();
    console.log('Email response:', JSON.stringify(emailData));
    console.log('Aluno criado:', nome, email);

    return res.status(200).json({ ok: true, email });

  } catch (e) {
    console.error('Erro:', e.message);
    return res.status(200).json({ ok: true, error: e.message });
  }
}
