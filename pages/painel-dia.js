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
// reportarPaneMecanicaGeral() (botão único no topo) pra avisar os
// solicitantes das corridas de hoje ainda não realizadas.
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
    const [todasHoje, boraLaResultado] = await Promise.allSettled([
      buscarSolicitacoesPorData(hojeISO, hojeISO),
      usuarioAtual.placa ? buscarAgendaBoraLa(hojeISO, hojeISO) : Promise.resolve([])
    ]);

    if (todasHoje.status === 'rejected') throw todasHoje.reason;
    const minhas = (todasHoje.value || []).filter(s =>
      mesmoEmail(s.condutor_ida, usuarioAtual.email) || mesmoEmail(s.condutor_volta, usuarioAtual.email)
    );

    // PEDIDO DO USUÁRIO ("trabalhe o app do markcarro, pois não carregou as
    // informações do bora-la - replique as mesmas informações do card do
    // bora la"): mescla, na MESMA lista (ordenada por horário), as corridas
    // do Bora Lá com a mesma placa deste condutor - só entra se o perfil
    // tiver placa cadastrada. Se o Bora Lá estiver fora do ar, não trava a
    // tela: só mostra as corridas do MarkCarro mesmo (mesmo padrão já usado
    // na Agenda Combinada do Admin).
    let doBoraLa = [];
    if (boraLaResultado.status === 'fulfilled') {
      doBoraLa = (boraLaResultado.value || [])
        .filter(l => (l.placa || '').toUpperCase() === (usuarioAtual.placa || '').toUpperCase());
    } else if (usuarioAtual.placa) {
      console.error('Erro ao carregar agenda do Bora Lá (painel do dia):', boraLaResultado.reason);
    }

    const combinadas = [...minhas, ...doBoraLa];
    combinadas.sort((a, b) => (a.hora_saida || '').localeCompare(b.hora_saida || ''));
    cachePainelDiaHoje = minhas; // pane mecânica só avisa solicitantes do MarkCarro

    renderizarPainelDoDia(combinadas);
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
    const doBoraLa = s.sistema === 'bora_la';
    // PEDIDO DO USUÁRIO ("replique as mesmas informações do card do bora
    // la"): corrida do Bora Lá usa o mesmo card, só com origem/destino/
    // solicitante/telefone/passageiros já vindos prontos da Edge Function
    // (agenda-veiculos) - status sempre "Confirmada" porque ela só devolve
    // corridas já ocupando a van (approved/in_transit/completed lá).
    const papel = doBoraLa ? 'Bora Lá' : (mesmoEmail(s.condutor_ida, usuarioAtual.email) && mesmoEmail(s.condutor_volta, usuarioAtual.email)
      ? 'Ida e Volta'
      : mesmoEmail(s.condutor_ida, usuarioAtual.email) ? 'Ida' : 'Volta');
    const statusExibido = doBoraLa ? 'Confirmada' : s.status;
    // origem/destino/qtd_pessoas já vêm com os mesmos nomes de campo dos 2
    // lados (solicitacoes do MarkCarro e agenda-veiculos do Bora Lá).
    const solicitante = doBoraLa ? (s.nome_solicitante || '') : (s.nome_ext || s.email_solicitante || '');
    const telefone = doBoraLa ? s.telefone_solicitante : s.telefone_ext;

    return `
      <div class="trip-card ${classeCorBordaViagem(statusExibido)} animate-fade-in">
        <div class="flex items-start justify-between gap-2">
          <p class="trip-time">${formatarHoraBR(s.hora_saida)}${s.hora_retorno ? ` <span class="text-slate-300">–</span> ${formatarHoraBR(s.hora_retorno)}` : ''}</p>
          <span class="badge ${classeStatus(statusExibido)} shrink-0">${doBoraLa ? '🚐 Bora Lá' : statusExibido}</span>
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
        <div class="trip-meta-row">${IconesViagem.usuario}<span>${solicitante}${telefone ? ` · ${telefone}` : ''}</span></div>
        <div class="trip-meta-row">${IconesViagem.passageiros}<span>${s.qtd_pessoas || 1} passageiro${(s.qtd_pessoas || 1) === 1 ? '' : 's'}</span></div>
        ${s.justificativa ? `<div class="trip-meta-row"><span class="italic">${s.justificativa}</span></div>` : ''}
        <!-- PEDIDO DO USUÁRIO: "Registro de km - retirar dos cards - será
             apenas na aba KM" e "Reportar pane mecânica - tirar do card -
             colocar no topo" - os dois botões de ação por corrida saíram
             daqui; KM só pela aba própria (Registro de KM) e Pane Mecânica
             virou um botão único no topo do app (ver
             #btn-pane-topo-condutor no cabeçalho + reportarPaneMecanicaGeral
             logo abaixo). -->
        <div class="flex gap-2 mt-3">
          <a href="tel:${(telefone || '').replace(/\D/g,'')}" class="${telefone ? '' : 'hidden'} btn-outline text-xs py-2 px-3 flex-1 text-center">📞 Ligar</a>
        </div>
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

// Pane mecânica - botão único no topo do app (perfil Condutor - ver
// #btn-pane-topo-condutor no cabeçalho, index.html). Substituiu o botão que
// existia em cada card de viagem (pedido do usuário: "tirar do card -
// colocar no topo").
//
// REGRA DE DISPARO (pedido do usuário, com exemplo): ao clicar às 10h,
// avisa os solicitantes das viagens de HOJE cuja ida OU volta seja a partir
// de 10:01 (ou seja, T + 1 minuto em diante) - uma viagem com ida às 9h (já
// passou) e volta às 11h (futuro) deve gerar UMA ÚNICA notificação pro
// solicitante dela, nunca duas (uma por perna) - por isso o filtro abaixo
// roda sobre as SOLICITAÇÕES (uma por linha), não sobre idas/voltas
// separadas, e o .map() de notificação só cria 1 criarNotificacao() por
// solicitação afetada. O admin recebe 1 notificação consolidada do evento
// inteiro via notificarTodosGestores() (1 chamada só, não por corrida).
async function reportarPaneMecanicaGeral() {
  if (!confirm('Confirma o registro de pane mecânica? A gestão e os solicitantes das corridas de hoje ainda não realizadas serão avisados agora.')) return;

  const nomeCondutor = usuarioAtual?.nome || usuarioAtual?.email || 'Condutor';
  const agora = new Date();
  const limiar = new Date(agora.getTime() + 60000); // T + 1 minuto
  const hojeISO = new Date().toISOString().split('T')[0];

  try {
    const afetadas = (cachePainelDiaHoje || []).filter(s => {
      const horaSaida = s.hora_saida ? new Date(`${hojeISO}T${s.hora_saida.substring(0, 5)}:00`) : null;
      const horaRetorno = s.hora_retorno ? new Date(`${hojeISO}T${s.hora_retorno.substring(0, 5)}:00`) : null;
      return (horaSaida && horaSaida >= limiar) || (horaRetorno && horaRetorno >= limiar);
    });

    // Uma notificação por SOLICITAÇÃO afetada (não uma por ida + uma por
    // volta) - ver comentário grande acima da função.
    await Promise.all(afetadas.map(s => {
      if (!s.email_solicitante) return Promise.resolve();
      return criarNotificacao({
        email_destinatario: s.email_solicitante,
        tipo: 'pane_mecanica',
        mensagem: `Sua viagem das ${formatarHoraBR(s.hora_saida)} pode atrasar: pane mecânica reportada pelo condutor.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante afetado:', e));
    }));

    // Única notificação consolidada pra gestão (1 chamada, não 1 por corrida).
    await notificarTodosGestores(
      `Pane mecânica reportada por ${nomeCondutor}.` + (afetadas.length ? ` ${afetadas.length} corrida(s) de hoje a partir de agora foram avisadas.` : ' Nenhuma corrida a partir de agora pra avisar hoje.'),
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
window.reportarPaneMecanicaGeral = reportarPaneMecanicaGeral;
