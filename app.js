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
// CORREÇÃO (pedido do usuário, 5ª vez: "nome dos motoristas tem que
// aparecer nos cards"): cache SEPARADA de cacheCondutores, sem filtro de
// "ativo" - usada só pra RESOLVER NOME a partir do e-mail em telas que
// exibem viagens já confirmadas (Agenda de Corridas, Agenda Geral do
// Condutor, Viagens do Dia, Minhas Solicitações - ver
// listarCondutoresParaExibicao() em api.js). Antes essas telas
// reaproveitavam a MESMA cacheCondutores usada pra preencher o <select>
// de ATRIBUIR motorista (Gerenciamento de Solicitações/Nova Solicitação),
// que só traz condutor ATIVO - então, se o Dashboard do Gestor (ou
// qualquer outra tela) carregasse cacheCondutores primeiro nesta mesma
// sessão, as telas de exibição herdavam essa lista incompleta e nunca
// recarregavam (o "só busca se ainda está vazia" via bloqueado), fazendo
// o nome de qualquer condutor desativado depois (ou criado com "ativo"
// nulo pelo bug antigo do gatilho do banco) sumir e aparecer só o e-mail.
let cacheCondutoresParaExibicao = [];

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

// CORREÇÃO (urgente): "Origem"/"Destino" não carregavam os dados da
// tabela "locais". Causa real: listarLocais() (api.js) sempre retornou os
// registros INTEIROS da tabela (select('*') -> objetos {id, nome, ...}),
// mas esta função tratava cada item como se já fosse o texto do local
// (`${loc}`) - um objeto JS convertido pra string vira o texto literal
// "[object Object]", então os <option> até eram criados (não ficavam
// vazios), só que todos com esse texto/valor sem sentido, em vez do nome
// real do local. "origem"/"destino" na tabela "solicitacoes" são texto
// livre (mesma coluna aceita tanto um local da lista quanto "Outro"), por
// isso o valor certo do <option> é o nome do local (loc.nome), não o
// objeto inteiro nem o id.
function preencherDropdownLocais(selectElem) {
  if (!selectElem) return;
  selectElem.innerHTML = '<option value="">Selecione...</option>';
  cacheLocais.forEach(loc => {
    const nome = (typeof loc === 'string') ? loc : (loc?.nome || '');
    if (!nome) return;
    selectElem.innerHTML += `<option value="${nome}">${nome}</option>`;
  });
  selectElem.innerHTML += '<option value="Outro">Outro local</option>';
}

// ============================================================
// Navegação entre telas
// ============================================================

function esconderTodasTelas() {
  document.querySelectorAll('#main-content > div[id^="tela-"]').forEach(el => el.classList.add('hidden'));
  fecharMenuMobile();
  fecharMenuLateral();

  // CORREÇÃO (item 8 do lote do admin - "ao clicar no botão voltar ao
  // painel, vai para dashboard, sem acesso ao painel de viagens"): a troca
  // de tela nunca resetava a posição de rolagem. Como o Dashboard é uma
  // tela longa (KPIs + 5 gráficos + tabela de Gerenciamento de
  // Solicitações), voltar de uma tela como Agenda de Corridas - onde o
  // usuário normalmente rolou bastante pra ver a tabela - podia deixar a
  // janela "presa" no meio ou no fim do Dashboard, dando a impressão de
  // que a tabela de viagens tinha sumido/não carregava, quando na
  // verdade só estava fora da área visível. Rolar pro topo a cada troca
  // de tela resolve isso pra todas as telas, não só o Dashboard.
  window.scrollTo(0, 0);
  document.getElementById('main-content')?.scrollTo?.(0, 0);
}

// ============================================================
// Menu lateral (gaveta) - Condutor/Solicitante no celular
// ============================================================
// #sidebar-nav é uma gaveta off-canvas (position:fixed, deslizando da
// esquerda - ver <style> no index.html) que só existe no celular; some
// inteiro no PC via media query, onde esses dois perfis usam a barra de
// pílulas fixa no topo (#header-nav-admin) em vez disto. O botão ☰
// (#btn-menu-lateral, também md:hidden) chama toggleMenuLateral(); o fundo
// escuro (#sidebar-backdrop) e qualquer navegação (via esconderTodasTelas,
// acima) fecham a gaveta automaticamente.
function abrirMenuLateral() {
  document.getElementById('sidebar-nav')?.classList.add('menu-lateral-aberto');
  document.getElementById('sidebar-backdrop')?.classList.add('menu-lateral-aberto');
}

function fecharMenuLateral() {
  document.getElementById('sidebar-nav')?.classList.remove('menu-lateral-aberto');
  document.getElementById('sidebar-backdrop')?.classList.remove('menu-lateral-aberto');
}

function toggleMenuLateral() {
  const aberto = document.getElementById('sidebar-nav')?.classList.contains('menu-lateral-aberto');
  if (aberto) fecharMenuLateral();
  else abrirMenuLateral();
}

window.abrirMenuLateral = abrirMenuLateral;
window.fecharMenuLateral = fecharMenuLateral;
window.toggleMenuLateral = toggleMenuLateral;

function abrirPainelGestor() {
  esconderTodasTelas();
  document.getElementById('tela-gestor').classList.remove('hidden');
  marcarAbaAtiva('gestor');
  carregarDashboardGestor();
}

// CORREÇÃO: "Gerenciamento de Solicitações" (Confirmar/Ocupado/Cancelar/
// atribuir condutor) morava dentro da mesma tela do Dashboard - a pedido
// do usuário, agora é uma tela própria (ver pages/gerenciamento-
// solicitacoes.js e o pill #btn-gerenciamento-solicitacoes no topo).
function abrirGerenciamentoSolicitacoes() {
  esconderTodasTelas();
  document.getElementById('tela-gerenciamento-solicitacoes').classList.remove('hidden');
  marcarAbaAtiva('gerenciamento-solicitacoes');
  carregarGerenciamentoSolicitacoes();
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
  marcarAbaAtiva('agenda');
  carregarTelaAgenda();
}

function abrirAgendaCombinada() {
  esconderTodasTelas();
  document.getElementById('tela-agenda-combinada').classList.remove('hidden');
  marcarAbaAtiva('agenda-combinada');
  carregarAgendaCombinada();
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
  marcarAbaAtiva('gerenciar-condutores');
  carregarGerenciarCondutores();
}

function abrirGerenciarKm() {
  esconderTodasTelas();
  document.getElementById('tela-gerenciar-km').classList.remove('hidden');
  marcarAbaAtiva('gerenciar-km');
  carregarGerenciarKm();
}

function abrirGerenciarUsuarios() {
  esconderTodasTelas();
  document.getElementById('tela-gerenciar-usuarios').classList.remove('hidden');
  marcarAbaAtiva('gerenciar-usuarios');
  carregarGerenciarUsuarios();
}

function abrirGerenciarUnidades() {
  esconderTodasTelas();
  document.getElementById('tela-gerenciar-unidades').classList.remove('hidden');
  marcarAbaAtiva('gerenciar-unidades');
  carregarGerenciarUnidades();
}

function abrirGerenciarCooperativas() {
  esconderTodasTelas();
  document.getElementById('tela-gerenciar-cooperativas').classList.remove('hidden');
  marcarAbaAtiva('gerenciar-cooperativas');
  carregarGerenciarCooperativas();
}

function abrirGerenciarPerfisAcesso() {
  esconderTodasTelas();
  document.getElementById('tela-gerenciar-perfis-acesso').classList.remove('hidden');
  marcarAbaAtiva('gerenciar-perfis-acesso');
  carregarGerenciarPerfisAcesso();
}

function abrirPainelDoDia() {
  esconderTodasTelas();
  document.getElementById('tela-painel-dia').classList.remove('hidden');
  marcarAbaAtiva('painel-dia');
  carregarPainelDoDia();
}

function abrirProximasAgendas() {
  esconderTodasTelas();
  document.getElementById('tela-proximas-agendas').classList.remove('hidden');
  marcarAbaAtiva('proximas-agendas');
  carregarProximasAgendas();
}

function voltarParaPainelGestor() {
  esconderTodasTelas();
  document.getElementById('tela-gestor').classList.remove('hidden');
  marcarAbaAtiva('gestor');
  // CORREÇÃO (item 8): "Voltar ao Painel" chamava abrirPainelGestor(), que
  // por sua vez chama carregarDashboardGestor() SEM forçar atualização. Se
  // o Dashboard já tinha sido aberto antes, essa função tem uma proteção
  // que pula o recarregamento (pra não piscar a tela ao só trocar de aba) -
  // só que isso também significava não reaplicar os filtros/recontar os
  // KPIs depois de mudanças feitas em outras telas (ex.: confirmar uma
  // corrida em Gerenciamento de Solicitações). Forçando com "true" aqui
  // garante que, especificamente ao VOLTAR de outra tela, os KPIs e
  // gráficos sempre venham atualizados.
  carregarDashboardGestor(true);
}

// prepararFormSolicitacao vive em pages/nova-solicitacao.js (reseta o
// formulário e carrega a lista de condutores) - não redeclarar aqui.

// ============================================================
// Barra de navegação inferior (mobile) - ver setupBottomNav em
// components.js / marcação de aba ativa
// ============================================================

function marcarAbaAtiva(nomeAba) {
  document.querySelectorAll('#bottom-nav [data-aba]').forEach(el => {
    // PEDIDO DO USUÁRIO ("Hoje - dar destaque de cor diferente"): a aba
    // "painel-dia" (Hoje, Condutor) tem cor própria (verde) SEMPRE, esteja
    // selecionada ou não - diferente das demais abas, que só ficam azuis
    // quando selecionadas e cinza quando não.
    if (el.dataset.aba === 'painel-dia') {
      el.classList.remove('text-mc-azul', 'text-slate-400');
      el.classList.add('text-mc-verde');
      return;
    }
    el.classList.toggle('text-mc-azul', el.dataset.aba === nomeAba);
    el.classList.toggle('text-slate-400', el.dataset.aba !== nomeAba);
  });
  // Pílulas de navegação do Gestor no topo (ver header-nav-admin no HTML) -
  // a pílula da tela aberta fica "preenchida" (classe .active), o resto
  // fica no estilo contorno.
  document.querySelectorAll('#header-nav-admin [data-aba]').forEach(el => {
    el.classList.toggle('active', el.dataset.aba === nomeAba);
  });
  // Menu lateral (PC, Condutor/Solicitante) - mesmo princípio: destaca a
  // pílula da tela aberta no momento.
  document.querySelectorAll('#sidebar-nav [data-aba]').forEach(el => {
    el.classList.toggle('active', el.dataset.aba === nomeAba);
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
window.abrirGerenciamentoSolicitacoes = abrirGerenciamentoSolicitacoes;
window.abrirNovaSolicitacao = abrirNovaSolicitacao;
window.abrirNovaSolicitacaoGestor = abrirNovaSolicitacaoGestor;
window.abrirMinhasSolicitacoes = abrirMinhasSolicitacoes;
window.abrirAgenda = abrirAgenda;
window.abrirAgendaCondutor = abrirAgendaCondutor;
window.abrirRegistroKm = abrirRegistroKm;
window.abrirGerenciarCondutores = abrirGerenciarCondutores;
window.abrirGerenciarKm = abrirGerenciarKm;
window.abrirGerenciarUsuarios = abrirGerenciarUsuarios;
window.abrirGerenciarUnidades = abrirGerenciarUnidades;
window.abrirGerenciarCooperativas = abrirGerenciarCooperativas;
window.abrirGerenciarPerfisAcesso = abrirGerenciarPerfisAcesso;
window.abrirPainelDoDia = abrirPainelDoDia;
window.abrirProximasAgendas = abrirProximasAgendas;
window.voltarParaPainelGestor = voltarParaPainelGestor;
