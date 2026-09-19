// ============================================================
// MARKCARRO - Página: Agenda do Condutor
// ============================================================
// Por padrão mostra só as corridas do próprio condutor (Ida/Volta). Se o
// gestor liberou "Ver Agenda Geral" pra esse condutor (Gerenciar
// Condutores > coluna "Agenda Geral"), mostra TODAS as corridas do
// período, igual a tela de Agenda de Corridas do Admin - só que somente
// leitura (sem os botões de gerenciar).
//
// Antes o toggle "Ver Agenda Geral" salvava certinho no perfil
// (profiles.ver_agenda_geral), mas NADA aqui verificava esse campo - a
// tela sempre filtrava só pelas corridas do próprio condutor, então o
// motorista nunca via a agenda geral mesmo com a permissão liberada
// (parecia que o toggle "não salvava", mas na verdade salvava - só que
// não tinha efeito nenhum na leitura).
//
// IMPORTANTE: também depende da policy de RLS liberando o SELECT pro
// condutor nesse caso (ver supabase_agenda_geral_condutor.sql) - sem
// ela, o Postgres continua devolvendo só as próprias corridas mesmo
// pedindo tudo (RLS filtra antes do JS rodar).

// Guarda o resultado já filtrado por data+Confirmada+motorista atribuído,
// ANTES de aplicar os dropdowns de motorista/origem/destino - usado tanto
// pra repopular as opções dos 3 dropdowns quanto pra reaplicar o filtro
// deles sem precisar buscar tudo de novo no Supabase (ver
// popularFiltrosAgendaCondutor/aplicarFiltrosAgendaCondutor abaixo).
let cacheAgendaCondutorDia = [];

async function carregarAgendaCondutor() {
  if (!usuarioAtual) return;

  // PEDIDO DO USUÁRIO ("Agenda geral - filtro de data (somente uma data)"):
  // antes era um intervalo De/Até - agora é 1 campo de data só.
  const dataSelecionada = document.getElementById('agenda-condutor-data').value;
  const verTudo = !!usuarioAtual.ver_agenda_geral;

  document.getElementById('agenda-condutor-badge-geral')?.classList.toggle('hidden', !verTudo);
  const thPapel = document.getElementById('th-agenda-condutor-papel');
  if (thPapel) thPapel.textContent = verTudo ? 'Condutor(es)' : 'Papel';

  Components.Loading.show(document.getElementById('tb-agenda-condutor'));
  const cards = document.getElementById('cards-agenda-condutor');
  if (cards) cards.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Carregando...</div>';

  try {
    // Na Agenda Geral, carrega a lista de condutores (só uma vez) pra poder
    // mostrar o NOME de quem está escalado em cada corrida, em vez do
    // e-mail cru - a policy de SELECT em "profiles" já libera isso pra
    // qualquer usuário autenticado, não só admin.
    // CORREÇÃO (pedido do usuário, 5ª vez - "nome dos motoristas tem que
    // aparecer nos cards"): usa listarCondutoresParaExibicao() (sem filtro
    // de "ativo") em vez de listarCondutores() - ver comentário completo
    // dessa função em api.js. Também usa uma cache PRÓPRIA
    // (cacheCondutoresParaExibicao, compartilhada com Viagens do Dia,
    // Agenda de Corridas e Minhas Solicitações), separada de
    // cacheCondutores - que é preenchida (só com ativos) por outras telas
    // como o Dashboard do Gestor, e sendo a MESMA variável global, uma
    // vez preenchida ali "vencia" aqui também e nunca era recarregada.
    if (verTudo && (!cacheCondutoresParaExibicao || !cacheCondutoresParaExibicao.length)) {
      try { cacheCondutoresParaExibicao = await listarCondutoresParaExibicao(); } catch (e) { /* mostra e-mail se falhar */ }
    }

    let dados;
    if (dataSelecionada) {
      dados = await buscarSolicitacoesPorData(dataSelecionada, dataSelecionada);
      if (!verTudo) {
        dados = (dados || []).filter(s =>
          mesmoEmail(s.condutor_ida, usuarioAtual.email) || mesmoEmail(s.condutor_volta, usuarioAtual.email)
        );
      }
    } else if (verTudo) {
      dados = await buscarTodasSolicitacoes();
    } else {
      dados = await buscarSolicitacoesPorCondutor(usuarioAtual.email);
    }
    // PEDIDO DO USUÁRIO ("Agenda geral - apresentar todas as solicitações
    // aprovadas e com motorista atribuído"): status Confirmada + condutor_ida
    // preenchido. Na prática confirmarSolicitacaoGestor() já exige
    // condutor_ida pra confirmar uma solicitação, então "condutor_ida"
    // vazio numa Confirmada não deveria acontecer - isso aqui é só uma
    // trava de segurança extra, garantindo direto na tela também.
    dados = (dados || []).filter(s => (s.status || 'Pendente') === 'Confirmada' && !!s.condutor_ida);

    cacheAgendaCondutorDia = dados;
    popularFiltrosAgendaCondutor(dados);
    renderizarAgendaCondutor(aplicarFiltrosAgendaCondutorLista(dados), verTudo);
  } catch (e) {
    console.error('Erro ao carregar agenda do condutor:', e);
    document.getElementById('tb-agenda-condutor').innerHTML = `<tr><td colspan="8" class="text-center text-red-500 py-8">Erro ao carregar agenda. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarAgendaCondutor()">Tentar de novo</button></td></tr>`;
    if (cards) cards.innerHTML = '<div class="text-center text-red-500 py-8 text-sm">Erro ao carregar agenda.</div>';
    Components.Toast.error('Erro ao carregar agenda');
  }
}

// PEDIDO DO USUÁRIO: dropdowns de Motorista/Origem/Destino, com as opções
// vindas só das corridas da DATA SELECIONADA (não de todo o histórico) -
// preenche os 3 <select> com os valores realmente presentes em `dados`,
// preservando a seleção atual quando ela ainda existir na nova lista.
function popularFiltrosAgendaCondutor(dados) {
  const selMotorista = document.getElementById('agenda-condutor-filtro-motorista');
  const selOrigem = document.getElementById('agenda-condutor-filtro-origem');
  const selDestino = document.getElementById('agenda-condutor-filtro-destino');
  if (!selMotorista || !selOrigem || !selDestino) return;

  const valorMotorista = selMotorista.value;
  const valorOrigem = selOrigem.value;
  const valorDestino = selDestino.value;

  const emailsMotoristas = new Set();
  dados.forEach(s => {
    if (s.condutor_ida) emailsMotoristas.add(s.condutor_ida);
    if (s.condutor_volta) emailsMotoristas.add(s.condutor_volta);
  });
  const listaMotoristas = Array.from(emailsMotoristas)
    .map(email => ({ email, nome: _nomeCondutor(email) }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  selMotorista.innerHTML = '<option value="">Todos os motoristas</option>' +
    listaMotoristas.map(m => `<option value="${m.email}">${m.nome}</option>`).join('');
  if (listaMotoristas.some(m => m.email === valorMotorista)) selMotorista.value = valorMotorista;

  const origens = Array.from(new Set(dados.map(s => s.origem).filter(Boolean))).sort();
  selOrigem.innerHTML = '<option value="">Todas as origens</option>' +
    origens.map(o => `<option value="${o}">${o}</option>`).join('');
  if (origens.includes(valorOrigem)) selOrigem.value = valorOrigem;

  const destinos = Array.from(new Set(dados.map(s => s.destino).filter(Boolean))).sort();
  selDestino.innerHTML = '<option value="">Todos os destinos</option>' +
    destinos.map(d => `<option value="${d}">${d}</option>`).join('');
  if (destinos.includes(valorDestino)) selDestino.value = valorDestino;
}

// Aplica os 3 dropdowns sobre a lista já carregada (sem nova chamada ao
// Supabase) - o filtro por motorista casa tanto condutor_ida quanto
// condutor_volta (pedido do usuário: "apresentará as solicitações da data
// selecionada, atribuídas ao motorista filtrado").
function aplicarFiltrosAgendaCondutorLista(dados) {
  const motorista = document.getElementById('agenda-condutor-filtro-motorista')?.value || '';
  const origem = document.getElementById('agenda-condutor-filtro-origem')?.value || '';
  const destino = document.getElementById('agenda-condutor-filtro-destino')?.value || '';

  let filtrados = dados;
  if (motorista) filtrados = filtrados.filter(s => mesmoEmail(s.condutor_ida, motorista) || mesmoEmail(s.condutor_volta, motorista));
  if (origem) filtrados = filtrados.filter(s => s.origem === origem);
  if (destino) filtrados = filtrados.filter(s => s.destino === destino);
  return filtrados;
}

function aplicarFiltrosAgendaCondutor() {
  const verTudo = !!usuarioAtual?.ver_agenda_geral;
  renderizarAgendaCondutor(aplicarFiltrosAgendaCondutorLista(cacheAgendaCondutorDia), verTudo);
}

function papelDoCondutor(s) {
  return mesmoEmail(s.condutor_ida, usuarioAtual.email) && mesmoEmail(s.condutor_volta, usuarioAtual.email)
    ? 'Ida e Volta'
    : mesmoEmail(s.condutor_ida, usuarioAtual.email) ? 'Ida' : 'Volta';
}

// Na Agenda Geral a corrida pode nem ser do condutor logado - mostra quem
// está escalado (nome, se já tiver sido carregado em cacheCondutores;
// senão o e-mail mesmo) em vez de "Ida"/"Volta" relativos a "eu".
function _nomeCondutor(email) {
  if (!email) return '';
  const c = (typeof cacheCondutoresParaExibicao !== 'undefined' ? cacheCondutoresParaExibicao : []).find(x => x.email === email);
  return c?.nome || email;
}

function papelOuEscalacao(s, verTudo) {
  if (!verTudo) return papelDoCondutor(s);
  const partes = [];
  if (s.condutor_ida) partes.push(`Ida: ${_nomeCondutor(s.condutor_ida)}`);
  if (s.condutor_volta) partes.push(`Volta: ${_nomeCondutor(s.condutor_volta)}`);
  return partes.join(' · ') || '—';
}

// CORREÇÃO (pedido do usuário: "motorista de ida em uma linha, de volta em
// outra linha - se ida e volta for o mesmo motorista mencionar o nome 1
// vez"): usada na Agenda Geral (verTudo) no lugar de papelOuEscalacao() -
// devolve uma LINHA por motorista escalado, em vez de "Ida: X · Volta: Y"
// tudo espremido na mesma linha; quando o mesmo motorista está escalado
// pra Ida e Volta, devolve uma linha só ("Ida e Volta: Nome") em vez de
// repetir o mesmo nome 2 vezes.
function linhasEscalacaoCondutores(s) {
  const emailIda = s.condutor_ida || '';
  const emailVolta = s.condutor_volta || '';
  if (!emailIda && !emailVolta) return ['—'];
  if (emailIda && emailVolta && emailIda === emailVolta) {
    return [`Ida e Volta: ${_nomeCondutor(emailIda)}`];
  }
  const linhas = [];
  if (emailIda) linhas.push(`Ida: ${_nomeCondutor(emailIda)}`);
  if (emailVolta) linhas.push(`Volta: ${_nomeCondutor(emailVolta)}`);
  return linhas;
}

function renderizarAgendaCondutor(dados, verTudo) {
  const tbody = document.getElementById('tb-agenda-condutor');
  const cards = document.getElementById('cards-agenda-condutor');

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-500 py-8">Nenhuma corrida</td></tr>';
    if (cards) cards.innerHTML = '<div class="text-center text-slate-500 py-8 text-sm">Nenhuma corrida encontrada.</div>';
    return;
  }

  tbody.innerHTML = dados.map(s => `
    <tr>
      <td>${formatarDataBR(s.data_viagem)}</td>
      <td>${formatarHoraBR(s.hora_saida)}</td>
      <td>${formatarHoraBR(s.hora_retorno)}</td>
      <td>${s.origem} → ${s.destino}</td>
      <td>${s.nome_ext || s.email_solicitante}</td>
      <td>${verTudo ? linhasEscalacaoCondutores(s).join('<br>') : papelOuEscalacao(s, verTudo)}</td>
      <td>${s.justificativa || ''}</td>
      <td><span class="badge ${classeStatus(s.status)}">${s.status}</span></td>
    </tr>
  `).join('');

  if (cards) {
    cards.innerHTML = dados.map(s => `
      <div class="trip-card ${classeCorBordaViagem(s.status)}">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="trip-time">${formatarHoraBR(s.hora_saida)}${s.hora_retorno ? ` <span class="text-slate-300">–</span> ${formatarHoraBR(s.hora_retorno)}` : ''}</p>
            <p class="text-xs text-slate-500 mt-0.5">${formatarDataBR(s.data_viagem)}</p>
          </div>
          <span class="badge ${classeStatus(s.status)} shrink-0">${s.status}</span>
        </div>
        <span class="trip-tag mt-2 inline-block">${verTudo ? 'Agenda Geral' : papelOuEscalacao(s, verTudo)}</span>
        <div class="trip-route">
          <div class="trip-route-point origem">
            <span class="trip-route-label">Origem</span>${s.origem || '—'}
          </div>
          <div class="trip-route-point destino">
            <span class="trip-route-label">Destino</span>${s.destino || '—'}
          </div>
        </div>
        ${verTudo ? linhasEscalacaoCondutores(s).map(linha => `<div class="trip-meta-row">${IconesViagem.carro}<span>${linha}</span></div>`).join('') : ''}
        <div class="trip-meta-row">${IconesViagem.usuario}<span>${s.nome_ext || s.email_solicitante}${s.telefone_ext ? ` · ${s.telefone_ext}` : ''}</span></div>
        <div class="trip-meta-row">${IconesViagem.passageiros}<span>${s.qtd_pessoas || 1} passageiro${(s.qtd_pessoas || 1) === 1 ? '' : 's'}</span></div>
        ${s.justificativa ? `<div class="trip-meta-row"><span class="italic">${s.justificativa}</span></div>` : ''}
      </div>
    `).join('');
  }
}

function limparFiltroAgendaCondutor() {
  document.getElementById('agenda-condutor-data').value = '';
  const selMotorista = document.getElementById('agenda-condutor-filtro-motorista');
  const selOrigem = document.getElementById('agenda-condutor-filtro-origem');
  const selDestino = document.getElementById('agenda-condutor-filtro-destino');
  if (selMotorista) selMotorista.value = '';
  if (selOrigem) selOrigem.value = '';
  if (selDestino) selDestino.value = '';
  carregarAgendaCondutor();
}

// Expor globalmente
window.carregarAgendaCondutor = carregarAgendaCondutor;
window.limparFiltroAgendaCondutor = limparFiltroAgendaCondutor;
window.aplicarFiltrosAgendaCondutor = aplicarFiltrosAgendaCondutor;
