// ============================================================
// MARKCARRO - Página: Alertas / Notificações (Solicitante e Condutor)
// ============================================================
// PEDIDO DO USUÁRIO: "crie outra aba para notificações - carregar todas as
// notificações ali, mostrando as mais recentes primeiro" - antes só dava
// pra ver notificação abrindo o painelzinho do sino (#painel-notificacoes,
// ver toggleNotificacoes/carregarNotificacoes em pages/login.js), que é
// pequeno e fecha fácil. Esta tela mostra a lista INTEIRA, sem o limite
// visual do painel, reaproveitando buscarNotificacoes() (api.js) - que já
// ordena por data_hora decrescente (mais recente primeiro).

async function abrirTelaNotificacoes() {
  esconderTodasTelas();
  document.getElementById('tela-notificacoes').classList.remove('hidden');
  marcarAbaAtiva('notificacoes');
  await carregarTelaNotificacoes();
}

async function carregarTelaNotificacoes() {
  if (!usuarioAtual) return;
  const lista = document.getElementById('lista-tela-notificacoes');
  if (lista) lista.innerHTML = '<div class="text-center text-slate-500 py-8 text-sm">Carregando...</div>';

  try {
    const notifs = await buscarNotificacoes(usuarioAtual.email);
    renderizarTelaNotificacoes(notifs || []);
  } catch (e) {
    console.error('Erro ao carregar tela de notificações:', e);
    if (lista) lista.innerHTML = '<div class="text-center text-red-500 py-8 text-sm">Erro ao carregar. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarTelaNotificacoes()">Tentar de novo</button></div>';
  }
}

function renderizarTelaNotificacoes(notifs) {
  const lista = document.getElementById('lista-tela-notificacoes');
  const btnMarcarTodas = document.getElementById('btn-marcar-todas-lidas-tela');
  if (!lista) return;

  if (!notifs.length) {
    lista.innerHTML = `
      <div class="text-center py-12 px-4">
        <div class="text-4xl mb-2">🔔</div>
        <p class="text-slate-500 text-sm">Nenhuma notificação ainda.</p>
      </div>
    `;
    btnMarcarTodas?.classList.add('hidden');
    return;
  }

  lista.innerHTML = notifs.map(n => `
    <div class="card p-3 mb-2 cursor-pointer transition-colors ${n.lida ? '' : 'border-l-4 border-l-mc-azul bg-blue-50/40'}" onclick="marcarNotificacaoLidaTelaUI('${n.id}')">
      <p class="text-sm text-slate-900 ${n.lida ? '' : 'font-semibold'}">${n.mensagem}</p>
      <p class="text-xs text-slate-500 mt-1">${formatarDataHoraBR(n.data_hora)}</p>
    </div>
  `).join('');

  if (notifs.some(n => !n.lida)) btnMarcarTodas?.classList.remove('hidden');
  else btnMarcarTodas?.classList.add('hidden');
}

async function marcarNotificacaoLidaTelaUI(id) {
  try {
    await marcarNotificacaoLida(id);
    atualizarContadorNotificacoes();
    carregarTelaNotificacoes();
  } catch (e) {
    console.warn('Erro ao marcar notificação como lida:', e);
  }
}

async function marcarTodasLidasTela() {
  if (!usuarioAtual) return;
  try {
    const notifs = await buscarNotificacoes(usuarioAtual.email);
    for (const n of notifs) {
      if (!n.lida) await marcarNotificacaoLida(n.id);
    }
    atualizarContadorNotificacoes();
    carregarTelaNotificacoes();
    Components.Toast.success('Todas marcadas como lidas');
  } catch (e) {
    Components.Toast.error('Erro ao marcar todas');
  }
}

// Expor globalmente
window.abrirTelaNotificacoes = abrirTelaNotificacoes;
window.carregarTelaNotificacoes = carregarTelaNotificacoes;
window.marcarNotificacaoLidaTelaUI = marcarNotificacaoLidaTelaUI;
window.marcarTodasLidasTela = marcarTodasLidasTela;
