// Portão de senha do site, rodando na Vercel antes de qualquer arquivo ser entregue.
// A senha fica na variável de ambiente SITE_SENHA (configurada no painel da Vercel),
// nunca no código. Quem acerta uma vez ganha um cookie que vale por um ano.
// Sem SITE_SENHA configurada, o site fica aberto (para não trancar ninguém por engano).

export const config = {
  matcher: '/((?!favicon\\.ico|favicon-16\\.png|favicon-32\\.png|apple-touch-icon\\.png|icons/).*)',
};

const COOKIE = 'grimorio_chave';
const UM_ANO = 60 * 60 * 24 * 365;

function seguir() {
  return new Response(null, { headers: { 'x-middleware-next': '1' } });
}

async function chaveDe(senha) {
  const dados = new TextEncoder().encode('grimorio-das-trevas:' + senha);
  const hash = await crypto.subtle.digest('SHA-256', dados);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function lerCookie(req, nome) {
  const linha = req.headers.get('cookie') || '';
  for (const parte of linha.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return v.join('=');
  }
  return '';
}

export default async function middleware(req) {
  const senha = process.env.SITE_SENHA;
  const url = new URL(req.url);
  // Diagnóstico: diz se o portão está rodando e se achou a senha (nunca mostra a senha).
  if (url.pathname === '/portao') {
    return new Response(JSON.stringify({ portao: 'rodando', senhaConfigurada: !!senha }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  if (!senha) return seguir();

  const certa = await chaveDe(senha);

  if (url.pathname === '/entrar' && req.method === 'POST') {
    const form = await req.formData().catch(() => null);
    const tentativa = String(form?.get('senha') ?? '');
    if (tentativa && (await chaveDe(tentativa)) === certa) {
      return new Response(null, {
        status: 303,
        headers: {
          location: '/',
          'set-cookie': `${COOKIE}=${certa}; Path=/; Max-Age=${UM_ANO}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return pagina(true);
  }

  if (lerCookie(req, COOKIE) === certa) return seguir();

  // Arquivos (dados, scripts) sem a chave: só um 401 seco, sem a tela.
  const ehPagina = !/\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.endsWith('.html');
  if (!ehPagina) return new Response('Acesso restrito.', { status: 401, headers: { 'cache-control': 'no-store' } });
  return pagina(false);
}

function pagina(errou) {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Grimório das Trevas</title>
<link rel="icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 16px; background: #121012; color: #EDE6DA; font-family: Figtree, system-ui, sans-serif; }
  form { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 14px; padding: 28px 24px; border-radius: 20px; background: #1C181B; border: 1px solid #2A2327; }
  .sigla { width: 56px; height: 56px; border-radius: 16px; background: #9E1F2C; color: #fff; display: flex; align-items: center; justify-content: center; font: 700 32px 'Cormorant Garamond', serif; }
  .eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #A99E93; margin: 0; }
  h1 { margin: -8px 0 0; font: 700 34px 'Cormorant Garamond', serif; line-height: 1; }
  p { margin: 0; font-size: 14px; line-height: 1.45; color: #C9B8AE; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; }
  input { height: 48px; padding: 0 14px; border-radius: 12px; border: 1px solid #3A3136; background: #121012; color: #EDE6DA; font: 16px Figtree, sans-serif; }
  input:focus { outline: 2px solid #C43A47; outline-offset: 1px; }
  button { height: 50px; border: 0; border-radius: 14px; background: #9E1F2C; color: #fff; font: 600 16px Figtree, sans-serif; cursor: pointer; }
  button:hover { background: #B32A38; }
  .erro { padding: 10px 12px; border-radius: 10px; background: #3A1C20; color: #F08A90; font-size: 13px; }
  .nota { font-size: 12px; color: #A99E93; }
</style>
</head>
<body>
<form method="post" action="/entrar">
  <div class="sigla" aria-hidden="true">G</div>
  <p class="eyebrow">Mundo das Trevas</p>
  <h1>Grimório das Trevas</h1>
  <p>Site fechado do nosso grupo. Digite a senha que o narrador passou.</p>
  ${errou ? '<div class="erro" role="alert">Senha errada. Tente de novo.</div>' : ''}
  <label>Senha
    <input type="password" name="senha" autocomplete="current-password" required autofocus>
  </label>
  <button type="submit">Entrar</button>
  <p class="nota">Só precisa digitar uma vez neste aparelho e navegador.</p>
</form>
</body>
</html>`;
  return new Response(html, {
    status: errou ? 401 : 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });
}
