// ============================================================
// MARKCARRO - Página: Gerenciar Perfis de Acesso (Admin)
// ============================================================
// Papéis customizados (nome, vínculo com Unidade/Setor, quais telas o
// perfil pode ver, bloqueado/ativo) - tabela "perfis_acesso" (ver
// supabase_criar_perfis_acesso.sql). Mesmo padrão de tela das outras
// telas "Gerenciar *" (formulário + tabela + Editar/Bloquear).

const TELAS_DISPONIVEIS_PERFIL = [
  { id: 'gestor', label: 'Dashboard' },
  { id: 'gerenciamento-solicitacoes', label: 'Gerenciar Solicitações' },
  { id: 'agenda', label: 'Agenda de Corridas' },
  { id: 'nova-solicitacao', label: 'Nova Solicitação' },
  { id: 'gerenciar-condutores', label: 'Condutores' },
  { id: 'gerenciar-km', label: 'Gerenciar Km' },
  { id: 'gerenciar-usuarios', label: 'Usuários' },
  { id: 'gerenciar-unidades', label: 'Unidades' },
  { id: 'gerenciar-cooperativas', label: 'Cooperativas' },
  { id: 'gerenciar-perfis-acesso', label: 'Perfis de Acesso' },
  { id: 'minhas-solicitacoes', label: 'Minhas Solicitações (Solicitante)' },
  { id: 'painel-dia', label: 'Painel do Dia (Condutor)' },
  { id: 'agenda-condutor', label: 'Agenda do Condutor' },
  { id: 'registro-km', label: 'Registro Km (Condutor)' }
];

let cachePerfisAcesso = [];

async function carregarGerenciarPerfisAcesso() {
  preencherCheckboxesTelasPerfil();
  const tbody = document.getElementById('tb-perfis-acesso');
  Components.Loading.show(tbody);
  try {
    const perfis = await listarPerfisAcesso();
    cachePerfisAcesso = perfis || [];
    renderizarTabelaPerfisAcesso(cachePerfisAcesso);
  } catch (e) {
    // Tabela "perfis_acesso" ainda não criada no Supabase (rode
    // supabase_criar_perfis_acesso.sql) ou RLS bloqueando - sem isso, a
    // tabela ficava travada no spinner pra sempre.
    console.error('Erro ao carregar perfis de acesso:', e);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-8">Erro ao carregar perfis de acesso.<br><span class="text-xs text-slate-500">${e.message || ''}</span><br><button class="btn-outline text-xs py-1.5 px-2.5 mt-2" onclick="carregarGerenciarPerfisAcesso()">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar perfis de acesso');
  }
}

function preencherCheckboxesTelasPerfil() {
  const container = document.getElementById('perfil-acesso-telas');
  if (!container || container.dataset.preenchido) return;
  container.innerHTML = TELAS_DISPONIVEIS_PERFIL.map(t => `
    <label class="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" class="w-4 h-4 accent-mc-azul" value="${t.id}" data-tela-perfil>
      ${t.label}
    </label>
  `).join('');
  container.dataset.preenchido = '1';
}

function renderizarTabelaPerfisAcesso(perfis) {
  const tbody = document.getElementById('tb-perfis-acesso');
  if (!perfis.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 py-8">Nenhum perfil de acesso cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = perfis.map(p => {
    const telas = Array.isArray(p.telas_permitidas) ? p.telas_permitidas : [];
    const labelsTelas = telas
      .map(id => TELAS_DISPONIVEIS_PERFIL.find(t => t.id === id)?.label || id)
      .join(', ') || '—';
    const vinculo = [p.unidade, p.setor].filter(Boolean).join(' / ') || '—';
    return `
    <tr>
      <td class="table-td">${p.nome}</td>
      <td class="table-td">${vinculo}</td>
      <td class="table-td text-xs">${labelsTelas}</td>
      <td class="table-td"><span class="badge ${p.bloqueado ? 'badge-cancelada' : 'badge-confirmada'}">${p.bloqueado ? 'Bloqueado' : 'Ativo'}</span></td>
      <td class="table-td">
        <div class="flex gap-2">
          <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarPerfilAcesso('${p.id}')">Editar</button>
          <button class="${p.bloqueado ? 'btn-success' : 'btn-danger'} text-xs py-1.5 px-2.5" onclick="alternarBloqueioPerfilAcesso('${p.id}', ${!p.bloqueado})">${p.bloqueado ? 'Desbloquear' : 'Bloquear'}</button>
          <button class="btn-danger text-xs py-1.5 px-2.5" onclick="excluirPerfilAcessoUI('${p.id}')">Excluir</button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

function limparFormPerfilAcesso() {
  document.getElementById('form-perfil-acesso').reset();
  document.getElementById('perfil-acesso-id-edicao').value = '';
  document.getElementById('titulo-form-perfil-acesso').textContent = 'Novo Perfil de Acesso';
  document.getElementById('btn-cancelar-edicao-perfil-acesso').classList.add('hidden');
  document.querySelectorAll('#perfil-acesso-telas input[data-tela-perfil]').forEach(cb => cb.checked = false);
}

function editarPerfilAcesso(id) {
  const p = cachePerfisAcesso.find(x => String(x.id) === String(id));
  if (!p) return;

  document.getElementById('perfil-acesso-id-edicao').value = p.id;
  document.getElementById('perfil-acesso-nome').value = p.nome || '';
  document.getElementById('perfil-acesso-unidade').value = p.unidade || '';
  document.getElementById('perfil-acesso-setor').value = p.setor || '';

  const telas = Array.isArray(p.telas_permitidas) ? p.telas_permitidas : [];
  document.querySelectorAll('#perfil-acesso-telas input[data-tela-perfil]').forEach(cb => {
    cb.checked = telas.includes(cb.value);
  });

  document.getElementById('titulo-form-perfil-acesso').textContent = 'Editar Perfil de Acesso';
  document.getElementById('btn-cancelar-edicao-perfil-acesso').classList.remove('hidden');
  document.getElementById('form-perfil-acesso').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function salvarPerfilAcesso() {
  const idEdicao = document.getElementById('perfil-acesso-id-edicao').value;
  const telasMarcadas = Array.from(document.querySelectorAll('#perfil-acesso-telas input[data-tela-perfil]:checked')).map(cb => cb.value);

  const dados = {
    nome: document.getElementById('perfil-acesso-nome').value.trim(),
    unidade: document.getElementById('perfil-acesso-unidade').value.trim() || null,
    setor: document.getElementById('perfil-acesso-setor').value.trim() || null,
    telas_permitidas: telasMarcadas
  };

  if (!dados.nome) return Components.Toast.error('Informe o nome do Perfil de Acesso');

  try {
    if (idEdicao) {
      await atualizarPerfilAcesso(idEdicao, dados);
      Components.Toast.success('Perfil de acesso atualizado!');
    } else {
      await criarPerfilAcesso(dados);
      Components.Toast.success('Perfil de acesso criado!');
    }
    limparFormPerfilAcesso();
    carregarGerenciarPerfisAcesso();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

async function alternarBloqueioPerfilAcesso(id, bloquear) {
  try {
    await atualizarPerfilAcesso(id, { bloqueado: bloquear });
    Components.Toast.success(bloquear ? 'Perfil bloqueado!' : 'Perfil desbloqueado!');
    carregarGerenciarPerfisAcesso();
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

async function excluirPerfilAcessoUI(id) {
  if (!confirm('Excluir este perfil de acesso? Essa ação não pode ser desfeita.')) return;
  try {
    await excluirPerfilAcesso(id);
    Components.Toast.success('Perfil de acesso excluído.');
    carregarGerenciarPerfisAcesso();
  } catch (e) {
    Components.Toast.error('Erro ao excluir');
  }
}

// Expor globalmente
window.carregarGerenciarPerfisAcesso = carregarGerenciarPerfisAcesso;
window.salvarPerfilAcesso = salvarPerfilAcesso;
window.limparFormPerfilAcesso = limparFormPerfilAcesso;
window.editarPerfilAcesso = editarPerfilAcesso;
window.alternarBloqueioPerfilAcesso = alternarBloqueioPerfilAcesso;
window.excluirPerfilAcessoUI = excluirPerfilAcessoUI;
