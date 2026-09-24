// ============================================================
// MARKCARRO - Página: Minhas Solicitações (Solicitante)
// ============================================================
// Reescrita mobile-first: além da tabela (desktop), agora tem uma versão em
// cards pra tela pequena, filtro por status, exportação real em Excel
// (usando a biblioteca SheetJS que já estava carregada no index.html mas
// nunca era usada) e o gráfico de Pareto (o canvas já existia no HTML, mas
// nenhum arquivo .js desenhava nada nele).

let cacheMinhasSolicitacoes = [];
// cacheCondutoresParaExibicao agora é global, declarada em app.js (ver
// comentário lá) - passou a ser reaproveitada também por Viagens do Dia,
// Agenda de Corridas e Agenda Geral do Condutor, não só por esta tela.

async function carregarMinhasSolicitacoes() {
  if (!usuarioAtual) return;
  const tbody = document.getElementById('tb-minhas-solicitacoes');
  const cards = document.getElementById('cards-minhas-solicitacoes');
  Components.Loading.show(tbody);
  if (cards) cards.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Carregando...</div>';

  try {
    const [dados, condutores] = await Promise.all([
      buscarSolicitacoesPorEmail(usuarioAtual.email),
      listarCondutoresParaExibicao().catch(() => [])
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
// CORREÇÃO (regra de negócio pedida pelo usuário): mesmo que um condutor
// já esteja atribuído no banco (condutor_ida preenchido), o solicitante só
// deve ver o nome/telefone dele quando o gestor CONFIRMAR de fato a
// solicitação (status "Confirmada") - enquanto está só "Em Análise" (ou
// qualquer outro status), mostrar um texto neutro em vez de vazar a
// atribuição ainda não confirmada.
// CORREÇÃO (pedido do usuário: "apresentar nome e telefone do motorista de
// ida e de volta - se for o mesmo fica 'Ida e Volta: Nome'"): antes só
// mostrava o condutor da IDA (descreverCondutor(s.condutor_ida)), nunca o da
// VOLTA - agora devolve uma LINHA por motorista escalado (mesmo padrão já
// usado em Viagens do Dia/Agenda Geral do Condutor), com nome+telefone via
// descreverCondutor(), e junta numa linha só quando é o mesmo motorista nas
// duas pernas.
function infoCondutorParaSolicitante(s) {
  // PEDIDO DO USUÁRIO ("Ocupado - apresentar no card da solicitação no
  // perfil do solicitante"): antes, status "Ocupado" caía no mesmo texto
  // genérico de "Aguardando confirmação do gestor" (enganoso - Ocupado
  // significa que NÃO tem veículo disponível, não que ainda está em
  // análise). O badge de status já mostra "Ocupado" acima deste texto.
  if (s.status === 'Ocupado') return ['Sem veículo disponível'];
  if (s.status !== 'Confirmada') return ['Aguardando confirmação do gestor'];

  const emailIda = s.condutor_ida || '';
  const emailVolta = s.condutor_volta || '';
  if (!emailIda && !emailVolta) return ['Condutor ainda não atribuído'];
  if (emailIda && emailVolta && emailIda === emailVolta) {
    return [`Ida e Volta: ${descreverCondutor(emailIda)}`];
  }
  const linhas = [];
  if (emailIda) linhas.push(`Ida: ${descreverCondutor(emailIda)}`);
  if (emailVolta) linhas.push(`Volta: ${descreverCondutor(emailVolta)}`);
  return linhas;
}

// PEDIDO DO USUÁRIO: se o solicitante editar a própria solicitação (dentro
// do prazo de 24h - ver podeEditarSolicitacao), mostrar "Editado" em laranja
// perto do status. Só faz sentido enquanto a solicitação ainda não foi
// decidida (Pendente/Em Análise) - depois de Confirmada/Cancelada/etc. o
// status final já fala por si.
function _mostraBadgeEditado(s) {
  return !!s.editado_pelo_solicitante && (s.status === 'Pendente' || s.status === 'Em Análise' || !s.status);
}

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
// PEDIDO DO USUÁRIO: "não pedi filtro para status nem para condutor nesse
// perfil [Solicitante] - era para o perfil motorista - retirar do perfil
// solicitante". Os filtros de Status/Condutor saíram (o motorista já tem
// filtro de motorista/origem/destino próprio na Agenda Geral - ver
// pages/agenda-condutor.js) - aqui ficaram só Data Solic./Data Viagem/
// Origem-Destino.
function aplicarFiltroMinhasSolicitacoes() {
  const dataSolic = document.getElementById('filtro-minhas-solic-data-solic')?.value;
  const dataViagem = document.getElementById('filtro-minhas-solic-data-viagem')?.value;
  const trajeto = (document.getElementById('filtro-minhas-solic-trajeto')?.value || '').trim().toLowerCase();

  let filtradas = cacheMinhasSolicitacoes;
  if (dataSolic) filtradas = filtradas.filter(s => (s.data_solicitacao || '').slice(0, 10) === dataSolic);
  if (dataViagem) filtradas = filtradas.filter(s => s.data_viagem === dataViagem);
  if (trajeto) filtradas = filtradas.filter(s => `${s.origem || ''} ${s.destino || ''}`.toLowerCase().includes(trajeto));

  renderizarMinhasSolicitacoes(filtradas);
}

function limparFiltrosMinhasSolicitacoes() {
  document.getElementById('filtro-minhas-solic-data-solic').value = '';
  document.getElementById('filtro-minhas-solic-data-viagem').value = '';
  document.getElementById('filtro-minhas-solic-trajeto').value = '';
  aplicarFiltroMinhasSolicitacoes();
}

// PEDIDO DO USUÁRIO ("colocar um botão HOJE para filtro de data"): atalho
// que preenche o filtro de Data Viagem com a data de hoje, sem precisar
// abrir o calendário.
function filtrarMinhasSolicitacoesHoje() {
  const hojeISO = new Date().toISOString().split('T')[0];
  const campo = document.getElementById('filtro-minhas-solic-data-viagem');
  if (campo) campo.value = hojeISO;
  aplicarFiltroMinhasSolicitacoes();
}

// PEDIDO DO USUÁRIO ("cards ordenados cronologicamente por data e depois
// por horário de saída"): usado tanto no agrupamento hoje/futuras/passadas
// abaixo quanto como critério de ordenação dentro de cada grupo.
function _ordenarCronologicamenteMinhasSolic(dados) {
  return [...dados].sort((a, b) => {
    const dataA = a.data_viagem || '';
    const dataB = b.data_viagem || '';
    if (dataA !== dataB) return dataA < dataB ? -1 : 1;
    const horaA = a.hora_saida || '';
    const horaB = b.hora_saida || '';
    return horaA < horaB ? -1 : horaA > horaB ? 1 : 0;
  });
}

// PEDIDO DO USUÁRIO ("apresentar as agendas do dia, seguido pelas futuras e
// por último as já passadas, com um separador antes do passado"): divide a
// lista (já ordenada cronologicamente) em 3 grupos, na ordem hoje > futuras
// > passadas.
function _agruparMinhasSolicPorPeriodo(dadosOrdenados) {
  const hojeISO = new Date().toISOString().split('T')[0];
  const hoje = [];
  const futuras = [];
  const passadas = [];
  dadosOrdenados.forEach(s => {
    const data = s.data_viagem || '';
    if (data === hojeISO) hoje.push(s);
    else if (data > hojeISO) futuras.push(s);
    else passadas.push(s);
  });
  return { hoje, futuras, passadas };
}

function _linhaTabelaMinhasSolic(s) {
  return `
    <tr>
      <td>${formatarDataHoraBR(s.data_solicitacao)}</td>
      <td>${formatarDataBR(s.data_viagem)}</td>
      <td>${formatarHoraBR(s.hora_saida)} - ${formatarHoraBR(s.hora_retorno)}</td>
      <td>${s.origem} → ${s.destino}</td>
      <td>${s.justificativa || ''}</td>
      <td><span class="badge ${classeStatus(s.status)}">${s.status}</span> ${_mostraBadgeEditado(s) ? '<span class="badge badge-editado">Editado</span>' : ''}</td>
      <td>${infoCondutorParaSolicitante(s).join('<br>')}</td>
      <td class="whitespace-nowrap">
        ${podeEditarSolicitacao(s) ? `<button class="btn-azul-claro text-xs py-1.5 px-2.5 mr-1" onclick="abrirEdicaoSolicitacao('${s.id}')">Editar</button>` : ''}
        ${podeCancelarSolicitacao(s) ? `<button class="btn-danger text-xs py-1.5 px-2.5" onclick="cancelarSolicitacao('${s.id}')">Cancelar</button>` : ''}
      </td>
    </tr>
  `;
}

function _cardMinhasSolic(s) {
  return `
      <div class="trip-card ${classeCorBordaViagem(s.status)}">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="trip-time">${formatarHoraBR(s.hora_saida)}${s.hora_retorno ? ` <span class="text-slate-300">–</span> ${formatarHoraBR(s.hora_retorno)}` : ''}</p>
            <p class="text-sm font-medium text-slate-600 mt-0.5">${formatarDataBR(s.data_viagem)}</p>
          </div>
          <span class="badge ${classeStatus(s.status)} shrink-0">${s.status}</span>
        </div>
        ${_mostraBadgeEditado(s) ? '<span class="badge badge-editado mt-1 inline-block">Editado</span>' : ''}
        <div class="trip-route">
          <div class="trip-route-point origem">
            <span class="trip-route-label">Origem</span>${s.origem || '—'}
          </div>
          <div class="trip-route-point destino">
            <span class="trip-route-label">Destino</span>${s.destino || '—'}
          </div>
        </div>
        ${s.justificativa ? `<div class="trip-meta-row"><span class="italic">${s.justificativa}</span></div>` : ''}
        ${infoCondutorParaSolicitante(s).map(linha => `<div class="trip-meta-row">${IconesViagem.carro}<span>${linha}</span></div>`).join('')}
        <div class="trip-meta-row">${IconesViagem.passageiros}<span>${s.qtd_pessoas || 1} passageiro${(s.qtd_pessoas || 1) === 1 ? '' : 's'}</span></div>
        ${s.status === 'Cancelada' ? `<div class="trip-meta-row text-slate-500"><span>Cancelada pela gestão</span></div>` : ''}
        ${(podeEditarSolicitacao(s) || podeCancelarSolicitacao(s)) ? `
        <div class="flex gap-2 mt-3">
          ${podeEditarSolicitacao(s) ? `<button class="btn-azul-claro text-xs py-2 flex-1" onclick="abrirEdicaoSolicitacao('${s.id}')">Editar</button>` : ''}
          ${podeCancelarSolicitacao(s) ? `<button class="btn-danger text-xs py-2 flex-1" onclick="cancelarSolicitacao('${s.id}')">Cancelar</button>` : ''}
        </div>` : ''}
      </div>
  `;
}

function renderizarMinhasSolicitacoes(dados) {
  const tbody = document.getElementById('tb-minhas-solicitacoes');
  const cards = document.getElementById('cards-minhas-solicitacoes');

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-500 py-8">Nenhuma solicitação</td></tr>';
    if (cards) cards.innerHTML = '<div class="text-center text-slate-500 py-8 text-sm">Nenhuma solicitação encontrada.</div>';
    return;
  }

  // PEDIDO DO USUÁRIO: ordena cronologicamente (data da viagem, depois hora
  // de saída) e agrupa hoje > futuras > passadas, com separador antes do
  // grupo de passadas.
  const ordenados = _ordenarCronologicamenteMinhasSolic(dados);
  const { hoje, futuras, passadas } = _agruparMinhasSolicPorPeriodo(ordenados);
  const emOrdem = [...hoje, ...futuras, ...passadas];

  const separadorTabela = `<tr><td colspan="8" class="py-2"><hr class="border-slate-200"><p class="text-[11px] text-slate-400 mt-1">Agendas passadas</p></td></tr>`;
  const separadorCard = `<div class="col-span-full my-2"><hr class="border-slate-200"><p class="text-[11px] text-slate-400 mt-1">Agendas passadas</p></div>`;

  tbody.innerHTML =
    hoje.map(_linhaTabelaMinhasSolic).join('') +
    futuras.map(_linhaTabelaMinhasSolic).join('') +
    (passadas.length ? separadorTabela + passadas.map(_linhaTabelaMinhasSolic).join('') : '');

  if (cards) {
    cards.innerHTML =
      hoje.map(_cardMinhasSolic).join('') +
      futuras.map(_cardMinhasSolic).join('') +
      (passadas.length ? separadorCard + passadas.map(_cardMinhasSolic).join('') : '');
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

// NOVO (pedido do usuário): o solicitante pode editar hora, origem, destino,
// nº de passageiros e justificativa da própria solicitação - mas só enquanto
// ela ainda não foi decidida (Pendente/Em Análise, mesma regra do
// cancelamento) E enquanto faltar mais de 24h pro horário de saída (prazo
// maior que o cancelamento de propósito - dá tempo do gestor reorganizar se
// precisar). O admin não usa isso: ele já pode alterar qualquer solicitação,
// a qualquer momento, por Gerenciar Solicitações.
function podeEditarSolicitacao(s) {
  if (s.status !== 'Pendente' && s.status !== 'Em Análise') return false;
  if (!s.data_viagem || !s.hora_saida) return true;

  const dataHoraSaida = new Date(`${s.data_viagem}T${s.hora_saida.substring(0, 5)}:00`);
  if (isNaN(dataHoraSaida.getTime())) return true;

  const VINTE_QUATRO_HORAS_MS = 24 * 60 * 60 * 1000;
  return (dataHoraSaida.getTime() - Date.now()) > VINTE_QUATRO_HORAS_MS;
}

// Preenche um <select> de local (mesma função da tela Nova Solicitação,
// pra usar exatamente a mesma listagem/regra) e já deixa pré-selecionado o
// valor atual da solicitação - se esse valor não estiver na lista de
// locais cadastrados (foi digitado como "Outro" na época), cai em "Outro"
// e mostra a caixa de texto livre já preenchida com o texto original, em
// vez de simplesmente não selecionar nada.
function _prepararSelectLocalEdicao(selectEl, valorAtual, idBoxOutro, idInputOutro) {
  if (!selectEl) return;
  preencherDropdownLocais(selectEl);
  const existeNaLista = Array.from(selectEl.options).some(o => o.value === valorAtual);
  if (valorAtual && existeNaLista) {
    selectEl.value = valorAtual;
  } else if (valorAtual) {
    selectEl.value = 'Outro';
    document.getElementById(idBoxOutro)?.classList.remove('hidden');
    const inputOutro = document.getElementById(idInputOutro);
    if (inputOutro) inputOutro.value = valorAtual;
  }
}

async function abrirEdicaoSolicitacao(id) {
  const s = cacheMinhasSolicitacoes.find(x => String(x.id) === String(id));
  if (!s) return;
  if (!podeEditarSolicitacao(s)) {
    Components.Toast.error('Não é mais possível editar: faltam menos de 24h para a saída, ou a solicitação já foi decidida.');
    carregarMinhasSolicitacoes();
    return;
  }

  // CORREÇÃO (pedido do usuário: "origem e destino -> dropdown com as
  // mesmas regras de nova solicitação"): antes eram campos de texto livre
  // (o solicitante podia digitar qualquer coisa, sem nenhuma relação com
  // os locais já cadastrados) - agora usam o mesmo dropdown + "Outro
  // local" da tela Nova Solicitação (preencherDropdownLocais/
  // alternarCampoOutroLocal, ambos em app.js/nova-solicitacao.js).
  if (!cacheLocais || !cacheLocais.length) {
    try { cacheLocais = await listarLocais(); } catch (e) { /* dropdown fica só com "Outro local" */ }
  }

  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const conteudo = `
    <form id="form-editar-solicitacao" class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Hora de Saída</label>
          <input type="time" id="edit-hora-saida" class="input-field" value="${esc((s.hora_saida || '').substring(0, 5))}">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Hora de Retorno</label>
          <input type="time" id="edit-hora-retorno" class="input-field" value="${esc((s.hora_retorno || '').substring(0, 5))}">
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">Origem</label>
        <select id="edit-origem" class="input-field" onchange="alternarCampoOutroLocal('edit-origem', 'edit-box-outro-origem')">
          <option value="">Selecione...</option>
        </select>
        <div id="edit-box-outro-origem" class="hidden mt-2">
          <input type="text" id="edit-origem-outro" class="input-field" placeholder="Informe a origem">
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">Destino</label>
        <select id="edit-destino" class="input-field" onchange="alternarCampoOutroLocal('edit-destino', 'edit-box-outro-destino')">
          <option value="">Selecione...</option>
        </select>
        <div id="edit-box-outro-destino" class="hidden mt-2">
          <input type="text" id="edit-destino-outro" class="input-field" placeholder="Informe o destino">
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">Nº Passageiros</label>
        <input type="number" min="1" id="edit-qtd" class="input-field" value="${esc(s.qtd_pessoas || 1)}">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">Justificativa</label>
        <textarea id="edit-justificativa" rows="3" class="input-field">${esc(s.justificativa)}</textarea>
      </div>
      <p class="text-xs text-slate-500">Edição disponível só até 24h antes do horário de saída.</p>
    </form>
  `;

  const overlay = Components.Modal.show(conteudo, {
    title: 'Editar Solicitação',
    footer: `
      <button type="button" id="btn-cancelar-edicao-solic" class="btn-outline text-sm py-2 px-4">Cancelar</button>
      <button type="button" id="btn-salvar-edicao-solic" class="btn-primary text-sm py-2 px-4">Salvar</button>
    `
  });

  _prepararSelectLocalEdicao(overlay.querySelector('#edit-origem'), s.origem, 'edit-box-outro-origem', 'edit-origem-outro');
  _prepararSelectLocalEdicao(overlay.querySelector('#edit-destino'), s.destino, 'edit-box-outro-destino', 'edit-destino-outro');

  overlay.querySelector('#btn-cancelar-edicao-solic')?.addEventListener('click', () => overlay.remove());

  overlay.querySelector('#btn-salvar-edicao-solic')?.addEventListener('click', async () => {
    // Reconfere o prazo na hora de salvar (o modal pode ter ficado aberto
    // um tempo) - mesma cautela do cancelamento.
    if (!podeEditarSolicitacao(s)) {
      Components.Toast.error('Não é mais possível editar: faltam menos de 24h para a saída.');
      overlay.remove();
      carregarMinhasSolicitacoes();
      return;
    }

    const horaSaida = overlay.querySelector('#edit-hora-saida').value;
    const horaRetorno = overlay.querySelector('#edit-hora-retorno').value;
    const selOrigem = overlay.querySelector('#edit-origem').value;
    const origem = selOrigem === 'Outro' ? (overlay.querySelector('#edit-origem-outro').value || '').trim() : selOrigem;
    const selDestino = overlay.querySelector('#edit-destino').value;
    const destino = selDestino === 'Outro' ? (overlay.querySelector('#edit-destino-outro').value || '').trim() : selDestino;
    const qtd = parseInt(overlay.querySelector('#edit-qtd').value, 10) || 1;
    const justificativa = overlay.querySelector('#edit-justificativa').value.trim();

    if (!horaSaida || !origem || !destino || !justificativa) {
      Components.Toast.error('Preencha hora de saída, origem, destino e justificativa.');
      return;
    }

    try {
      // PEDIDO DO USUÁRIO: marca a solicitação como editada pelo próprio
      // solicitante (mostra badge "Editado" em laranja - ver
      // _mostraBadgeEditado/renderizarMinhasSolicitacoes acima) - depende da
      // coluna "editado_pelo_solicitante" existir em "solicitacoes" (ver
      // supabase_add_editado_solicitante.sql, entregue junto).
      await atualizarSolicitacao(id, {
        hora_saida: horaSaida,
        hora_retorno: horaRetorno || null,
        origem,
        destino,
        qtd_pessoas: qtd,
        justificativa,
        editado_pelo_solicitante: true
      });
      Components.Toast.success('Solicitação atualizada.');
      overlay.remove();
      carregarMinhasSolicitacoes();
    } catch (e) {
      console.error('Erro ao editar solicitação:', e);
      Components.Toast.error('Não foi possível salvar as alterações.');
    }
  });
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
window.filtrarMinhasSolicitacoesHoje = filtrarMinhasSolicitacoesHoje;
window.cancelarSolicitacao = cancelarSolicitacao;
window.abrirEdicaoSolicitacao = abrirEdicaoSolicitacao;
window.exportarMinhasSolicitacoesXlsxUI = exportarMinhasSolicitacoesXlsxUI;
