import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, msg: 'Webhook Infinity Live ativo!' });
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    const body = req.body;
    
    // Log para debug
    console.log('Payload recebido:', JSON.stringify(body));

    const event = body.event || body.type || body.status || '';
    const data = body.data || body.purchase || body || {};

    // Aceitar eventos de compra aprovada
    const isApproved = event === 'purchase_approved' 
      || event === 'order.approved'
      || event === 'payment.approved'
      || String(event).includes('approv')
      || String(event).includes('paid')
      || String(event).includes('complet');

    if (!isApproved) {
      console.log('Evento ignorado:', event);
      return res.status(200).json({ ok: true, msg: 'Evento ignorado: ' + event });
    }

    // Tentar extrair email de vários formatos
    const nome = data?.customer?.name || data?.buyer?.name || data?.name || 'Aluno';
    const email = data?.customer?.email || data?.buyer?.email || data?.email || data?.customer_email;

    if (!email) {
      console.log('Email não encontrado. Body:', JSON.stringify(body));
      return res.status(200).json({ ok: true, msg: 'Email não encontrado no payload' });
    }

    const SB_URL = 'https://fbjxampsauqfngdennpi.supabase.co';
    const SB_SECRET = 'sb_secret_UIykqcvYhYwNWjf8Afrgdg_4jur-OWD';
    const SB_KEY = 'sb_publishable_RMqVdkC4rGHAJZEKitBqcA_yUwA9LYg';

    const supabaseAdmin = createClient(SB_URL, SB_SECRET, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Gerar senha
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    let senha = '';
    for (let i = 0; i < 10; i++) senha += chars[Math.floor(Math.random() * chars.length)];

    // Criar usuário
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome }
    });

    if (createError) {
      if (createError.message?.includes('already') || createError.code === 'email_exists') {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const user = listData?.users?.find(u => u.email === email);
        if (user) {
          await supabaseAdmin.auth.admin.updateUserById(user.id, { password: senha });
        }
      } else {
        console.error('Erro criar usuário:', createError);
        return res.status(200).json({ ok: true, error: createError.message });
      }
    }

    // Enviar e-mail
    const supabase = createClient(SB_URL, SB_KEY);
    await supabase.rpc('enviar_email_resend', {
      p_nome: nome,
      p_email: email,
      p_senha: senha
    });

    console.log('✅ Aluno criado:', nome, email);
    return res.status(200).json({ ok: true, email });

  } catch (e) {
    console.error('Erro:', e);
    return res.status(200).json({ ok: true, error: e.message });
  }
}
