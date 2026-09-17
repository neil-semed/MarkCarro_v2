// ============================================================
// MARKCARRO - Página: Painel do Dia (Condutor)
// ============================================================
// Antes, esta tela não existia: nem HTML (tela-painel-dia) nem lógica real
// (app.js só tinha um placeholder "Em desenvolvimento" para
// carregarPainelDoDia). Como é a TELA INICIAL de todo condutor logo após o
// login (ver carregarPainelPorPerfil em pages/login.js), o app quebrava
// exatamente no momento em que um motorista entrava. Esta é a implementação
// real: mostra as corridas de HOJE em que o condutor logado está escalado
// (ida e/ou volta), pensada pra ser a primeira coisa que ele vê no celular.
// ============================================================

// Guarda as corridas de hoje deste condutor - reaproveitado por
// reportarPaneMecanica() pra avisar também as PRÓXIMAS corridas do dia
// (idas e voltas), não só a que disparou o botão.
let cachePainelDiaHoje = [];

async function carregarPainelDoDia() {
  if (!usuarioAtual) return;

  const hojeISO = new Date().toISOString().split('T')[0];
  const elData = document.getElementById('painel-dia-data');
  if (elData) {
    elData.textContent = new Date(hojeISO + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long'
    });
  }

  const lista = document.getElementById('lista-painel-dia');
  if (lista) lista.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Carregando corridas de hoje...</div>';

  try {
    const todasHoje = await buscarSolicitacoesPorData(hojeISO, hojeISO);
    const minhas = (todasHoje || []).filter(s =>
      s.condutor_ida === usuarioAtual.email || s.condutor_volta === usuarioAtual.email
    );

    minhas.sort((a, b) => (a.hora_saida || '').localeCompare(b.hora_saida || ''));
    cachePainelDiaHoje = minhas;

    renderizarPainelDoDia(minhas);
    await atualizarResumoKmHoje(hojeISO);
  } catch (e) {
    console.error('Erro ao carregar painel do dia:', e);
    if (lista) lista.innerHTML = '<div class="p-8 text-center text-red-500 text-sm">Erro ao carregar. Puxe pra baixo pra tentar de novo.</div>';
    Components.Toast.error('Erro ao carregar corridas de hoje');
  }
}

function renderizarPainelDoDia(lista) {
  const container = document.getElementById('lista-painel-dia');
  const contador = document.getElementById('painel-dia-contador');
  if (!container) return;

  if (contador) {
    contador.textContent = lista.length === 0
      ? 'Nenhuma corrida hoje'
      : lista.length === 1 ? '1 corrida hoje' : `${lista.length} corridas hoje`;
  }

  if (!lista.length) {
    container.innerHTML = `
      <div class="text-center py-12 px-4">
        <div class="text-4xl mb-2">🚗</div>
        <p class="text-slate-500 text-sm">Nenhuma corrida atribuída pra você hoje.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = lista.map(s => {
    const papel = s.condutor_ida === usuarioAtual.email && s.condutor_volta === usuarioAtual.email
      ? 'Ida e Volta'
      : s.condutor_ida === usuarioAtual.email ? 'Ida' : 'Volta';
    const solicitante = s.nome_ext || s.email_solicitante || '';

    return `
      <div class="trip-card ${classeCorBordaViagem(s.status)} animate-fade-in">
        <div class="flex items-start justify-between gap-2">
          <p class="trip-time">${formatarHoraBR(s.hora_saida)}${s.hora_retorno ? ` <span class="text-slate-300">–</span> ${formatarHoraBR(s.hora_retorno)}` : ''}</p>
          <span class="badge ${classeStatus(s.status)} shrink-0">${s.status}</span>
        </div>
        <span class="trip-tag mt-2 inline-block">${papel}</span>
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
        <div class="flex gap-2 mt-3">
          <a href="tel:${(s.telefone_ext || '').replace(/\D/g,'')}" class="${s.telefone_ext ? '' : 'hidden'} btn-outline text-xs py-2 px-3 flex-1 text-center">📞 Ligar</a>
          <button onclick="abrirRegistroKm()" class="btn-primary text-xs py-2 px-3 flex-1">Registrar KM</button>
        </div>
        <button onclick="reportarPaneMecanica('${s.id}', '${(s.origem || '').replace(/'/g, "\\'")}', '${(s.destino || '').replace(/'/g, "\\'")}', '${s.email_solicitante || ''}')" class="btn-danger text-xs py-2 px-3 w-full mt-2">🔧 Reportar Pane Mecânica</button>
      </div>
    `;
  }).join('');
}

// Mostra rapidamente se o condutor já lançou o KM inicial/final de hoje,
// como lembrete na própria tela inicial (evita esquecer de registrar).
async function atualizarResumoKmHoje(hojeISO) {
  const el = document.getElementById('painel-dia-km-status');
  if (!el || !usuarioAtual) return;
  try {
    const registro = await buscarKM_porData(usuarioAtual.email, hojeISO);
    if (!registro) {
      el.innerHTML = '⏳ Você ainda não registrou o KM inicial de hoje.';
      el.className = 'text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3';
    } else if (!registro.km_final) {
      el.innerHTML = `✅ KM inicial (${registro.km_inicial}) registrado. Falta o KM final ao fim do dia.`;
      el.className = 'text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3';
    } else {
      el.innerHTML = `✅ KM de hoje completo: ${registro.km_final - registro.km_inicial} km rodados.`;
      el.className = 'text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3';
    }
  } catch (e) {
    el.classList.add('hidden');
  }
}

function puxarParaAtualizarPainelDia() {
  carregarPainelDoDia();
}

// Pane mecânica: botão pedido pelo usuário pra o condutor avisar rápido
// que o veículo quebrou, sem precisar ligar/mandar mensagem por fora do
// app. Não muda o status da solicitação (isso continua sendo decisão do
// gestor, que vai reatribuir outro condutor manualmente pelas telas que
// já existem) - é só um aviso imediato pro solicitante e pra gestão,
// reaproveitando o sino de notificações que o app já tem.
async function reportarPaneMecanica(id, origem, destino, emailSolicitante) {
  if (!confirm('Confirma o registro de pane mecânica nesta viagem? O solicitante desta corrida, a gestão e os solicitantes das PRÓXIMAS corridas de hoje (idas e voltas ainda não realizadas) serão avisados agora.')) return;

  const trecho = `${origem || '—'} → ${destino || '—'}`;
  const nomeCondutor = usuarioAtual?.nome || usuarioAtual?.email || 'Condutor';
  const agora = new Date();
  const hojeISO = new Date().toISOString().split('T')[0];

  try {
    if (emailSolicitante) {
      await criarNotificacao({
        email_destinatario: emailSolicitante,
        tipo: 'pane_mecanica',
        mensagem: `Veículo de sua viagem com defeito. (${trecho})`,
        lida: false
      });
    }

    // NOVO (pedido do usuário): pane mecânica pode atrasar o condutor pro
    // resto do dia - avisa também os solicitantes das OUTRAS corridas de
    // hoje deste mesmo condutor (ida OU volta) cujo horário ainda não
    // passou. Ex: pane às 11h - o retorno agendado pra 12h (de uma corrida
    // cuja ida já foi mais cedo) e a agenda de 13h também são avisados.
    const outrasAfetadas = (cachePainelDiaHoje || []).filter(s => {
      if (String(s.id) === String(id)) return false;
      const horaSaida = s.hora_saida ? new Date(`${hojeISO}T${s.hora_saida.substring(0, 5)}:00`) : null;
      const horaRetorno = s.hora_retorno ? new Date(`${hojeISO}T${s.hora_retorno.substring(0, 5)}:00`) : null;
      return (horaSaida && horaSaida >= agora) || (horaRetorno && horaRetorno >= agora);
    });

    await Promise.all(outrasAfetadas.map(s => {
      if (!s.email_solicitante) return Promise.resolve();
      return criarNotificacao({
        email_destinatario: s.email_solicitante,
        tipo: 'pane_mecanica',
        mensagem: `Sua viagem das ${formatarHoraBR(s.hora_saida)} pode atrasar: pane mecânica reportada em outra corrida do mesmo condutor.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante afetado:', e));
    }));

    await notificarTodosGestores(
      `Pane mecânica reportada por ${nomeCondutor} na viagem ${trecho}.` + (outrasAfetadas.length ? ` ${outrasAfetadas.length} outra(s) corrida(s) de hoje deste condutor também foram avisadas.` : ''),
      'pane_mecanica'
    );
    Components.Toast.success('Pane registrada. Solicitante(s) e gestão foram avisados.');
  } catch (e) {
    console.error('Erro ao reportar pane mecânica:', e);
    Components.Toast.error('Não foi possível registrar a pane agora. Tente de novo.');
  }
}

// Pane mecânica - versão "geral" pro botão do topo do app (perfil
// Condutor): mesma ideia da reportarPaneMecanica(), mas sem viagem
// específica de origem (o condutor pode acionar sem estar olhando pra um
// card) - avisa a gestão e os solicitantes de TODAS as corridas de hoje
// deste condutor que ainda não aconteceram (ida ou volta, horário >= agora).
async function reportarPaneMecanicaGeral() {
  if (!confirm('Confirma o registro de pane mecânica? A gestão e os solicitantes das corridas de hoje ainda não realizadas serão avisados agora.')) return;

  const nomeCondutor = usuarioAtual?.nome || usuarioAtual?.email || 'Condutor';
  const agora = new Date();
  const hojeISO = new Date().toISOString().split('T')[0];

  try {
    const afetadas = (cachePainelDiaHoje || []).filter(s => {
      const horaSaida = s.hora_saida ? new Date(`${hojeISO}T${s.hora_saida.substring(0, 5)}:00`) : null;
      const horaRetorno = s.hora_retorno ? new Date(`${hojeISO}T${s.hora_retorno.substring(0, 5)}:00`) : null;
      return (horaSaida && horaSaida >= agora) || (horaRetorno && horaRetorno >= agora);
    });

    await Promise.all(afetadas.map(s => {
      if (!s.email_solicitante) return Promise.resolve();
      return criarNotificacao({
        email_destinatario: s.email_solicitante,
        tipo: 'pane_mecanica',
        mensagem: `Sua viagem das ${formatarHoraBR(s.hora_saida)} pode atrasar: pane mecânica reportada pelo condutor.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante afetado:', e));
    }));

    await notificarTodosGestores(
      `Pane mecânica reportada por ${nomeCondutor}.` + (afetadas.length ? ` ${afetadas.length} corrida(s) de hoje ainda não realizadas foram avisadas.` : ' Nenhuma corrida pendente pra avisar hoje.'),
      'pane_mecanica'
    );
    Components.Toast.success('Pane registrada. Solicitante(s) e gestão foram avisados.');
  } catch (e) {
    console.error('Erro ao reportar pane mecânica geral:', e);
    Components.Toast.error('Não foi possível registrar a pane agora. Tente de novo.');
  }
}

// Expor globalmente
window.carregarPainelDoDia = carregarPainelDoDia;
window.puxarParaAtualizarPainelDia = puxarParaAtualizarPainelDia;
window.reportarPaneMecanica = reportarPaneMecanica;
window.reportarPaneMecanicaGeral = reportarPaneMecanicaGeral;
