// ============================================================
// MARKCARRO - Página: Minhas Solicitações (Solicitante)
// ============================================================
// Reescrita mobile-first: além da tabela (desktop), agora tem uma versão em
// cards pra tela pequena, filtro por status, exportação real em Excel
// (usando a biblioteca SheetJS que já estava carregada no index.html mas
// nunca era usada) e o gráfico de Pareto (o canvas já existia no HTML, mas
// nenhum arquivo .js desenhava nada nele).

let cacheMinhasSolicitacoes = [];
let cacheCondutoresParaExibicao = [];

async function carregarMinhasSolicitacoes() {
  if (!usuarioAtual) return;
  const tbody = document.getElementById('tb-minhas-solicitacoes');
  const cards = document.getElementById('cards-minhas-solicitacoes');
  Components.Loading.show(tbody);
  if (cards) cards.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Carregando...</div>';

  try {
    const [dados, condutores] = await Promise.all([
      buscarSolicitacoesPorEmail(usuarioAtual.email),
      listarCondutores().catch(() => [])
    ]);
    cacheMinhasSolicitacoes = dados || [];
    cacheCondutoresParaExibicao = condutores || [];
    aplicarFiltroMinhasSolicitacoes();
  } catch (e) {
    Components.Toast.error('Erro ao carregar solicitações');
  }
}

// Mostra nome/código/telefone do condutor em vez do e-mail cru (equivalente
// ao "condutorIdaCodigo" do sistema antigo em Apps Script).
function descreverCondutor(email) {
  if (!email) return 'Condutor ainda não atribuído';
  const c = cacheCondutoresParaExibicao.find(x => x.email === email);
  if (!c) return email;
  let texto = c.nome;
  if (c.capacidade) texto += ` (${c.capacidade})`;
  if (c.telefone) texto += ` · ${c.telefone}`;
  return texto;
}

// Filtros completos (igual ao esboço de referência): Data da Solicitação,
// Data da Viagem, Horário de Saída, Origem/Destino (busca livre), Status e
// Condutor (busca livre pelo nome já traduzido por descreverCondutor, não
// pelo e-mail cru). Antes só existia o filtro de Status.
function aplicarFiltroMinhasSolicitacoes() {
  const dataSolic = document.getElementById('filtro-minhas-solic-data-solic')?.value;
  const dataViagem = document.getElementById('filtro-minhas-solic-data-viagem')?.value;
  const horario = document.getElementById('filtro-minhas-solic-horario')?.value;
  const trajeto = (document.getElementById('filtro-minhas-solic-trajeto')?.value || '').trim().toLowerCase();
  const status = document.getElementById('filtro-minhas-solic-status')?.value || 'TODOS';
  const condutorBusca = (document.getElementById('filtro-minhas-solic-condutor')?.value || '').trim().toLowerCase();

  let filtradas = cacheMinhasSolicitacoes;
  if (dataSolic) filtradas = filtradas.filter(s => (s.data_solicitacao || '').slice(0, 10) === dataSolic);
  if (dataViagem) filtradas = filtradas.filter(s => s.data_viagem === dataViagem);
  if (horario) filtradas = filtradas.filter(s => (s.hora_saida || '').slice(0, 5) === horario);
  if (trajeto) filtradas = filtradas.filter(s => `${s.origem || ''} ${s.destino || ''}`.toLowerCase().includes(trajeto));
  if (status !== 'TODOS') filtradas = filtradas.filter(s => s.status === status);
  if (condutorBusca) filtradas = filtradas.filter(s => descreverCondutor(s.condutor_ida).toLowerCase().includes(condutorBusca));

  renderizarMinhasSolicitacoes(filtradas);
}

function limparFiltrosMinhasSolicitacoes() {
  document.getElementById('filtro-minhas-solic-data-solic').value = '';
  document.getElementById('filtro-minhas-solic-data-viagem').value = '';
  document.getElementById('filtro-minhas-solic-horario').value = '';
  document.getElementById('filtro-minhas-solic-trajeto').value = '';
  document.getElementById('filtro-minhas-solic-status').value = 'TODOS';
  document.getElementById('filtro-minhas-solic-condutor').value = '';
  aplicarFiltroMinhasSolicitacoes();
}

function renderizarMinhasSolicitacoes(dados) {
  const tbody = document.getElementById('tb-minhas-solicitacoes');
  const cards = document.getElementById('cards-minhas-solicitacoes');

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-slate-500 py-8">Nenhuma solicitação</td></tr>';
    if (cards) cards.innerHTML = '<div class="text-center text-slate-500 py-8 text-sm">Nenhuma solicitação encontrada.</div>';
    return;
  }

  tbody.innerHTML = dados.map(s => `
    <tr>
      <td><small>${s.id}</small></td>
      <td>${formatarDataHoraBR(s.data_solicitacao)}</td>
      <td>${formatarDataBR(s.data_viagem)}</td>
      <td>${formatarHoraBR(s.hora_saida)} - ${formatarHoraBR(s.hora_retorno)}</td>
      <td>${s.origem} → ${s.destino}</td>
      <td>${s.justificativa || ''}</td>
      <td><span class="badge ${classeStatus(s.status)}">${s.status}</span></td>
      <td>${descreverCondutor(s.condutor_ida)}</td>
      <td>${podeCancelarSolicitacao(s) ? `<button class="btn-danger btn-sm" onclick="cancelarSolicitacao('${s.id}')">Cancelar</button>` : ''}</td>
    </tr>
  `).join('');

  if (cards) {
    cards.innerHTML = dados.map(s => `
      <div class="card p-4 mb-3">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <p class="font-bold text-slate-900">${formatarDataBR(s.data_viagem)}</p>
            <p class="text-xs text-slate-500">${formatarHoraBR(s.hora_saida)} - ${formatarHoraBR(s.hora_retorno)}</p>
          </div>
          <span class="badge ${classeStatus(s.status)} shrink-0">${s.status}</span>
        </div>
        <p class="text-sm text-slate-800 mb-1 break-words">${s.origem} <span class="text-slate-400">→</span> ${s.destino}</p>
        ${s.justificativa ? `<p class="text-xs text-slate-500 mb-2">${s.justificativa}</p>` : ''}
        <p class="text-xs text-slate-500 mb-2">🚗 ${descreverCondutor(s.condutor_ida)}</p>
        ${podeCancelarSolicitacao(s) ? `<button class="btn-danger btn-sm w-full" onclick="cancelarSolicitacao('${s.id}')">Cancelar solicitação</button>` : ''}
      </div>
    `).join('');
  }
}

// Solicitante só pode cancelar enquanto a viagem não foi decidida (Pendente
// ou Em Análise) E enquanto faltar mais de 30 minutos para o horário de
// saída - mesmas duas regras do sistema antigo em Apps Script
// (podeCancelarSolicitacao). Sem data/hora de saída definidas, libera o
// cancelamento (não há como calcular o prazo).
function podeCancelarSolicitacao(s) {
  if (s.status !== 'Pendente' && s.status !== 'Em Análise') return false;
  if (!s.data_viagem || !s.hora_saida) return true;

  const dataHoraSaida = new Date(`${s.data_viagem}T${s.hora_saida.substring(0, 5)}:00`);
  if (isNaN(dataHoraSaida.getTime())) return true;

  const TRINTA_MINUTOS_MS = 30 * 60 * 1000;
  return (dataHoraSaida.getTime() - Date.now()) > TRINTA_MINUTOS_MS;
}

// Cancelamento pelo próprio solicitante usa o status "Desprezado" - distinto
// de "Cancelada" (que é reservado para quando o GESTOR cancela a corrida).
// Também avisa todos os gestores pelo sino, como o sistema antigo fazia por
// e-mail (notificarTodosGestores).
async function cancelarSolicitacao(id) {
  if (!confirm('Cancelar esta solicitação?')) return;

  const solicitacao = cacheMinhasSolicitacoes.find(s => String(s.id) === String(id));
  if (solicitacao && !podeCancelarSolicitacao(solicitacao)) {
    return Components.Toast.error('Não é mais possível cancelar: faltam menos de 30 minutos para a saída.');
  }

  try {
    await atualizarSolicitacao(id, { status: 'Desprezado' });
    Components.Toast.success('Solicitação cancelada');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      notificarTodosGestores(
        `${usuarioAtual.nome} cancelou a solicitação de ${quando} (${trecho}).`,
        'cancelamento_solicitante'
      ).catch(e => console.warn('Erro ao notificar gestores:', e));
    }

    carregarMinhasSolicitacoes();
  } catch (e) {
    Components.Toast.error('Erro ao cancelar');
  }
}

function exportarMinhasSolicitacoesXlsxUI() {
  if (typeof XLSX === 'undefined') {
    Components.Toast.error('Biblioteca de exportação não carregada');
    return;
  }
  if (!cacheMinhasSolicitacoes.length) {
    Components.Toast.warning('Não há solicitações para exportar');
    return;
  }

  const linhas = cacheMinhasSolicitacoes.map(s => ({
    'ID': s.id,
    'Solicitado em': formatarDataHoraBR(s.data_solicitacao),
    'Data da Viagem': formatarDataBR(s.data_viagem),
    'Saída': formatarHoraBR(s.hora_saida),
    'Retorno': formatarHoraBR(s.hora_retorno),
    'Origem': s.origem,
    'Destino': s.destino,
    'Justificativa': s.justificativa,
    'Status': s.status,
    'Condutor': s.condutor_ida ? descreverCondutor(s.condutor_ida) : ''
  }));

  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Minhas Solicitações');
  XLSX.writeFile(livro, 'MarkCarro_MinhasSolicitacoes.xlsx');
}

window.carregarMinhasSolicitacoes = carregarMinhasSolicitacoes;
window.aplicarFiltroMinhasSolicitacoes = aplicarFiltroMinhasSolicitacoes;
window.limparFiltrosMinhasSolicitacoes = limparFiltrosMinhasSolicitacoes;
window.cancelarSolicitacao = cancelarSolicitacao;
window.exportarMinhasSolicitacoesXlsxUI = exportarMinhasSolicitacoesXlsxUI;
