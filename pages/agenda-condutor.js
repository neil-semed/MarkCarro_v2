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

async function carregarAgendaCondutor() {
  if (!usuarioAtual) return;

  const inicio = document.getElementById('agenda-condutor-data-inicio').value;
  const fim = document.getElementById('agenda-condutor-data-fim').value;
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
    if (verTudo && (!cacheCondutores || !cacheCondutores.length)) {
      try { cacheCondutores = await listarCondutores(); } catch (e) { /* mostra e-mail se falhar */ }
    }

    let dados;
    if (inicio && fim) {
      dados = await buscarSolicitacoesPorData(inicio, fim);
      if (!verTudo) {
        dados = (dados || []).filter(s =>
          s.condutor_ida === usuarioAtual.email || s.condutor_volta === usuarioAtual.email
        );
      }
    } else if (verTudo) {
      dados = await buscarTodasSolicitacoes();
    } else {
      dados = await buscarSolicitacoesPorCondutor(usuarioAtual.email);
    }
    renderizarAgendaCondutor(dados || [], verTudo);
  } catch (e) {
    console.error('Erro ao carregar agenda do condutor:', e);
    document.getElementById('tb-agenda-condutor').innerHTML = `<tr><td colspan="8" class="text-center text-red-500 py-8">Erro ao carregar agenda. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarAgendaCondutor()">Tentar de novo</button></td></tr>`;
    if (cards) cards.innerHTML = '<div class="text-center text-red-500 py-8 text-sm">Erro ao carregar agenda.</div>';
    Components.Toast.error('Erro ao carregar agenda');
  }
}

function papelDoCondutor(s) {
  return s.condutor_ida === usuarioAtual.email && s.condutor_volta === usuarioAtual.email
    ? 'Ida e Volta'
    : s.condutor_ida === usuarioAtual.email ? 'Ida' : 'Volta';
}

// Na Agenda Geral a corrida pode nem ser do condutor logado - mostra quem
// está escalado (nome, se já tiver sido carregado em cacheCondutores;
// senão o e-mail mesmo) em vez de "Ida"/"Volta" relativos a "eu".
function _nomeCondutor(email) {
  if (!email) return '';
  const c = (typeof cacheCondutores !== 'undefined' ? cacheCondutores : []).find(x => x.email === email);
  return c?.nome || email;
}

function papelOuEscalacao(s, verTudo) {
  if (!verTudo) return papelDoCondutor(s);
  const partes = [];
  if (s.condutor_ida) partes.push(`Ida: ${_nomeCondutor(s.condutor_ida)}`);
  if (s.condutor_volta) partes.push(`Volta: ${_nomeCondutor(s.condutor_volta)}`);
  return partes.join(' · ') || '—';
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
      <td>${papelOuEscalacao(s, verTudo)}</td>
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
        ${verTudo ? `<div class="trip-meta-row">${IconesViagem.carro}<span>${papelOuEscalacao(s, verTudo)}</span></div>` : ''}
        <div class="trip-meta-row">${IconesViagem.usuario}<span>${s.nome_ext || s.email_solicitante}</span></div>
        ${s.justificativa ? `<div class="trip-meta-row"><span class="italic">${s.justificativa}</span></div>` : ''}
      </div>
    `).join('');
  }
}

function limparFiltroAgendaCondutor() {
  document.getElementById('agenda-condutor-data-inicio').value = '';
  document.getElementById('agenda-condutor-data-fim').value = '';
  carregarAgendaCondutor();
}

// Expor globalmente
window.carregarAgendaCondutor = carregarAgendaCondutor;
window.limparFiltroAgendaCondutor = limparFiltroAgendaCondutor;
