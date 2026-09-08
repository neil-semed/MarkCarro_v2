// ============================================================
// MARKCARRO - App Principal (orquestração de telas)
// ============================================================
// IMPORTANTE: este arquivo carrega por ÚLTIMO (depois de todo pages/*.js).
// Por isso ele NÃO deve redeclarar nenhuma função que já existe em
// pages/*.js - JS não tem módulos aqui, então "function foo(){}" repetida
// em outro <script> simplesmente substitui a anterior no objeto global, e
// quem carrega por último vence. A versão anterior deste arquivo continha
// vários stubs "Em desenvolvimento" (carregarTelaAgenda, carregarRegistroKm,
// carregarGerenciarCondutores, carregarGerenciarUsuarios, carregarPainelDoDia
// etc.) que SUBSTITUÍAM silenciosamente as implementações reais e completas
// de pages/agenda.js, pages/registro-km.js, pages/gerenciar-*.js - ou seja,
// aquelas telas nunca funcionavam, mesmo com o HTML e a lógica prontos.
// Também havia uma segunda cópia de carregarPainelGestor/renderizarTabelaGestor
// e de carregarMinhasSolicitacoes/renderizarMinhasSolicitacoes aqui, mais
// simples, que sobrescrevia as versões completas de pages/gestor.js e
// pages/minhas-solicitacoes.js (perdendo edição inline, atribuição de
// condutor, filtros, cards mobile, exportação etc). Tudo isso foi removido.
// Este arquivo agora só cuida de: carregar dropdowns de apoio (compartilhados
// entre várias telas) e abrir/fechar telas (navegação).
// ============================================================

// usuarioAtual declarado em pages/login.js (carrega antes)
let cacheLocais = [];
let cacheUnidades = [];
let cacheCondutores = [];

document.addEventListener('DOMContentLoaded', async () => {
  await carregarDropdownsApoio();
  restaurarSessao();
  registrarServiceWorker();
  configurarInstalacaoPWA();
});

async function carregarDropdownsApoio() {
  try {
    const [locais, unidades] = await Promise.all([listarLocais(), listarUnidades()]);
    cacheLocais = locais || [];
    cacheUnidades = unidades || [];

    preencherDropdownUnidades(document.getElementById('cad-unidade'), true);
    preencherDropdownUnidades(document.getElementById('sol-unidade'), false);

    document.getElementById('cad-setor').innerHTML = '<option value="">Selecione a Unidade primeiro</option>';

    const datalistUnidades = document.getElementById('lista-unidades-existentes');
    if (datalistUnidades) datalistUnidades.innerHTML = cacheUnidades.map(u => `<option value="${u}"></option>`).join('');

    preencherDropdownLocais(document.getElementById('sol-origem'));
    preencherDropdownLocais(document.getElementById('sol-destino'));
  } catch (erro) {
    console.error('Erro ao carregar dropdowns:', erro);
    Components.Toast.error('Erro ao carregar dados de apoio');
  }
}

function preencherDropdownUnidades(selectElem, comOpcaoOutro) {
  if (!selectElem) return;
  selectElem.innerHTML = '<option value="">Selecione a Unidade...</option>';
  cacheUnidades.forEach(u => selectElem.innerHTML += `<option value="${u}">${u}</option>`);
  if (comOpcaoOutro) selectElem.innerHTML += '<option value="Outro">Outra Unidade</option>';
}

function preencherDropdownLocais(selectElem) {
  if (!selectElem) return;
  selectElem.innerHTML = '<option value="">Selecione...</option>';
  cacheLocais.forEach(loc => selectElem.innerHTML += `<option value="${loc}">${loc}</option>`);
  selectElem.innerHTML += '<option value="Outro">Outro local</option>';
}

// ============================================================
// Navegação entre telas
// ============================================================

function esconderTodasTelas() {
  document.querySelectorAll('#main-content > div[id^="tela-"]').forEach(el => el.classList.add('hidden'));
  fecharMenuMobile();
}

function abrirPainelGestor() {
  esconderTodasTelas();
  document.getElementById('tela-gestor').classList.remove('hidden');
  marcarAbaAtiva('gestor');
  carregarPainelGestor();
}

function abrirNovaSolicitacao() {
  esconderTodasTelas();
  document.getElementById('bloco-solicitante-externo').classList.add('hidden');
  document.getElementById('tela-nova-solicitacao').classList.remove('hidden');
  marcarAbaAtiva('nova-solicitacao');
  prepararFormSolicitacao();
}

function abrirNovaSolicitacaoGestor() {
  esconderTodasTelas();
  document.getElementById('tela-nova-solicitacao').classList.remove('hidden');
  document.getElementById('bloco-solicitante-externo').classList.remove('hidden');
  marcarAbaAtiva('nova-solicitacao');
  prepararFormSolicitacao();
}

function abrirMinhasSolicitacoes() {
  esconderTodasTelas();
  document.getElementById('tela-minhas-solicitacoes').classList.remove('hidden');
  marcarAbaAtiva('minhas-solicitacoes');
  carregarMinhasSolicitacoes();
}

function abrirAgenda() {
  esconderTodasTelas();
  document.getElementById('tela-agenda').classList.remove('hidden');
  carregarTelaAgenda();
}

function abrirAgendaCondutor() {
  esconderTodasTelas();
  document.getElementById('tela-agenda-condutor').classList.remove('hidden');
  marcarAbaAtiva('agenda-condutor');
  carregarAgendaCondutor();
}

function abrirRegistroKm() {
  esconderTodasTelas();
  document.getElementById('tela-registro-km').classList.remove('hidden');
  marcarAbaAtiva('registro-km');
  carregarRegistroKm();
}

function abrirGerenciarCondutores() {
  esconderTodasTelas();
  document.getElementById('tela-gerenciar-condutores').classList.remove('hidden');
  carregarGerenciarCondutores();
}

function abrirGerenciarKm() {
  esconderTodasTelas();
  document.getElementById('tela-gerenciar-km').classList.remove('hidden');
  carregarGerenciarKm();
}

function abrirGerenciarUsuarios() {
  esconderTodasTelas();
  document.getElementById('tela-gerenciar-usuarios').classList.remove('hidden');
  carregarGerenciarUsuarios();
}

function abrirPainelDoDia() {
  esconderTodasTelas();
  document.getElementById('tela-painel-dia').classList.remove('hidden');
  marcarAbaAtiva('painel-dia');
  carregarPainelDoDia();
}

function voltarParaPainelGestor() {
  abrirPainelGestor();
}

// prepararFormSolicitacao vive em pages/nova-solicitacao.js (reseta o
// formulário e carrega a lista de condutores) - não redeclarar aqui.

// ============================================================
// Barra de navegação inferior (mobile) - ver setupBottomNav em
// components.js / marcação de aba ativa
// ============================================================

function marcarAbaAtiva(nomeAba) {
  document.querySelectorAll('#bottom-nav [data-aba]').forEach(el => {
    el.classList.toggle('text-mc-azul', el.dataset.aba === nomeAba);
    el.classList.toggle('text-slate-400', el.dataset.aba !== nomeAba);
  });
}

function fecharMenuMobile() {
  document.getElementById('usuario-dropdown')?.classList.add('hidden');
  document.getElementById('painel-notificacoes')?.classList.add('hidden');
}

// ============================================================
// PWA - Service Worker + prompt de instalação
// ============================================================
// O app funciona normalmente sem isso (navegador comum). O que isso
// adiciona: o navegador passa a oferecer "Instalar app" / "Adicionar à
// tela inicial" (ícone próprio, tela cheia, sem barra de endereço) e um
// cache básico do "esqueleto" do app pra abrir mais rápido em conexão
// ruim. Continua sendo o mesmo site hospedado no GitHub Pages - "não
// hospedado" aqui só no sentido de não precisar de loja de aplicativos.

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(erro => {
      console.warn('[MarkCarro] Service worker não registrado:', erro);
    });
  });
}

let _pwaInstallEvent = null;

function configurarInstalacaoPWA() {
  const banner = document.getElementById('pwa-install-banner');
  const btnInstalar = document.getElementById('btn-pwa-install');
  const btnFechar = document.getElementById('btn-pwa-dismiss');
  if (!banner || !btnInstalar || !btnFechar) return;

  // Se o usuário já dispensou o convite nesta sessão, não repete.
  const jaDispensado = sessionStorage.getItem('markcarro_pwa_dispensado') === '1';

  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    _pwaInstallEvent = evento;
    if (!jaDispensado) banner.classList.remove('hidden');
  });

  btnInstalar.addEventListener('click', async () => {
    if (!_pwaInstallEvent) return;
    banner.classList.add('hidden');
    _pwaInstallEvent.prompt();
    await _pwaInstallEvent.userChoice;
    _pwaInstallEvent = null;
  });

  btnFechar.addEventListener('click', () => {
    banner.classList.add('hidden');
    sessionStorage.setItem('markcarro_pwa_dispensado', '1');
  });

  window.addEventListener('appinstalled', () => {
    banner.classList.add('hidden');
    Components.Toast?.success('MarkCarro instalado! Procure o ícone na sua tela inicial.');
  });
}

// Expor globalmente
window.abrirPainelGestor = abrirPainelGestor;
window.abrirNovaSolicitacao = abrirNovaSolicitacao;
window.abrirNovaSolicitacaoGestor = abrirNovaSolicitacaoGestor;
window.abrirMinhasSolicitacoes = abrirMinhasSolicitacoes;
window.abrirAgenda = abrirAgenda;
window.abrirAgendaCondutor = abrirAgendaCondutor;
window.abrirRegistroKm = abrirRegistroKm;
window.abrirGerenciarCondutores = abrirGerenciarCondutores;
window.abrirGerenciarKm = abrirGerenciarKm;
window.abrirGerenciarUsuarios = abrirGerenciarUsuarios;
window.abrirPainelDoDia = abrirPainelDoDia;
window.voltarParaPainelGestor = voltarParaPainelGestor;
