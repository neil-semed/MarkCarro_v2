// ============================================================
// MARKCARRO - Página: Próximas Agendas (Condutor)
// ============================================================
// Pedido do usuário: o condutor precisa ver, com antecedência, as corridas
// dos PRÓXIMOS 3 dias (a partir de amanhã) - exemplo: hoje sexta-feira, vê
// sábado/domingo/segunda - assim já sabe da agenda de segunda na sexta
// anterior, em vez de só descobrir no dia. Reaproveita o mesmo padrão de
// cards do Painel do Dia (pages/painel-dia.js), só que pra um período em
// vez de só "hoje", e sem os botões de ação (Registrar Km / Pane Mecânica)
// que só fazem sentido pra corrida do dia atual.

function _isoMaisDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

async function carregarProximasAgendas() {
  if (!usuarioAtual) return;

  const inicioISO = _isoMaisDias(1);
  const fimISO = _isoMaisDias(3);

  const elPeriodo = document.getElementById('proximas-agendas-periodo');
  if (elPeriodo) {
    const fmt = iso => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    elPeriodo.textContent = `${fmt(inicioISO)} a ${fmt(fimISO)}`;
  }

  const lista = document.getElementById('lista-proximas-agendas');
  if (lista) lista.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Carregando próximas corridas...</div>';

  try {
    const verTudo = !!usuarioAtual.ver_agenda_geral;
    const todas = await buscarSolicitacoesPorData(inicioISO, fimISO);
    const minhas = (todas || []).filter(s =>
      verTudo || s.condutor_ida === usuarioAtual.email || s.condutor_volta === usuarioAtual.email
    );

    minhas.sort((a, b) => (a.data_viagem || '').localeCompare(b.data_viagem || '') || (a.hora_saida || '').localeCompare(b.hora_saida || ''));
    renderizarProximasAgendas(minhas, verTudo);
  } catch (e) {
    console.error('Erro ao carregar próximas agendas:', e);
    if (lista) lista.innerHTML = '<div class="p-8 text-center text-red-500 text-sm">Erro ao carregar. Puxe pra baixo pra tentar de novo.</div>';
    Components.Toast.error('Erro ao carregar próximas agendas');
  }
}

function renderizarProximasAgendas(lista, verTudo) {
  const container = document.getElementById('lista-proximas-agendas');
  if (!container) return;

  if (!lista.length) {
    container.innerHTML = `
      <div class="text-center py-12 px-4">
        <div class="text-4xl mb-2">🔜</div>
        <p class="text-slate-500 text-sm">Nenhuma corrida agendada pros próximos 3 dias.</p>
      </div>
    `;
    return;
  }

  // Agrupado por dia (um cabeçalho de data por bloco), pra ficar claro qual
  // corrida é de qual dos 3 dias.
  const porDia = {};
  lista.forEach(s => {
    const dia = s.data_viagem || '—';
    if (!porDia[dia]) porDia[dia] = [];
    porDia[dia].push(s);
  });

  container.innerHTML = Object.keys(porDia).sort().map(dia => {
    const dataFormatada = dia !== '—'
      ? new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
      : dia;

    const cards = porDia[dia].map(s => {
      const papel = verTudo
        ? ''
        : (s.condutor_ida === usuarioAtual.email && s.condutor_volta === usuarioAtual.email
          ? 'Ida e Volta'
          : s.condutor_ida === usuarioAtual.email ? 'Ida' : 'Volta');
      const solicitante = s.nome_ext || s.email_solicitante || '';

      return `
        <div class="trip-card ${classeCorBordaViagem(s.status)} animate-fade-in">
          <div class="flex items-start justify-between gap-2">
            <p class="trip-time">${formatarHoraBR(s.hora_saida)}${s.hora_retorno ? ` <span class="text-slate-300">–</span> ${formatarHoraBR(s.hora_retorno)}` : ''}</p>
            <span class="badge ${classeStatus(s.status)} shrink-0">${s.status}</span>
          </div>
          ${papel ? `<span class="trip-tag mt-2 inline-block">${papel}</span>` : ''}
          <div class="trip-route">
            <div class="trip-route-point origem">
              <span class="trip-route-label">Origem</span>${s.origem || '—'}
            </div>
            <div class="trip-route-point destino">
              <span class="trip-route-label">Destino</span>${s.destino || '—'}
            </div>
          </div>
          <div class="trip-meta-row">${IconesViagem.usuario}<span>${solicitante}${s.telefone_ext ? ` · ${s.telefone_ext}` : ''}</span></div>
          <div class="trip-meta-row">${IconesViagem.passageiros}<span>${s.qtd_pessoas || 1} passageiro${(s.qtd_pessoas || 1) === 1 ? '' : 's'}</span></div>
          ${s.justificativa ? `<div class="trip-meta-row"><span class="italic">${s.justificativa}</span></div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="mb-4">
        <p class="text-sm font-semibold text-slate-700 capitalize mb-2">${dataFormatada}</p>
        ${cards}
      </div>
    `;
  }).join('');
}

// Expor globalmente
window.carregarProximasAgendas = carregarProximasAgendas;
