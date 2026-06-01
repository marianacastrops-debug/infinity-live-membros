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

    const headers = {
      'Content-Type': 'application/json',
      'apikey': SB_SECRET,
      'Authorization': `Bearer ${SB_SECRET}`
    };

    // Gerar senha
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    let senha = '';
    for (let i = 0; i < 10; i++) senha += chars[Math.floor(Math.random() * chars.length)];

    // Criar usuário
    const createRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password: senha, email_confirm: true, user_metadata: { nome } })
    });
    const createData = await createRes.json();
    console.log('Create:', JSON.stringify(createData));

    let userId = createData.id;

    // Se já existe, atualizar senha
    if (!userId) {
      const listRes = await fetch(`${SB_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers });
      const listData = await listRes.json();
      const user = (listData.users || []).find(u => u.email === email);
      if (user) {
        userId = user.id;
        await fetch(`${SB_URL}/auth/v1/admin/users/${userId}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ password: senha })
        });
      }
    }

    // Buscar módulos bloqueados padrão
    if (userId) {
      const confRes = await fetch(`${SB_URL}/rest/v1/configuracoes?chave=eq.mods_bloqueados_padrao&select=valor`, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
      });
      const confData = await confRes.json();
      const modsBloqueados = confData?.[0]?.valor ? JSON.parse(confData[0].valor) : [];

      if (modsBloqueados.length > 0) {
        const desbloqueioEm = new Date();
        desbloqueioEm.setDate(desbloqueioEm.getDate() + 7);
        const registros = modsBloqueados.map(modId => ({
          user_id: userId,
          modulo_id: modId,
          desbloqueio_em: desbloqueioEm.toISOString()
        }));
        await fetch(`${SB_URL}/rest/v1/modulos_bloqueados`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify(registros)
        });
        console.log('Módulos bloqueados:', modsBloqueados.length);
      }
    }

    // Enviar e-mail
    await fetch(`${SB_URL}/rest/v1/rpc/enviar_email_resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
      body: JSON.stringify({ p_nome: nome, p_email: email, p_senha: senha })
    });

    console.log('✅ Aluno criado:', nome, email);
    return res.status(200).json({ ok: true, email });

  } catch (e) {
    console.error('Erro:', e.message);
    return res.status(200).json({ ok: true, error: e.message });
  }
}
