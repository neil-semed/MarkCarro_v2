// ============================================================
// MARKCARRO - Página: Avisos (Admin envia / todos os perfis recebem)
// ============================================================
// Cada aviso vira uma linha em "notificacoes" (tipo 'aviso_admin') por
// destinatário, todas com o mesmo aviso_id. Janela sobre a tela: uma vez
// por sessão para avisos não lidos com sobre_tela = true, até "Entendi".

let _avisosUsuarios = [];
let _avisosSelecionados = new Set();

function escaparHtmlAviso(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function _avisoPerfilRotulo(u) {
  const t = String(u.tipo || '').toLowerCase();
  if (t === 'admin') return 'Admin';
  if (t === 'condutor') return String(u.categoria || '').toLowerCase() === 'motoboy' ? 'Motoboy' : 'Condutor';
  return 'Solicitante';
}

async function carregarAvisos() {
  try {
    const usuarios = await listarUsuarios();
    _avisosUsuarios = (usuarios || []).filter(u => u.ativo !== false && u.email);
    const unidades = [...new Set(_avisosUsuarios.map(u => u.unidade).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const sel = document.getElementById('avisos-filtro-unidade');
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todas</option>' + unidades.map(n => `<option value="${escaparHtmlAviso(n)}">${escaparHtmlAviso(n)}</option>`).join('');
    sel.value = unidades.includes(atual) ? atual : '';
    renderizarDestinatariosAviso();
  } catch (e) {
    console.error('Erro ao carregar destinatários:', e);
    document.getElementById('avisos-lista-dest').innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Erro ao carregar destinatários.</div>';
  }
  aplicarModoConsultaTela('avisos', ['avisos-form-wrap']);
  carregarAvisosEnviados();
}

function _avisosFiltrados() {
  const pub = document.getElementById('avisos-filtro-publico').value;
  const uni = document.getElementById('avisos-filtro-unidade').value;
  const q = document.getElementById('avisos-busca').value.trim().toLowerCase();
  return _avisosUsuarios.filter(u => {
    const r = _avisoPerfilRotulo(u).toLowerCase();
    if (pub && r !== pub) return false;
    if (uni && u.unidade !== uni) return false;
    if (q && !`${u.nome || ''} ${u.email || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderizarDestinatariosAviso() {
  const lista = _avisosFiltrados();
  const box = document.getElementById('avisos-lista-dest');
  box.innerHTML = lista.length ? lista.map(u => {
    const sub = [_avisoPerfilRotulo(u), u.unidade].filter(Boolean).join(' · ');
    const em = escaparHtmlAviso(u.email);
    return `<label class="avisos-dest"><input type="checkbox" data-email="${em}" ${_avisosSelecionados.has(u.email) ? 'checked' : ''} onchange="alternarDestinatarioAviso(this)"><span><b>${escaparHtmlAviso(u.nome || u.email)}</b><small>${escaparHtmlAviso(sub)}</small></span></label>`;
  }).join('') : '<div class="p-4 text-center text-slate-500 text-sm">Nenhum usuário encontrado</div>';
  atualizarContagemAviso();
}

function alternarDestinatarioAviso(cb) {
  if (cb.checked) _avisosSelecionados.add(cb.dataset.email); else _avisosSelecionados.delete(cb.dataset.email);
  atualizarContagemAviso();
}

function atualizarContagemAviso() {
  document.getElementById('avisos-contagem').textContent = `${_avisosSelecionados.size} selecionado(s)`;
}

function selecionarTodosAviso() {
  _avisosFiltrados().forEach(u => _avisosSelecionados.add(u.email));
  renderizarDestinatariosAviso();
}

function limparSelecaoAviso() {
  _avisosSelecionados.clear();
  document.getElementById('avisos-filtro-publico').value = '';
  document.getElementById('avisos-filtro-unidade').value = '';
  document.getElementById('avisos-busca').value = '';
  renderizarDestinatariosAviso();
}

async function enviarAviso() {
  const titulo = document.getElementById('aviso-titulo').value.trim();
  const mensagem = document.getElementById('aviso-mensagem').value.trim();
  const prioridade = document.getElementById('aviso-prioridade').value === 'importante' ? 'importante' : 'normal';
  const sobreTela = document.getElementById('aviso-sobre-tela').checked;
  if (!titulo) return Components.Toast.warning('Informe o título do aviso');
  if (!mensagem) return Components.Toast.warning('Escreva a mensagem do aviso');
  if (!_avisosSelecionados.size) return Components.Toast.warning('Selecione ao menos um destinatário');
  if (!window.confirm(`Enviar este aviso para ${_avisosSelecionados.size} usuário(s)?`)) return;

  const btn = document.getElementById('btn-enviar-aviso');
  btn.disabled = true;
  try {
    const avisoId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : null;
    const linhas = [..._avisosSelecionados].map(email => ({
      email_destinatario: String(email).trim().toLowerCase(), tipo: 'aviso_admin', titulo, mensagem, prioridade,
      sobre_tela: sobreTela, enviado_por: usuarioAtual.email, aviso_id: avisoId, lida: false
    }));
    for (let i = 0; i < linhas.length; i += 500) {
      const { error } = await _sb.from('notificacoes').insert(linhas.slice(i, i + 500));
      if (error) throw error;
    }
    Components.Toast.success('Aviso enviado');
    document.getElementById('aviso-titulo').value = '';
    document.getElementById('aviso-mensagem').value = '';
    document.getElementById('aviso-prioridade').value = 'normal';
    document.getElementById('aviso-sobre-tela').checked = true;
    _avisosSelecionados.clear();
    renderizarDestinatariosAviso();
    carregarAvisosEnviados();
  } catch (e) {
    console.error('Erro ao enviar aviso:', e);
    Components.Toast.error('Erro ao enviar aviso. Verifique se o SQL de avisos foi executado no Supabase.');
  } finally {
    btn.disabled = false;
  }
}

async function carregarAvisosEnviados() {
  const tb = document.getElementById('tb-avisos-enviados');
  try {
    const { data, error } = await _sb.from('notificacoes')
      .select('id,aviso_id,titulo,prioridade,data_hora,lida,email_destinatario')
      .eq('tipo', 'aviso_admin').order('data_hora', { ascending: false }).limit(5000);
    if (error) throw error;
    if (!data || !data.length) { tb.innerHTML = '<tr><td colspan="7" class="text-center text-slate-500 py-6">Nenhum aviso enviado</td></tr>'; return; }
    const porEmail = new Map(_avisosUsuarios.map(u => [String(u.email).toLowerCase(), u]));
    tb.innerHTML = data.map(r => {
      const u = porEmail.get(String(r.email_destinatario || '').toLowerCase());
      const imp = r.prioridade === 'importante';
      return `
      <tr>
        <td class="table-td whitespace-nowrap">${formatarDataHoraBR(r.data_hora)}</td>
        <td class="table-td">${escaparHtmlAviso(r.titulo || '-')}</td>
        <td class="table-td"><span class="aviso-badge ${imp ? 'imp' : 'norm'}">${imp ? 'IMPORTANTE' : 'NORMAL'}</span></td>
        <td class="table-td">${escaparHtmlAviso(u ? (u.nome || u.email) : r.email_destinatario)}</td>
        <td class="table-td">${escaparHtmlAviso(u?.setor || '-')}</td>
        <td class="table-td">${escaparHtmlAviso(u ? _avisoPerfilRotulo(u) : '-')}</td>
        <td class="table-td whitespace-nowrap">${r.lida ? 'Lido' : 'Não lido'}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    console.error('Erro ao carregar avisos enviados:', e);
    tb.innerHTML = '<tr><td colspan="7" class="text-center text-red-500 py-6">Erro ao carregar avisos enviados.</td></tr>';
  }
}

// ---------- Janela sobre a tela (todos os perfis) ----------
const _avisosVistosSessao = new Set();
let _avisoAbertoId = null;

function _avisosVistosLer() {
  try { JSON.parse(sessionStorage.getItem('mc_avisos_vistos') || '[]').forEach(i => _avisosVistosSessao.add(i)); } catch (e) {}
}
function _avisosVistosGravar() {
  try { sessionStorage.setItem('mc_avisos_vistos', JSON.stringify([..._avisosVistosSessao])); } catch (e) {}
}

async function verificarAvisoSobreTela() {
  if (!usuarioAtual || _avisoAbertoId) return;
  try {
    _avisosVistosLer();
    const notifs = await buscarNotificacoes(usuarioAtual.email);
    const n = (notifs || []).slice().reverse().find(x => x.tipo === 'aviso_admin' && !x.lida && x.sobre_tela && !_avisosVistosSessao.has(x.id));
    if (!n) return;
    _avisoAbertoId = n.id;
    _avisosVistosSessao.add(n.id);
    _avisosVistosGravar();
    const imp = n.prioridade === 'importante';
    const badge = document.getElementById('aviso-overlay-badge');
    badge.textContent = imp ? 'AVISO IMPORTANTE' : 'AVISO ADMINISTRATIVO';
    badge.className = 'aviso-badge ' + (imp ? 'imp' : 'norm');
    document.getElementById('aviso-overlay-titulo').textContent = n.titulo || 'Aviso';
    document.getElementById('aviso-overlay-mensagem').textContent = n.mensagem || '';
    document.getElementById('aviso-overlay').style.display = 'flex';
  } catch (e) {
    console.warn('Erro ao verificar aviso:', e);
  }
}

async function fecharAvisoSobreTela() {
  const id = _avisoAbertoId;
  document.getElementById('aviso-overlay').style.display = 'none';
  _avisoAbertoId = null;
  if (id) {
    try { await marcarNotificacaoLida(id); } catch (e) { console.warn('Erro ao marcar aviso como lido:', e); }
    if (typeof atualizarContadorNotificacoes === 'function') atualizarContadorNotificacoes();
  }
  verificarAvisoSobreTela();
}

window.carregarAvisos = carregarAvisos;
window.renderizarDestinatariosAviso = renderizarDestinatariosAviso;
window.alternarDestinatarioAviso = alternarDestinatarioAviso;
window.selecionarTodosAviso = selecionarTodosAviso;
window.limparSelecaoAviso = limparSelecaoAviso;
window.enviarAviso = enviarAviso;
window.verificarAvisoSobreTela = verificarAvisoSobreTela;
window.fecharAvisoSobreTela = fecharAvisoSobreTela;
window.escaparHtmlAviso = escaparHtmlAviso;
