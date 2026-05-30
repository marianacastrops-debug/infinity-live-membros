import { createClient } from '@supabase/supabase-js';

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

    if (event !== 'purchase_approved') {
      return res.status(200).json({ ok: true, msg: 'Evento ignorado: ' + event });
    }

    const nome = data?.customer?.name || 'Aluno';
    const email = data?.customer?.email;

    if (!email) return res.status(400).json({ error: 'Email não encontrado' });

    const SB_URL = 'https://fbjxampsauqfngdennpi.supabase.co';
    const SB_SECRET = 'sb_secret_UIykqcvYhYwNWjf8Afrgdg_4jur-OWD';
    const SB_KEY = 'sb_publishable_RMqVdkC4rGHAJZEKitBqcA_yUwA9LYg';

    // Criar cliente admin com secret key
    const supabaseAdmin = createClient(SB_URL, SB_SECRET, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Gerar senha
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    let senha = '';
    for (let i = 0; i < 10; i++) senha += chars[Math.floor(Math.random() * chars.length)];

    // Criar usuário via SDK admin
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome }
    });

    if (createError) {
      // Se já existe, atualizar a senha
      if (createError.message?.includes('already') || createError.code === 'email_exists') {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const user = listData?.users?.find(u => u.email === email);
        if (user) {
          await supabaseAdmin.auth.admin.updateUserById(user.id, { password: senha });
        }
      } else {
        console.error('Erro criar usuário:', createError);
        return res.status(500).json({ error: createError.message });
      }
    }

    // Enviar e-mail via RPC
    const supabase = createClient(SB_URL, SB_KEY);
    await supabase.rpc('enviar_email_resend', {
      p_nome: nome,
      p_email: email,
      p_senha: senha
    });

    console.log(`✅ Aluno criado: ${nome} (${email})`);
    return res.status(200).json({ ok: true, email });

  } catch (e) {
    console.error('Erro:', e);
    return res.status(500).json({ error: e.message });
  }
}
