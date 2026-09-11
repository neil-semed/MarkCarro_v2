// ============================================================
// MARKCARRO - Service Worker
// ============================================================
// Objetivo único: deixar o app instalável e abrir mais rápido/funcionar
// offline para o "esqueleto" (HTML/CSS/JS próprios). NÃO cacheia chamadas
// ao Supabase nem bibliotecas de CDN - dados e libs sempre vêm da rede,
// pra nunca mostrar informação desatualizada (agenda, status de corrida
// etc. mudam o tempo todo). Se a rede cair no meio de uma navegação, cai
// pro cache do app shell; se não tiver nada em cache, deixa o erro normal
// do navegador acontecer.

// IMPORTANTE: sempre que qualquer arquivo do app shell mudar (qualquer .js
// da lista abaixo, index.html etc.), troque este valor. O service worker
// só limpa o cache antigo (função "activate" abaixo) quando este texto
// muda - sem isso, quem já tinha o app aberto/instalado antes fica preso
// vendo os arquivos antigos em cache pra sempre (o "stale" do
// stale-while-revalidate nunca convergia, porque o navegador nem
// verificava se havia um Service Worker novo). Mantenha em sincronia com
// o "?v=" usado nos <script> do index.html.
const CACHE_VERSION = 'markcarro-v20260908i';

const ARQUIVOS_APP_SHELL = [
  './',
  './index.html',
  './config.js',
  './supabase-client.js',
  './api.js',
  './utils.js',
  './components.js',
  './app.js',
  './pages/login.js',
  './pages/cadastro.js',
  './pages/nova-solicitacao.js',
  './pages/minhas-solicitacoes.js',
  './pages/dashboard-solicitante.js',
  './pages/agenda.js',
  './pages/agenda-condutor.js',
  './pages/registro-km.js',
  './pages/painel-dia.js',
  './pages/gestor.js',
  './pages/gerenciar-condutores.js',
  './pages/gerenciar-km.js',
  './pages/gerenciar-usuarios.js',
  './pages/gerenciar-unidades.js',
  './pages/alterar-senha.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ARQUIVOS_APP_SHELL))
      .catch(erro => console.warn('[SW] Falha ao pré-cachear:', erro))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then(nomes =>
      Promise.all(nomes.filter(n => n !== CACHE_VERSION).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

function ehChamadaExterna(url) {
  // Supabase (dados/auth) e qualquer CDN (Tailwind, Chart.js, SheetJS,
  // Supabase JS, Bootstrap, fontes) - tudo isso sempre direto da rede.
  return url.hostname.includes('supabase.co')
    || url.origin !== self.location.origin;
}

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);

  if (evento.request.method !== 'GET' || ehChamadaExterna(url)) {
    return; // deixa passar direto pra rede, sem interceptar
  }

  evento.respondWith(
    caches.match(evento.request).then(respostaCache => {
      const buscaRede = fetch(evento.request)
        .then(respostaRede => {
          if (respostaRede && respostaRede.ok) {
            const copia = respostaRede.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(evento.request, copia));
          }
          return respostaRede;
        })
        .catch(() => respostaCache); // offline: usa o que tiver em cache

      // Stale-while-revalidate: responde rápido com o cache (se existir)
      // e atualiza o cache em segundo plano.
      return respostaCache || buscaRede;
    })
  );
});
