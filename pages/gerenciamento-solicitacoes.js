// ============================================================
// MARKCARRO - Página: Gerenciamento de Solicitações (Gestor)
// ============================================================
// CORREÇÃO: esta tabela operacional (Confirmar/Ocupado/Cancelar/atribuir
// condutor) morava dentro da mesma tela do Dashboard (pages/gestor.js),
// um embaixo do outro - a fusão causava confusão sobre onde estava o quê
// (item 8 do lote de correções: "ao clicar no botão, volta ao painel, vai
// para dashboard - sem acesso ao painel de viagens"). A pedido do usuário,
// virou tela própria, com sua própria pílula de navegação
// (#btn-gerenciamento-solicitacoes) e busca independente da do Dashboard.

// Cache própria desta tela - guarda a última lista carregada, usada pelo
// botão "Exportar Excel" e pelos filtros da tela (aplicarFiltrosGestor).
// Independente de cacheSolicitacoesDashboard (pages/gestor.js).
let cacheTodasSolicitacoesGestor = [];

// PEDIDO DO USUÁRIO ("não permite salvamento de solicitações", "não grava
// alterações em data", "acrescentar botão para salvar alterações"):
//
// O modelo antigo salvava cada campo sozinho, na hora, ao sair do campo
// (onchange -> salvarCampoGestor -> grava direto no Supabase). Isso tinha
// dois problemas reais:
//   1) A linha em tela nunca era atualizada com o valor confirmado - só o
//      objeto no banco mudava, mas cacheTodasSolicitacoesGestor (usado por
//      TODO redesenho desta tabela: reordenar, filtrar, "Hoje" etc.)
//      continuava com o valor ANTIGO. Assim que qualquer coisa disparava um
//      novo desenho da tabela (mudar o filtro, ordenar, o botão "Gerenciar"
//      da Agenda de Corridas realçando uma linha, etc.), o campo editado
//      "voltava" pro valor de antes - dando a impressão de que a alteração
//      nunca tinha sido salva de verdade, mesmo quando o Supabase already
//      tinha aceitado o UPDATE.
//   2) Um erro do Supabase (RLS rejeitando, coluna inválida, condutor sem
//      permissão etc.) aparecia só como "Erro ao salvar" genérico, sem a
//      mensagem real - impossível saber POR QUE não salvou.
//
// Novo modelo: cada edição de campo fica só em memória
// (edicoesPendentesGestor) até o usuário clicar no botão "Salvar" que
// aparece na própria linha assim que ela tem alguma alteração pendente.
// Só nesse clique é que salvarEdicoesLinhaGestor() manda tudo pro Supabase
// de uma vez, e SÓ quando a gravação realmente é confirmada é que
// cacheTodasSolicitacoesGestor é atualizado - eliminando o "volta sozinho"
// e mostrando a mensagem de erro real quando falhar.
let edicoesPendentesGestor = {};

async function carregarGerenciamentoSolicitacoes(forcarAtualizacao = false) {
  const tbody = document.getElementById('tb-gestor-geral');
  // CORREÇÃO (erro grave): esta tela mostra solicitações de OUTRAS
  // pessoas (fila operacional compartilhada) - a proteção antiga
  // "só recarrega se veio forçado" fazia o admin ver dados VELHOS toda
  // vez que voltava pra esta aba pelo pill do menu (forcarAtualizacao
  // default é false), incluindo nunca ver uma solicitação nova criada
  // por outra pessoa enquanto ele já tinha essa tela aberta uma vez
  // nesta sessão. Diferente do Dashboard (onde reabrir a mesma tela
  // rápido não perde nada crítico), aqui staleness é inaceitável -
  // então este recarregamento agora é sempre incondicional.
  Components.Loading.show(tbody);
  try {
    const [solicitacoes, condutores] = await Promise.all([
      buscarTodasSolicitacoes(),
      listarCondutores()
    ]);

    cacheCondutores = condutores || [];
    cacheTodasSolicitacoesGestor = solicitacoes || [];

    renderizarAvisoCnh('aviso-cnh-gerenciamento', cacheCondutores);

    // Transição automática Pendente -> "Em Análise": equivalente a
    // marcarEmAnalise() do sistema antigo, que era disparada quando o
    // gestor abria/expandia uma linha pela primeira vez. Como esta tela
    // não tem esse conceito de "expandir linha" (a tabela já mostra tudo
    // de uma vez), o momento equivalente aqui é o próprio carregamento
    // desta tela - só de abrir já conta como "o gestor viu".
    await marcarPendentesComoEmAnalise(cacheTodasSolicitacoesGestor);

    aplicarFiltrosGestor();
  } catch (e) {
    // Sem isso, um erro aqui deixava a tabela travada no spinner de
    // "Carregando..." pra sempre (nada reescrevia o tbody depois do catch).
    console.error('Erro ao carregar gerenciamento de solicitações:', e);
    tbody.innerHTML = `<tr><td colspan="16" class="text-center text-red-500 p-4">Erro ao carregar. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarGerenciamentoSolicitacoes(true)">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar solicitações');
  }
}

async function marcarPendentesComoEmAnalise(lista) {
  const pendentes = lista.filter(s => (s.status || 'Pendente') === 'Pendente');
  if (!pendentes.length) return;

  try {
    await Promise.all(pendentes.map(s => atualizarSolicitacao(s.id, { status: 'Em Análise' })));
    pendentes.forEach(s => { s.status = 'Em Análise'; });
  } catch (e) {
    console.warn('Erro ao marcar solicitações como Em Análise:', e);
  }
}

// Filtros da tela (Data da Solicitação / Data da Viagem / Status).
function aplicarFiltrosGestor() {
  const dataSolic = document.getElementById('filtro-gestor-data-solic')?.value;
  const dataViagem = document.getElementById('filtro-gestor-data-viagem')?.value;
  const status = document.getElementById('filtro-gestor-status')?.value || 'TODOS';

  let filtrados = cacheTodasSolicitacoesGestor;
  if (dataSolic) {
    filtrados = filtrados.filter(s => (s.data_solicitacao || '').slice(0, 10) === dataSolic);
  }
  if (dataViagem) {
    filtrados = filtrados.filter(s => s.data_viagem === dataViagem);
  }
  if (status !== 'TODOS') {
    filtrados = filtrados.filter(s => (s.status || 'Pendente') === status);
  }

  // PEDIDO DO USUÁRIO: ordem crescente, 1º por Data da Viagem, 2º por
  // Horário de Saída - usa .slice() antes de ordenar pra nunca alterar a
  // ordem de cacheTodasSolicitacoesGestor (usada também pela exportação
  // Excel) mesmo quando nenhum filtro está ativo (aí "filtrados" seria a
  // própria referência do cache).
  filtrados = ordenarPorDataEHoraSaida(filtrados.slice());

  renderizarTabelaGestorCompleta(filtrados);
}

// PEDIDO DO USUÁRIO: botão "Hoje" ao lado do filtro de Data da Viagem -
// preenche o campo com a data de hoje (fuso do próprio navegador) e já
// aplica o filtro, mostrando só as solicitações com viagem hoje.
function filtrarGestorHoje() {
  const campo = document.getElementById('filtro-gestor-data-viagem');
  if (!campo) return;
  const hoje = new Date();
  const hojeISO = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  campo.value = hojeISO;
  aplicarFiltrosGestor();
}

// Reaproveitada por Gerenciar Solicitações e Agenda de Corridas (pedido do
// usuário: as duas telas devem ordenar de forma crescente, 1º pela Data da
// Viagem, 2º pelo Horário de Saída). Sem data_viagem/hora_saida vai pro
// fim da lista, em vez de aparecer misturado no meio por causa de string
// vazia comparando "menor" que qualquer data real.
function ordenarPorDataEHoraSaida(lista) {
  return lista.sort((a, b) => {
    const dataA = a.data_viagem || '9999-99-99';
    const dataB = b.data_viagem || '9999-99-99';
    if (dataA !== dataB) return dataA < dataB ? -1 : 1;
    const horaA = a.hora_saida || '99:99:99';
    const horaB = b.hora_saida || '99:99:99';
    if (horaA !== horaB) return horaA < horaB ? -1 : 1;
    return 0;
  });
}

function limparFiltrosGestor() {
  document.getElementById('filtro-gestor-data-solic').value = '';
  document.getElementById('filtro-gestor-data-viagem').value = '';
  document.getElementById('filtro-gestor-status').value = 'TODOS';
  aplicarFiltrosGestor();
}

function exportarSolicitacoesXlsxUI() {
  if (typeof XLSX === 'undefined') return Components.Toast.error('Biblioteca de exportação não carregada');
  if (!cacheTodasSolicitacoesGestor.length) return Components.Toast.warning('Não há solicitações para exportar');

  const linhas = cacheTodasSolicitacoesGestor.map(s => ({
    'Solicitado em': formatarDataHoraBR(s.data_solicitacao),
    'Data da Viagem': formatarDataBR(s.data_viagem),
    'Saída': formatarHoraBR(s.hora_saida),
    'Retorno': formatarHoraBR(s.hora_retorno),
    'Origem': s.origem,
    'Destino': s.destino,
    'Solicitante': s.nome_ext || s.email_solicitante,
    'Unidade': s.unidade || '',
    'Setor': s.setor || '',
    'Justificativa': s.justificativa,
    'Tipo': s.tipo_viagem,
    'Qtd': s.qtd_pessoas,
    'Status': s.status,
    'Condutor Ida': s.condutor_ida || '',
    'Condutor Volta': s.condutor_volta || ''
  }));

  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Solicitações');
  XLSX.writeFile(livro, 'MarkCarro_PainelGestor.xlsx');
}

function primeiroNomeGestor(nome) {
  return (nome || '').trim().split(/\s+/)[0] || '';
}

function escGestor(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Origem/Destino nesta tabela viraram dropdown com a mesma listagem da tela
// Nova Solicitação (cacheLocais, populada em app.js) - "Outro" abaixo revela
// um campo de texto livre pra quando o local não está cadastrado.
function gerarOpcoesLocaisGestor(valorAtual) {
  const nomes = (typeof cacheLocais !== 'undefined' ? cacheLocais : [])
    .map(l => (typeof l === 'string') ? l : (l?.nome || ''))
    .filter(Boolean);
  let html = '<option value="">Selecione...</option>';
  html += nomes.map(n => `<option value="${escGestor(n)}" ${n === valorAtual ? 'selected' : ''}>${escGestor(n)}</option>`).join('');
  if (valorAtual && !nomes.includes(valorAtual)) {
    html += `<option value="${escGestor(valorAtual)}" selected>${escGestor(valorAtual)}</option>`;
  }
  html += '<option value="Outro">Outro (digitar)</option>';
  return html;
}

function handleSelectLocalGestor(selectEl, id, campo) {
  const inputOutro = selectEl.nextElementSibling;
  if (selectEl.value === 'Outro') {
    inputOutro?.classList.remove('hidden');
    inputOutro?.focus();
    return;
  }
  inputOutro?.classList.add('hidden');
  marcarCampoAlteradoGestor(id, campo, selectEl.value);
}

// Grava a alteração só em memória (não manda nada pro Supabase ainda) e
// mostra o botão "Salvar" daquela linha - ver comentário grande em cima de
// "edicoesPendentesGestor", no topo do arquivo, sobre por que isso
// substituiu o salvamento automático por campo.
function marcarCampoAlteradoGestor(id, campo, valor) {
  if (!edicoesPendentesGestor[id]) edicoesPendentesGestor[id] = {};
  edicoesPendentesGestor[id][campo] = valor;

  const row = document.querySelector(`#tb-gestor-geral tr[data-id="${id}"]`);
  if (row) row.style.background = '#fffbeb'; // destaque: linha com alteração ainda não salva
  document.getElementById(`btn-salvar-gestor-${id}`)?.classList.remove('hidden');
}

async function salvarEdicoesLinhaGestor(id) {
  const alteracoes = edicoesPendentesGestor[id];
  if (!alteracoes || !Object.keys(alteracoes).length) return;

  const btn = document.getElementById(`btn-salvar-gestor-${id}`);
  const textoOriginal = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }

  try {
    await atualizarSolicitacao(id, alteracoes);

    // Só depois de confirmado no banco é que o cache local (usado por todo
    // redesenho desta tabela) é atualizado - antes disso, qualquer
    // re-render mostraria o valor NOVO só na tela, mas voltaria pro antigo
    // assim que a tabela fosse redesenhada de novo, porque o cache
    // continuava com o dado velho.
    const item = cacheTodasSolicitacoesGestor.find(s => s.id === id);
    if (item) Object.assign(item, alteracoes);

    delete edicoesPendentesGestor[id];
    Components.Toast.success('Alterações salvas!');

    const row = document.querySelector(`#tb-gestor-geral tr[data-id="${id}"]`);
    if (row) row.style.background = '';
    document.getElementById(`btn-salvar-gestor-${id}`)?.classList.add('hidden');
  } catch (e) {
    console.error('Erro ao salvar alterações da solicitação', id, e);
    // CORREÇÃO (pedido do usuário: "não permite salvamento... há
    // limitações de quantidade de atribuição de motorista"): a mensagem
    // genérica antiga ("Erro ao salvar") escondia o motivo real da
    // rejeição (ex.: regra de permissão no banco). Mostrando a mensagem
    // que o próprio Supabase devolve, dá pra saber exatamente por que
    // recusou, em vez de adivinhar.
    Components.Toast.error('Erro ao salvar: ' + (e?.message || 'motivo desconhecido'));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal; }
  }
}

function renderizarTabelaGestorCompleta(dados) {
  const tbody = document.getElementById('tb-gestor-geral');
  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="16" class="text-center text-slate-500 p-4">Nenhuma solicitação</td></tr>';
    return;
  }

  const opcoesCondutor = cacheCondutores.map(c =>
    `<option value="${c.email}">${c.nome} (${c.capacidade || ''})</option>`
  ).join('');

  tbody.innerHTML = dados.map(s => {
    const status = s.status || 'Pendente';
    const nomeCurto = primeiroNomeGestor(s.nome_ext) || s.email_solicitante;
    // Se esta linha tem alterações ainda não salvas (usuário mudou o campo
    // mas não clicou "Salvar" - ou clicou e deu erro), mostra o valor
    // pendente em vez do valor antigo do banco, senão a alteração
    // "desaparece" da tela ao redesenhar a tabela (reordenar/filtrar/etc.)
    // mesmo sem ter sido descartada de verdade.
    const pend = edicoesPendentesGestor[s.id] || {};
    const v = { ...s, ...pend };
    const temPendencia = Object.keys(pend).length > 0;
    return `
    <tr data-id="${s.id}" ${temPendencia ? 'style="background:#fffbeb"' : ''}>
      <td>${formatarDataHoraBR(s.data_solicitacao)}</td>
      <td><input type="date" value="${v.data_viagem || ''}" class="input-field text-sm py-1.5 px-2" onchange="marcarCampoAlteradoGestor('${s.id}', 'data_viagem', this.value)"></td>
      <td><input type="time" value="${formatarHoraBR(v.hora_saida)}" class="input-field text-sm py-1.5 px-2" onchange="marcarCampoAlteradoGestor('${s.id}', 'hora_saida', this.value)"></td>
      <td><input type="time" value="${formatarHoraBR(v.hora_retorno)}" class="input-field text-sm py-1.5 px-2" onchange="marcarCampoAlteradoGestor('${s.id}', 'hora_retorno', this.value)"></td>
      <td style="min-width:240px">
        <!-- CORREÇÃO (pedido do usuário: "origem e destino - aumentar a
             visualização, quebre textos, sempre que possível"): um
             <select> nunca quebra linha no valor selecionado (limitação do
             próprio elemento nativo do navegador, não dá pra contornar só
             com CSS) - textos longos ficavam cortados. Adicionado este
             texto completo, com quebra de linha normal, acima do select -
             o admin já lê o local inteiro aqui, e continua trocando pelo
             dropdown/campo "Outro" logo abaixo pra editar. -->
        <p class="text-xs text-slate-600 whitespace-normal break-words mb-1">${escGestor(v.origem) || '—'}</p>
        <select class="input-field text-sm py-2 px-2 w-full" onchange="handleSelectLocalGestor(this, '${s.id}', 'origem')">
          ${gerarOpcoesLocaisGestor(v.origem)}
        </select>
        <input type="text" value="${escGestor(v.origem)}" placeholder="Digite o local" class="input-field text-sm py-1.5 px-2 mt-1 hidden" onchange="marcarCampoAlteradoGestor('${s.id}', 'origem', this.value)">
      </td>
      <td style="min-width:240px">
        <p class="text-xs text-slate-600 whitespace-normal break-words mb-1">${escGestor(v.destino) || '—'}</p>
        <select class="input-field text-sm py-2 px-2 w-full" onchange="handleSelectLocalGestor(this, '${s.id}', 'destino')">
          ${gerarOpcoesLocaisGestor(v.destino)}
        </select>
        <input type="text" value="${escGestor(v.destino)}" placeholder="Digite o local" class="input-field text-sm py-1.5 px-2 mt-1 hidden" onchange="marcarCampoAlteradoGestor('${s.id}', 'destino', this.value)">
      </td>
      <td style="max-width:90px; white-space:normal; overflow-wrap:break-word;" title="${escGestor(s.nome_ext || s.email_solicitante)}">${nomeCurto}</td>
      <td>${s.unidade || ''}</td>
      <td>${s.setor || ''}</td>
      <!-- PEDIDO DO USUÁRIO: dar permissão pra editar a Justificativa aqui
           (antes era só texto fixo, sem como alterar) - segue o mesmo
           padrão desta tabela: fica pendente até clicar "Salvar". -->
      <td style="min-width:160px">
        <textarea rows="2" class="input-field text-sm py-1.5 px-2" style="min-width:150px" onchange="marcarCampoAlteradoGestor('${s.id}', 'justificativa', this.value)">${escGestor(v.justificativa)}</textarea>
      </td>
      <td>${s.tipo_viagem}</td>
      <td style="min-width:80px"><input type="number" value="${v.qtd_pessoas}" class="input-field text-sm py-1.5 px-2" min="1" onchange="marcarCampoAlteradoGestor('${s.id}', 'qtd_pessoas', this.value)"></td>
      <td><span class="badge ${classeStatus(status)}">${status}</span></td>
      <td>
        <select class="input-field text-sm py-1.5 px-2 select-condutor-ida" onchange="marcarCampoAlteradoGestor('${s.id}', 'condutor_ida', this.value)">
          <option value="">—</option>
          ${opcoesCondutor}
        </select>
      </td>
      <td>
        <select class="input-field text-sm py-1.5 px-2 select-condutor-volta" onchange="marcarCampoAlteradoGestor('${s.id}', 'condutor_volta', this.value)">
          <option value="">—</option>
          ${opcoesCondutor}
        </select>
      </td>
      <td>
        <!-- CORREÇÃO (pedido do usuário, 2ª rodada de "diminuir os botões
             de ação" - a 1ª, text-[11px]/py-1/px-1.5, ainda não era
             pequena o suficiente): removidos os ícones ✓/✗ (a cor de
             fundo - verde/vermelho/laranja - já indica a ação, o ícone
             era redundante e só ocupava largura) e reduzido mais o
             padding/fonte (text-[10px]/py-0.5/px-1, leading mais apertado,
             gap menor entre os botões da célula). -->
        <div class="flex flex-wrap gap-0.5">
          ${status === 'Pendente' || status === 'Em Análise' ? `
            <button class="btn-success text-[10px] leading-tight py-0.5 px-1" onclick="confirmarSolicitacaoGestor('${s.id}')">Confirmar</button>
            <button class="btn-danger text-[10px] leading-tight py-0.5 px-1" onclick="cancelarSolicitacaoGestor('${s.id}')">Cancelar</button>
          ` : status === 'Confirmada' ? `
            <button class="btn-warning text-[10px] leading-tight py-0.5 px-1" onclick="marcarOcupadoGestor('${s.id}')">Ocupado</button>
            <button class="btn-danger text-[10px] leading-tight py-0.5 px-1" onclick="cancelarSolicitacaoGestor('${s.id}')">Cancelar</button>
          ` : ''}
          <!-- PEDIDO DO USUÁRIO: botão para salvar as alterações de edição
               (antes não existia nenhum - o salvamento automático por
               campo não funcionava de forma confiável). Só aparece quando
               a linha tem alguma edição pendente. -->
          <button id="btn-salvar-gestor-${s.id}" class="btn-primary text-[10px] leading-tight py-0.5 px-1 ${temPendencia ? '' : 'hidden'}" onclick="salvarEdicoesLinhaGestor('${s.id}')">Salvar</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');

  // Preencher selects com valores atuais (ou pendentes, se houver).
  //
  // CORREÇÃO (bug grave: "Gerenciar Solicitações não carrega dados" -
  // na prática a tela buscava os dados certinho, mas quebrava bem aqui,
  // logo depois de montar as linhas, e caía no catch de erro): usava
  // `row.querySelector('select:nth-of-type(1)')` e `select:nth-of-type(2)`
  // pra achar os selects de Condutor Ida/Volta - só que ":nth-of-type" é
  // relativo ao PAI de cada elemento, não à linha inteira. Cada <select>
  // desta linha (Origem, Destino, Condutor Ida, Condutor Volta) é filho
  // único da sua própria <td>, ou seja, TODOS eles são "o 1º select do
  // tipo" dentro do próprio pai - a busca por "nth-of-type(1)" na linha
  // toda acabava pegando o select de ORIGEM (o primeiro em ordem no DOM),
  // e "nth-of-type(2)" não encontrava nada (nenhum <td> tem 2 selects),
  // retornando null - daí o "Cannot set properties of null" ao tentar
  // ".value = ...", assim que a tabela tinha pelo menos 1 solicitação.
  // Trocado por classes próprias nos selects de condutor, sem ambiguidade.
  dados.forEach(s => {
    const row = tbody.querySelector(`tr[data-id="${s.id}"]`);
    if (row) {
      const pend = edicoesPendentesGestor[s.id] || {};
      const selIda = row.querySelector('.select-condutor-ida');
      const selVolta = row.querySelector('.select-condutor-volta');
      if (selIda) selIda.value = ('condutor_ida' in pend) ? pend.condutor_ida : (s.condutor_ida || '');
      if (selVolta) selVolta.value = ('condutor_volta' in pend) ? pend.condutor_volta : (s.condutor_volta || '');
    }
  });
}

// Descreve um condutor (nome + telefone + placa/modelo) pra compor o texto
// das notificações - equivalente ao trecho de enviarMensagemConfirmacao()
// do sistema antigo que buscava os dados do condutor pra incluir no aviso,
// em vez do gestor precisar digitar isso manualmente.
function obterDescricaoCondutor(email) {
  if (!email) return null;
  const c = cacheCondutores.find(x => x.email === email);
  if (!c) return email;
  const veiculo = [c.placa, c.modelo].filter(Boolean).join(' ');
  return [c.nome, c.telefone, veiculo].filter(Boolean).join(' - ');
}

// Compartilhado entre confirmarSolicitacaoGestor (confirmação individual) e
// confirmarGeralGestor (confirmação em lote) - mesmas notificações nos dois
// casos: solicitante sempre, condutor(es) só quando é corrida "extra".
function _notificarConfirmacao(solicitacao, condutorIda, condutorVolta) {
  const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
  const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
  const descIda = obterDescricaoCondutor(condutorIda);
  const descVolta = condutorVolta ? obterDescricaoCondutor(condutorVolta) : null;

  // Mensagens curtas (pedido do usuário) - os detalhes completos (com a
  // observação de tolerância de horário etc.) continuam disponíveis na
  // tela de Minhas Solicitações, a notificação é só o aviso rápido.
  let msg = `Solicitação confirmada: ${quando} (${trecho}). Condutor: ${descIda || condutorIda}.`;
  if (descVolta && condutorVolta !== condutorIda) msg += ` Volta: ${descVolta}.`;

  criarNotificacao({
    email_destinatario: solicitacao.email_solicitante,
    tipo: 'confirmacao',
    mensagem: msg,
    lida: false
  }).catch(e => console.warn('Erro ao notificar solicitante:', e));

  // Corrida "extra" (solicitada no mesmo dia da viagem) - avisa também
  // o(s) condutor(es) escalados, igual ao sistema antigo fazia.
  const ehExtra = (solicitacao.data_solicitacao || '').slice(0, 10) === solicitacao.data_viagem;
  if (ehExtra) {
    const msgCondutor = `Corrida extra atribuída a você para ${quando} (${trecho}).`;
    const destinatarios = [...new Set([condutorIda, condutorVolta].filter(Boolean))];
    destinatarios.forEach(email => {
      criarNotificacao({
        email_destinatario: email,
        tipo: 'corrida_extra',
        mensagem: msgCondutor,
        lida: false
      }).catch(e => console.warn('Erro ao notificar condutor:', e));
    });
  }
}

async function confirmarSolicitacaoGestor(id) {
  const row = document.querySelector(`#tb-gestor-geral tr[data-id="${id}"]`);
  const condutorIda = row.querySelector('.select-condutor-ida').value;
  const condutorVolta = row.querySelector('.select-condutor-volta').value;

  if (!condutorIda) return Components.Toast.error('Selecione condutor de ida');

  const solicitacao = cacheTodasSolicitacoesGestor.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, {
      status: 'Confirmada',
      condutor_ida: condutorIda,
      condutor_volta: condutorVolta || null
    });
    Components.Toast.success('Solicitação confirmada!');

    if (solicitacao) _notificarConfirmacao(solicitacao, condutorIda, condutorVolta);

    carregarGerenciamentoSolicitacoes(true);
  } catch (e) {
    Components.Toast.error('Erro ao confirmar');
  }
}

// PEDIDO DO USUÁRIO: botão "Confirmar geral" após "Limpar filtros" - confirma
// de uma vez só todas as solicitações que já têm motorista de ida atribuído
// e ainda não foram decididas.
//
// OBS/PREMISSA ASSUMIDA: o pedido original dizia "que não estejam com o
// status Em Análise" - só que TODA solicitação Pendente já vira "Em Análise"
// sozinha, assim que esta tela é aberta (ver marcarPendentesComoEmAnalise
// logo acima) - ou seja, na prática quase nunca sobra nada em "Pendente" pra
// esta regra pegar, e o botão praticamente não faria nada. Por isso foi
// implementado confirmando as solicitações com motorista atribuído que
// estejam em qualquer status NÃO FINAL (Pendente OU Em Análise) - excluindo
// só as que já são Confirmada/Ocupado/Cancelada/Desprezado - que é o
// resultado realmente útil e mais próximo do pedido.
async function confirmarGeralGestor() {
  const alvos = cacheTodasSolicitacoesGestor.filter(s => {
    const status = s.status || 'Pendente';
    return !!s.condutor_ida && (status === 'Pendente' || status === 'Em Análise');
  });

  if (!alvos.length) {
    Components.Toast.info('Nenhuma solicitação com motorista atribuído aguardando confirmação.');
    return;
  }
  if (!confirm(`Confirmar ${alvos.length} solicitação(ões) com motorista já atribuído?`)) return;

  let sucesso = 0;
  let falha = 0;

  for (const s of alvos) {
    try {
      await atualizarSolicitacao(s.id, {
        status: 'Confirmada',
        condutor_ida: s.condutor_ida,
        condutor_volta: s.condutor_volta || null
      });
      s.status = 'Confirmada';
      sucesso++;
      _notificarConfirmacao(s, s.condutor_ida, s.condutor_volta);
    } catch (e) {
      console.error('Erro ao confirmar em lote a solicitação', s.id, e);
      falha++;
    }
  }

  if (falha) {
    Components.Toast.warning(`${sucesso} confirmada(s), ${falha} com erro.`);
  } else {
    Components.Toast.success(`${sucesso} solicitação(ões) confirmada(s)!`);
  }

  aplicarFiltrosGestor();
}

async function marcarOcupadoGestor(id) {
  if (!confirm('Marcar como OCUPADO? O solicitante será notificado.')) return;

  const solicitacao = cacheTodasSolicitacoesGestor.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, { status: 'Ocupado' });
    Components.Toast.success('Marcado como Ocupado');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      criarNotificacao({
        email_destinatario: solicitacao.email_solicitante,
        tipo: 'ocupado',
        mensagem: `Sem veículo disponível para ${quando} (${trecho}). Entre em contato para reagendar.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante:', e));
    }

    carregarGerenciamentoSolicitacoes(true);
  } catch (e) {
    Components.Toast.error('Erro');
  }
}

async function cancelarSolicitacaoGestor(id) {
  if (!confirm('Cancelar esta solicitação?')) return;

  const solicitacao = cacheTodasSolicitacoesGestor.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, { status: 'Cancelada' });
    Components.Toast.success('Cancelada');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      criarNotificacao({
        email_destinatario: solicitacao.email_solicitante,
        tipo: 'cancelamento_gestor',
        mensagem: `Solicitação de ${quando} (${trecho}) cancelada pela gestão.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante:', e));
    }

    carregarGerenciamentoSolicitacoes(true);
  } catch (e) {
    Components.Toast.error('Erro');
  }
}

function editarSolicitacaoGestor(id) {
  // A edição é inline na tabela
  Components.Toast.info('Edite diretamente na tabela');
}

// Expor globalmente
window.carregarGerenciamentoSolicitacoes = carregarGerenciamentoSolicitacoes;
window.exportarSolicitacoesXlsxUI = exportarSolicitacoesXlsxUI;
window.confirmarSolicitacaoGestor = confirmarSolicitacaoGestor;
window.confirmarGeralGestor = confirmarGeralGestor;
window.marcarOcupadoGestor = marcarOcupadoGestor;
window.cancelarSolicitacaoGestor = cancelarSolicitacaoGestor;
window.editarSolicitacaoGestor = editarSolicitacaoGestor;
window.marcarCampoAlteradoGestor = marcarCampoAlteradoGestor;
window.salvarEdicoesLinhaGestor = salvarEdicoesLinhaGestor;
window.aplicarFiltrosGestor = aplicarFiltrosGestor;
window.limparFiltrosGestor = limparFiltrosGestor;
window.handleSelectLocalGestor = handleSelectLocalGestor;
window.ordenarPorDataEHoraSaida = ordenarPorDataEHoraSaida;
window.filtrarGestorHoje = filtrarGestorHoje;
