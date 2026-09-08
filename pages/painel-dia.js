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
      <div class="card p-4 mb-3 animate-fade-in">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-baseline gap-2">
            <span class="text-lg font-bold text-mc-azul">${formatarHoraBR(s.hora_saida)}</span>
            <span class="text-slate-400 text-sm">→ ${formatarHoraBR(s.hora_retorno)}</span>
          </div>
          <span class="badge ${classeStatus(s.status)} shrink-0">${s.status}</span>
        </div>
        <p class="text-slate-900 font-medium mb-1 break-words">${s.origem} <span class="text-slate-400">→</span> ${s.destino}</p>
        <p class="text-sm text-slate-500 mb-2">👤 ${solicitante} · <span class="font-medium">${papel}</span></p>
        ${s.justificativa ? `<p class="text-xs text-slate-500 mb-3">${s.justificativa}</p>` : ''}
        <div class="flex gap-2">
          <a href="tel:${(s.telefone_ext || '').replace(/\D/g,'')}" class="${s.telefone_ext ? '' : 'hidden'} btn-outline text-xs py-2 px-3 flex-1 text-center">📞 Ligar</a>
          <button onclick="abrirRegistroKm()" class="btn-primary text-xs py-2 px-3 flex-1">Registrar KM</button>
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

// Expor globalmente
window.carregarPainelDoDia = carregarPainelDoDia;
window.puxarParaAtualizarPainelDia = puxarParaAtualizarPainelDia;
