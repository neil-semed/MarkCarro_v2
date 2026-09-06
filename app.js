// ============================================================
// MARKCARRO - App Principal (orquestração)
// ============================================================

let usuarioAtual = null;
let cacheLocais = [];
let cacheUnidades = [];
let cacheCondutores = [];

document.addEventListener('DOMContentLoaded', async () => {
  await carregarDropdownsApoio();
  restaurarSessao();
});

async function carregarDropdownsApoio() {
  try {
    const [locais, unidades] = await Promise.all([listarLocais(), listarUnidades()]);
    cacheLocais = locais || [];
    cacheUnidades = unidades || [];
    
    preencherDropdownUnidades(document.getElementById('cad-unidade'), true);
    preencherDropdownUnidades(document.getElementById('sol-unidade'), false);
    
    document.getElementById('cad-setor').innerHTML = '<option value="">Selecione a Unidade primeiro</option>';
    
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
}

function abrirPainelGestor() {
  esconderTodasTelas();
  document.getElementById('tela-gestor').classList.remove('hidden');
  carregarPainelGestor();
}

function abrirNovaSolicitacao() {
  esconderTodasTelas();
  document.getElementById('tela-nova-solicitacao').classList.remove('hidden');
  prepararFormSolicitacao();
}

function abrirNovaSolicitacaoGestor() {
  esconderTodasTelas();
  document.getElementById('tela-nova-solicitacao').classList.remove('hidden');
  document.getElementById('bloco-solicitante-externo').classList.remove('hidden');
  prepararFormSolicitacao();
}

function abrirMinhasSolicitacoes() {
  esconderTodasTelas();
  document.getElementById('tela-minhas-solicitacoes').classList.remove('hidden');
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
  carregarAgendaCondutor();
}

function abrirRegistroKm() {
  esconderTodasTelas();
  document.getElementById('tela-registro-km').classList.remove('hidden');
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
  carregarPainelDoDia();
}

function voltarParaPainelGestor() {
  abrirPainelGestor();
}

// ============================================================
// Funções placeholder para páginas não implementadas ainda
// ============================================================

async function prepararFormSolicitacao() {
  // Carregar condutores para dropdown
  try {
    cacheCondutores = await listarCondutores();
  } catch (e) {
    console.warn('Erro ao carregar condutores:', e);
  }
}

async function carregarPainelGestor() {
  Components.Loading.show(document.getElementById('tb-gestor-geral'));
  try {
    const dados = await buscarTodasSolicitacoes();
    renderizarTabelaGestor(dados || []);
  } catch (e) {
    console.error('Erro:', e);
    Components.Toast.error('Erro ao carregar painel');
  }
}

function renderizarTabelaGestor(dados) {
  const tbody = document.getElementById('tb-gestor-geral');
  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="16" class="text-center text-slate-500 p-4">Nenhuma solicitação</td></tr>';
    return;
  }
  
  tbody.innerHTML = dados.map(s => `
    <tr>
      <td>${formatarDataHoraBR(s.data_solicitacao)}</td>
      <td>${formatarDataBR(s.data_viagem)}</td>
      <td>${formatarHoraBR(s.hora_saida)}</td>
      <td>${formatarHoraBR(s.hora_retorno)}</td>
      <td>${s.origem}</td>
      <td>${s.destino}</td>
      <td>${s.nome_ext || s.email_solicitante}</td>
      <td>${s.unidade || ''}</td>
      <td>${s.setor || ''}</td>
      <td>${s.justificativa}</td>
      <td>${s.tipo_viagem}</td>
      <td>${s.qtd_pessoas}</td>
      <td><span class="badge ${classeStatus(s.status)}">${s.status}</span></td>
      <td>${s.condutor_ida || ''}</td>
      <td>${s.condutor_volta || ''}</td>
      <td>
        <button class="btn-outline btn-sm" onclick="editarSolicitacaoGestor('${s.id}')">Editar</button>
      </td>
    </tr>
  `).join('');
}

async function carregarMinhasSolicitacoes() {
  if (!usuarioAtual) return;
  Components.Loading.show(document.getElementById('tb-minhas-solicitacoes'));
  try {
    const dados = await buscarSolicitacoesPorEmail(usuarioAtual.email);
    renderizarMinhasSolicitacoes(dados || []);
  } catch (e) {
    Components.Toast.error('Erro ao carregar solicitações');
  }
}

function renderizarMinhasSolicitacoes(dados) {
  const tbody = document.getElementById('tb-minhas-solicitacoes');
  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-slate-500 py-8">Nenhuma solicitação</td></tr>';
    return;
  }
  
  tbody.innerHTML = dados.map(s => `
    <tr>
      <td>${s.id}</td>
      <td>${formatarDataHoraBR(s.data_solicitacao)}</td>
      <td>${formatarDataBR(s.data_viagem)}</td>
      <td>${formatarHoraBR(s.hora_saida)} - ${formatarHoraBR(s.hora_retorno)}</td>
      <td>${s.origem} → ${s.destino}</td>
      <td>${s.justificativa}</td>
      <td><span class="badge ${classeStatus(s.status)}">${s.status}</span></td>
      <td>${s.condutor_ida || ''}</td>
      <td>${s.status === 'Pendente' || s.status === 'Em Análise' ? `<button class="btn-danger btn-sm" onclick="cancelarSolicitacao('${s.id}')">Cancelar</button>` : ''}</td>
    </tr>
  `).join('');
}

async function cancelarSolicitacao(id) {
  if (!confirm('Cancelar esta solicitação?')) return;
  try {
    await atualizarSolicitacao(id, { status: 'Desprezado' });
    Components.Toast.success('Solicitação cancelada');
    carregarMinhasSolicitacoes();
  } catch (e) {
    Components.Toast.error('Erro ao cancelar');
  }
}

// Placeholders para outras telas
async function carregarTelaAgenda() { Components.Toast.info('Em desenvolvimento'); }
async function carregarAgendaCondutor() { Components.Toast.info('Em desenvolvimento'); }
async function carregarRegistroKm() { Components.Toast.info('Em desenvolvimento'); }
async function carregarGerenciarCondutores() { Components.Toast.info('Em desenvolvimento'); }
async function carregarGerenciarKm() { Components.Toast.info('Em desenvolvimento'); }
async function carregarGerenciarUsuarios() { Components.Toast.info('Em desenvolvimento'); }
async function carregarPainelDoDia() { Components.Toast.info('Em desenvolvimento'); }
async function dispararEnvioAgendaEmail() { Components.Toast.info('Em desenvolvimento'); }
async function exportarSolicitacoesXlsxUI() { Components.Toast.info('Em desenvolvimento'); }
async function exportarMinhasSolicitacoesXlsxUI() { Components.Toast.info('Em desenvolvimento'); }
async function exportarCondutoresXlsxUI() { Components.Toast.info('Em desenvolvimento'); }

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
window.cancelarSolicitacao = cancelarSolicitacao;