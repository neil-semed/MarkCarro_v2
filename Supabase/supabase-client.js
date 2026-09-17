// ============================================================
// MARKCARRO - CONEXÃO SUPABASE (cliente único)
// ============================================================
// Este arquivo só monta o client oficial do Supabase (supabase-js).
// Todas as funções de acesso a dados (login, perfil, solicitações,
// KM, notificações, etc.) ficam em api.js, e usam ESTE client -
// assim, depois do login, toda chamada carrega automaticamente o
// token da sessão do usuário (exigido pelas policies de RLS).
//
// IMPORTANTE: antes desta correção existiam funções globais
// duplicadas (supabaseLogin, buscarPerfil, sbRequest, etc.) aqui E
// em api.js. Como api.js carrega depois, a versão dele sempre
// "vencia" - e essa versão fazia fetch cru só com a anon key, sem
// nunca reaproveitar o access_token da sessão. Resultado: toda
// consulta protegida por RLS (a começar pelo profiles logo após o
// login) voltava vazia. Esse arquivo agora só cria o client; as
// funções de API vivem exclusivamente em api.js.
// ============================================================

const SUPABASE_URL = window.CONFIG ? window.CONFIG.SUPABASE_URL : '';
const SUPABASE_ANON_KEY = window.CONFIG ? window.CONFIG.SUPABASE_ANON_KEY : '';

// window.supabase, antes de rodar esta linha, é a BIBLIOTECA do SDK
// (carregada via <script src=".../supabase-js@2">), que expõe
// .createClient(). Depois de criar o client, sobrescrevemos
// window.supabase para apontar para o CLIENT (instância), porque é
// assim que outras páginas (ex: pages/alterar-senha.js, que chama
// `supabase.auth.updateUser(...)`) esperam usá-lo.
const _supabaseLib = window.supabase;
const _supabase = _supabaseLib
  ? _supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!_supabase) {
  console.error('[MarkCarro] Biblioteca Supabase não carregada ou CONFIG ausente.');
}

window.supabase = _supabase;
