// ============================================================
// MARKCARRO - Página: Gerenciar Unidades
// ============================================================
// Cadastro próprio de Unidade (nome, endereço, telefone, e-mail) - tabela
// nova e independente do sistema de Unidade/Setor em tabelas_apoio (que
// continua controlando os dropdowns de Cadastro/Nova Solicitação/
// Gerenciar Usuários exatamente como antes).

let cacheUnidadesGerenciar = [];

async function carregarGerenciarUnidades() {
  Components.Loading.show(document.getElementById('tb-unidades'));
  try {
    const unidades = await listarTodasUnidades();
    cacheUnidadesGerenciar = unidades || [];
    renderizarTabelaUnidades(cacheUnidadesGerenciar);
  } catch (e) {
    Components.Toast.error('Erro ao carregar unidades');
  }
}

function renderizarTabelaUnidades(unidades) {
  const tbody = document.getElementById('tb-unidades');
  if (!unidades.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-slate-500 py-8">Nenhuma unidade cadastrada</td></tr>';
    return;
  }

  tbody.innerHTML = unidades.map(u => `
    <tr>
      <td class="table-td">${u.nome}</td>
      <td class="table-td">${u.endereco || ''}</td>
      <td class="table-td">${u.telefone || ''}</td>
      <td class="table-td">${u.email || ''}</td>
      <td class="table-td"><span class="badge ${u.ativo ? 'badge-confirmada' : 'badge-cancelada'}">${u.ativo ? 'Ativa' : 'Inativa'}</span></td>
      <td class="table-td">
        <div class="flex gap-2">
          <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarUnidade(${u.id})">Editar</button>
          <button class="${u.ativo ? 'btn-danger' : 'btn-success'} text-xs py-1.5 px-2.5" onclick="alternarAtivoUnidade(${u.id}, ${!u.ativo})">${u.ativo ? 'Bloquear' : 'Ativar'}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function limparFormUnidade() {
  document.getElementById('form-unidade').reset();
  document.getElementById('unidade-id-edicao').value = '';
  document.getElementById('titulo-form-unidade').textContent = 'Nova Unidade';
  document.getElementById('btn-cancelar-edicao-unidade').classList.add('d-none');
}

function editarUnidade(id) {
  const u = cacheUnidadesGerenciar.find(x => String(x.id) === String(id));
  if (!u) return;

  document.getElementById('unidade-id-edicao').value = u.id;
  document.getElementById('unidade-nome').value = u.nome;
  document.getElementById('unidade-endereco').value = u.endereco || '';
  document.getElementById('unidade-telefone').value = u.telefone || '';
  document.getElementById('unidade-email').value = u.email || '';

  document.getElementById('titulo-form-unidade').textContent = 'Editar Unidade';
  document.getElementById('btn-cancelar-edicao-unidade').classList.remove('d-none');
  document.getElementById('form-unidade').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function salvarUnidade() {
  const idEdicao = document.getElementById('unidade-id-edicao').value;
  const dados = {
    nome: document.getElementById('unidade-nome').value.trim(),
    endereco: document.getElementById('unidade-endereco').value.trim() || null,
    telefone: document.getElementById('unidade-telefone').value.trim() || null,
    email: document.getElementById('unidade-email').value.trim() || null
  };

  if (!dados.nome) return Components.Toast.error('Informe o nome da Unidade');

  try {
    if (idEdicao) {
      await atualizarUnidade(idEdicao, dados);
      Components.Toast.success('Unidade atualizada!');
    } else {
      await criarUnidade(dados);
      Components.Toast.success('Unidade cadastrada!');
    }
    limparFormUnidade();
    carregarGerenciarUnidades();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

async function alternarAtivoUnidade(id, ativar) {
  try {
    await atualizarUnidade(id, { ativo: ativar });
    Components.Toast.success(ativar ? 'Unidade ativada!' : 'Unidade bloqueada!');
    carregarGerenciarUnidades();
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

// Expor globalmente
window.carregarGerenciarUnidades = carregarGerenciarUnidades;
window.salvarUnidade = salvarUnidade;
window.limparFormUnidade = limparFormUnidade;
window.editarUnidade = editarUnidade;
window.alternarAtivoUnidade = alternarAtivoUnidade;
