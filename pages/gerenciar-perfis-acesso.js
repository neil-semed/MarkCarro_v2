// ============================================================
// MARKCARRO - Página: Gerenciar Perfis de Acesso (Admin)
// ============================================================
// Papéis customizados (nome, vínculo com Unidade/Setor, quais telas o
// perfil pode ver, quais delas pode EDITAR, bloqueado/ativo) - tabela
// "perfis_acesso" (ver supabase_criar_perfis_acesso.sql +
// supabase_perfis_acesso_edicao_e_atribuicao.sql). Mesmo padrão de tela
// das outras telas "Gerenciar *" (formulário + tabela + Editar/Bloquear).
//
// PEDIDO DO USUÁRIO: "o admin poderá criar e atribuir menus conforme
// definir" - cada tela declara um "nivel" que decide como ela aparece
// no formulário:
//   'consulta' - só pode ser vista (Dashboard, Agenda de Corridas,
//                Relatórios não têm ação de editar nenhuma).
//   'editavel' - além de ver, o perfil pode ganhar "Pode editar" (as
//                telas "Gerenciar *"/"Gerenciar Solicitações", que têm
//                formulário de criar/editar e botões de excluir/
//                bloquear).
//   'acao'     - a tela É uma ação (Nova Solicitação) - incluir ou não,
//                sem meio-termo de "consulta".
//   'simples'  - telas do Condutor/Solicitante que aparecem aqui por
//                herança do cadastro original; mantidas como estavam
//                (só um checkbox de incluir, sem distinção).
// Esta lista só define COMO o formulário mostra cada tela - quem de
// fato aplica a restrição pro Admin logado é
// aplicarRestricaoPerfilAcessoAdmin() (pages/login.js) +
// usuarioPodeEditarTela()/aplicarModoConsultaTela() (app.js).
const TELAS_DISPONIVEIS_PERFIL = [
  { id: 'gestor', label: 'Dashboard', nivel: 'consulta' },
  { id: 'gerenciamento-solicitacoes', label: 'Gerenciar Solicitações', nivel: 'editavel' },
  { id: 'agenda', label: 'Agenda de Corridas', nivel: 'consulta' },
  { id: 'nova-solicitacao', label: 'Nova Solicitação', nivel: 'acao' },
  { id: 'gerenciar-condutores', label: 'Condutores', nivel: 'editavel' },
  { id: 'gerenciar-km', label: 'Gerenciar Km', nivel: 'editavel' },
  { id: 'gerenciar-usuarios', label: 'Usuários', nivel: 'editavel' },
  { id: 'gerenciar-unidades', label: 'Unidades', nivel: 'editavel' },
  { id: 'gerenciar-cooperativas', label: 'Cooperativas', nivel: 'editavel' },
  { id: 'gerenciar-perfis-acesso', label: 'Perfis de Acesso', nivel: 'editavel' },
  { id: 'relatorios', label: 'Relatórios', nivel: 'consulta' },
  { id: 'minhas-solicitacoes', label: 'Minhas Solicitações (Solicitante)', nivel: 'simples' },
  { id: 'painel-dia', label: 'Painel do Dia (Condutor)', nivel: 'simples' },
  { id: 'agenda-condutor', label: 'Agenda do Condutor', nivel: 'simples' },
  { id: 'registro-km', label: 'Registro Km (Condutor)', nivel: 'simples' }
];

let cachePerfisAcesso = [];

async function carregarGerenciarPerfisAcesso() {
  preencherCheckboxesTelasPerfil();
  preencherDropdownUnidadePerfilAcesso();
  aplicarModoConsultaTela('gerenciar-perfis-acesso', 'form-perfil-acesso');
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

// Unidade/Setor do formulário de Perfil de Acesso: antes eram dois campos
// de texto livre (pedido do usuário: "não tem dropdown de tabelas_apoio do
// supabase") - agora dois <select> encadeados vindos das tabelas de apoio
// já usadas em Gerenciar Usuários/Cadastro (cacheUnidades, carregado uma
// vez em carregarDropdownsApoio() em app.js, + listarSetoresPorUnidade()).
function preencherDropdownUnidadePerfilAcesso() {
  const sel = document.getElementById('perfil-acesso-unidade');
  if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">Selecione a Unidade...</option>' +
    (cacheUnidades || []).map(u => `<option value="${u}">${u}</option>`).join('');
  if (atual && (cacheUnidades || []).includes(atual)) sel.value = atual;
}

async function carregarSetoresPerfilAcesso(setorSelecionado) {
  const unidade = document.getElementById('perfil-acesso-unidade').value;
  const selSetor = document.getElementById('perfil-acesso-setor');
  if (!selSetor) return;

  if (!unidade) {
    selSetor.innerHTML = '<option value="">Selecione a Unidade primeiro</option>';
    return;
  }

  try {
    const dados = await listarSetoresPorUnidade(unidade);
    selSetor.innerHTML = '<option value="">Selecione o Setor...</option>' +
      (dados || []).map(s => `<option value="${s.setor}">${s.setor}</option>`).join('');
    if (setorSelecionado) selSetor.value = setorSelecionado;
  } catch (e) {
    console.error('Erro ao carregar setores:', e);
    selSetor.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

function preencherCheckboxesTelasPerfil() {
  const container = document.getElementById('perfil-acesso-telas');
  if (!container || container.dataset.preenchido) return;
  container.innerHTML = TELAS_DISPONIVEIS_PERFIL.map(t => {
    let direita = '';
    if (t.nivel === 'consulta') {
      direita = `<span class="tela-perm-badge-consulta">Consulta</span>`;
    } else if (t.nivel === 'acao') {
      direita = `<span class="tela-perm-badge-acao">Ação (sem consulta)</span>`;
    } else if (t.nivel === 'editavel') {
      direita = `
        <label class="tela-perm-editar">
          <input type="checkbox" class="w-4 h-4 accent-mc-azul" value="${t.id}" data-tela-editar disabled>
          Pode editar
        </label>`;
    }
    return `
      <div class="tela-perm-card" data-card-tela="${t.id}">
        <input type="checkbox" class="w-4 h-4 accent-mc-azul shrink-0" value="${t.id}" data-tela-perfil onchange="_alternarCardTelaPerfil('${t.id}', this.checked)">
        <span class="tela-perm-nome">${t.label}</span>
        ${direita}
      </div>`;
  }).join('');
  container.dataset.preenchido = '1';
}

// Reflete visualmente (fundo azulado + libera "Pode editar") o checkbox
// de incluir uma tela - chamada tanto pelo onchange do próprio checkbox
// quanto ao reabrir um perfil pra editar (editarPerfilAcesso, abaixo).
function _alternarCardTelaPerfil(telaId, incluida) {
  const card = document.querySelector(`#perfil-acesso-telas [data-card-tela="${telaId}"]`);
  card?.classList.toggle('marcada', incluida);
  const chkEditar = card?.querySelector('[data-tela-editar]');
  if (chkEditar) {
    chkEditar.disabled = !incluida;
    if (!incluida) chkEditar.checked = false;
  }
}

function renderizarTabelaPerfisAcesso(perfis) {
  const tbody = document.getElementById('tb-perfis-acesso');
  if (!perfis.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 py-8">Nenhum perfil de acesso cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = perfis.map(p => {
    const telas = Array.isArray(p.telas_permitidas) ? p.telas_permitidas : [];
    const edicao = Array.isArray(p.telas_edicao) ? p.telas_edicao : [];
    const labelsTelas = telas.map(id => {
      const t = TELAS_DISPONIVEIS_PERFIL.find(x => x.id === id);
      const label = t?.label || id;
      if (t?.nivel === 'editavel') {
        return edicao.includes(id)
          ? `${label}<span class="tag-nivel-editor">editor</span>`
          : `${label}<span class="tag-nivel-consulta">consulta</span>`;
      }
      return label;
    }).join(', ') || '—';
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
  document.querySelectorAll('#perfil-acesso-telas [data-tela-perfil]').forEach(cb => {
    cb.checked = false;
    _alternarCardTelaPerfil(cb.value, false);
  });
  // form.reset() volta a Unidade pra primeira opção, mas não esvazia
  // sozinho o Setor (mesmo caso já corrigido em limparFormUsuario()).
  const selSetor = document.getElementById('perfil-acesso-setor');
  if (selSetor) selSetor.innerHTML = '<option value="">Selecione a Unidade primeiro</option>';
}

async function editarPerfilAcesso(id) {
  if (!usuarioPodeEditarTela('gerenciar-perfis-acesso')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  const p = cachePerfisAcesso.find(x => String(x.id) === String(id));
  if (!p) return;

  document.getElementById('perfil-acesso-id-edicao').value = p.id;
  document.getElementById('perfil-acesso-nome').value = p.nome || '';
  preencherDropdownUnidadePerfilAcesso();
  document.getElementById('perfil-acesso-unidade').value = p.unidade || '';
  await carregarSetoresPerfilAcesso(p.setor || '');

  const telas = Array.isArray(p.telas_permitidas) ? p.telas_permitidas : [];
  const edicao = Array.isArray(p.telas_edicao) ? p.telas_edicao : [];
  document.querySelectorAll('#perfil-acesso-telas [data-tela-perfil]').forEach(cb => {
    const incluida = telas.includes(cb.value);
    cb.checked = incluida;
    _alternarCardTelaPerfil(cb.value, incluida);
  });
  document.querySelectorAll('#perfil-acesso-telas [data-tela-editar]').forEach(cb => {
    cb.checked = edicao.includes(cb.value);
  });

  document.getElementById('titulo-form-perfil-acesso').textContent = 'Editar Perfil de Acesso';
  document.getElementById('btn-cancelar-edicao-perfil-acesso').classList.remove('hidden');
  document.getElementById('form-perfil-acesso').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function salvarPerfilAcesso() {
  if (!usuarioPodeEditarTela('gerenciar-perfis-acesso')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');

  const idEdicao = document.getElementById('perfil-acesso-id-edicao').value;
  const telasMarcadas = Array.from(document.querySelectorAll('#perfil-acesso-telas [data-tela-perfil]:checked')).map(cb => cb.value);
  // "Pode editar" só conta pra quem também está com a tela incluída (o
  // próprio checkbox já vem desabilitado nesse caso, mas o filtro aqui
  // garante isso mesmo se o HTML for manipulado por fora).
  const telasEdicaoMarcadas = Array.from(document.querySelectorAll('#perfil-acesso-telas [data-tela-editar]:checked'))
    .map(cb => cb.value)
    .filter(id => telasMarcadas.includes(id));

  const dados = {
    nome: document.getElementById('perfil-acesso-nome').value.trim(),
    unidade: document.getElementById('perfil-acesso-unidade').value.trim() || null,
    setor: document.getElementById('perfil-acesso-setor').value.trim() || null,
    telas_permitidas: telasMarcadas,
    telas_edicao: telasEdicaoMarcadas
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
    // Recarrega a lista de perfis do formulário de Usuários Administrativos
    // (Gerenciar Usuários), se já tiver sido aberta nesta sessão - sem isso,
    // um perfil criado/renomeado agora só apareceria lá depois de trocar de
    // tela e voltar.
    if (typeof _preencherDropdownPerfisAcessoUsuarios === 'function') _preencherDropdownPerfisAcessoUsuarios();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

async function alternarBloqueioPerfilAcesso(id, bloquear) {
  if (!usuarioPodeEditarTela('gerenciar-perfis-acesso')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  try {
    await atualizarPerfilAcesso(id, { bloqueado: bloquear });
    Components.Toast.success(bloquear ? 'Perfil bloqueado!' : 'Perfil desbloqueado!');
    carregarGerenciarPerfisAcesso();
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

async function excluirPerfilAcessoUI(id) {
  if (!usuarioPodeEditarTela('gerenciar-perfis-acesso')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
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
window.carregarSetoresPerfilAcesso = carregarSetoresPerfilAcesso;
window._alternarCardTelaPerfil = _alternarCardTelaPerfil;
