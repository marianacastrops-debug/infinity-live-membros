export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;
    const event = body.event;
    const data = body.data;

    // Só processa compras aprovadas
    if (event !== 'purchase_approved') {
      return res.status(200).json({ ok: true, msg: 'Evento ignorado: ' + event });
    }

    const nome = data?.customer?.name || 'Aluno';
    const email = data?.customer?.email;

    if (!email) {
      return res.status(400).json({ error: 'Email não encontrado no payload' });
    }

    // Conectar ao Supabase
    const SB_URL = 'https://fbjxampsauqfngdennpi.supabase.co';
    const SB_KEY = 'sb_publishable_RMqVdkC4rGHAJZEKitBqcA_yUwA9LYg';

    // Gerar senha aleatória
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    let senha = '';
    for (let i = 0; i < 10; i++) {
      senha += chars[Math.floor(Math.random() * chars.length)];
    }

    // Criar usuário no Supabase Auth
    const authRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`
      },
      body: JSON.stringify({
        email: email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: nome }
      })
    });

    const authData = await authRes.json();

    if (authData.error && authData.error !== 'User already registered') {
      console.error('Erro ao criar usuário:', authData);
      return res.status(500).json({ error: authData.error });
    }

    // Enviar e-mail via RPC do Supabase
    await fetch(`${SB_URL}/rest/v1/rpc/enviar_email_resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`
      },
      body: JSON.stringify({
        p_nome: nome,
        p_email: email,
        p_senha: senha
      })
    });

    console.log(`✅ Aluno criado: ${nome} (${email})`);
    return res.status(200).json({ ok: true, msg: 'Aluno criado com sucesso', email });

  } catch (e) {
    console.error('Erro webhook Cakto:', e);
    return res.status(500).json({ error: e.message });
  }
}
