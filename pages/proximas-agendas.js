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
    const [todasResultado, boraLaResultado] = await Promise.allSettled([
      buscarSolicitacoesPorData(inicioISO, fimISO),
      usuarioAtual.placa ? buscarAgendaBoraLa(inicioISO, fimISO) : Promise.resolve([])
    ]);

    if (todasResultado.status === 'rejected') throw todasResultado.reason;
    // PEDIDO DO USUÁRIO: "Próximas agendas - mostrar apenas viagens
    // atribuídas ao motorista logado" - antes, condutores com a permissão
    // "Ver Agenda Geral" (verTudo) viam AQUI também as corridas de todo
    // mundo, igual na Agenda Geral - só que "Próximas Agendas" é a agenda
    // PESSOAL do condutor, então sempre filtra só pelas corridas dele,
    // mesmo quando ele tem essa permissão (que continua valendo só na tela
    // Agenda Geral). Mantido também o filtro de só mostrar Confirmada -
    // sem isso, corridas ainda Pendente/Em Análise (ou já Cancelada/Ocupado,
    // que mantêm o condutor salvo mesmo depois de desmarcadas) apareciam
    // aqui como se fossem compromissos garantidos.
    const minhas = (todasResultado.value || []).filter(s =>
      (s.status || 'Pendente') === 'Confirmada' &&
      (mesmoEmail(s.condutor_ida, usuarioAtual.email) || mesmoEmail(s.condutor_volta, usuarioAtual.email))
    );

    // PEDIDO DO USUÁRIO ("a mesma regra de apresentar no bora lá na tela
    // hoje, vale para a tela próximas e tela geral" - mesmo princípio já
    // aplicado no Painel do Dia): mescla, pela placa deste condutor, as
    // corridas do Bora Lá dentro da mesma janela de 3 dias. Se o Bora Lá
    // estiver fora do ar, não trava a tela - só mostra as do MarkCarro.
    let doBoraLa = [];
    if (boraLaResultado.status === 'fulfilled') {
      doBoraLa = (boraLaResultado.value || [])
        .filter(l => (l.placa || '').toUpperCase() === (usuarioAtual.placa || '').toUpperCase());
    } else if (usuarioAtual.placa) {
      console.error('Erro ao carregar agenda do Bora Lá (próximas agendas):', boraLaResultado.reason);
    }

    const combinadas = [...minhas, ...doBoraLa];
    combinadas.sort((a, b) => (a.data_viagem || '').localeCompare(b.data_viagem || '') || (a.hora_saida || '').localeCompare(b.hora_saida || ''));
    renderizarProximasAgendas(combinadas);
  } catch (e) {
    console.error('Erro ao carregar próximas agendas:', e);
    if (lista) lista.innerHTML = '<div class="p-8 text-center text-red-500 text-sm">Erro ao carregar. Puxe pra baixo pra tentar de novo.</div>';
    Components.Toast.error('Erro ao carregar próximas agendas');
  }
}

function renderizarProximasAgendas(lista) {
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
      const doBoraLa = s.sistema === 'bora_la';
      // Sempre relativo ao próprio condutor logado - esta tela agora só
      // mostra as corridas dele (ver comentário em carregarProximasAgendas).
      // Corrida do Bora Lá usa o mesmo card, com destaque azul (mesmo padrão
      // do Painel do Dia - ver pages/painel-dia.js).
      const papel = doBoraLa ? 'Bora Lá' : (mesmoEmail(s.condutor_ida, usuarioAtual.email) && mesmoEmail(s.condutor_volta, usuarioAtual.email)
        ? 'Ida e Volta'
        : mesmoEmail(s.condutor_ida, usuarioAtual.email) ? 'Ida' : 'Volta');
      const statusExibido = doBoraLa ? 'Confirmada' : s.status;
      const solicitante = doBoraLa ? (s.nome_solicitante || '') : (s.nome_ext || s.email_solicitante || '');
      const telefone = doBoraLa ? s.telefone_solicitante : s.telefone_ext;
      const classeBorda = doBoraLa ? 'trip-card-em-analise' : classeCorBordaViagem(statusExibido);
      const classeBadge = doBoraLa ? 'badge-em-analise' : classeStatus(statusExibido);

      return `
        <div class="trip-card ${classeBorda} animate-fade-in">
          <div class="flex items-start justify-between gap-2">
            <p class="trip-time">${formatarHoraBR(s.hora_saida)}${s.hora_retorno ? ` <span class="text-slate-300">–</span> ${formatarHoraBR(s.hora_retorno)}` : ''}</p>
            <span class="badge ${classeBadge} shrink-0">${doBoraLa ? '🚐 Bora Lá' : statusExibido}</span>
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
          <div class="trip-meta-row">${IconesViagem.usuario}<span>${solicitante}${telefone ? ` · ${telefone}` : ''}</span></div>
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
