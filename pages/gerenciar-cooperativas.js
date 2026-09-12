// ============================================================
// MARKCARRO - Página: Gerenciar Cooperativas
// ============================================================
// Cadastro de Cooperativa (nome, e-mail, telefone) - usada no dropdown
// "Cooperativa" da tela Gerenciar Condutores, pra vincular cada
// condutor/motorista à cooperativa dele. Estrutura igual à tela de
// Gerenciar Unidades (mesmo padrão de formulário + tabela + Editar/
// Bloquear), só com os campos da Cooperativa.

let cacheCooperativasGerenciar = [];

async function carregarGerenciarCooperativas() {
  const tbody = document.getElementById('tb-cooperativas');
  Components.Loading.show(tbody);
  try {
    const cooperativas = await listarTodasCooperativas();
    cacheCooperativasGerenciar = cooperativas || [];
    renderizarTabelaCooperativas(cacheCooperativasGerenciar);
  } catch (e) {
    // Antes, um erro aqui (ex: a tabela "cooperativas" ainda não criada no
    // Supabase - rode supabase_criar_cooperativas.sql - ou RLS bloqueando)
    // só mostrava um Toast e deixava a tabela travada no spinner de
    // "Carregando..." pra sempre, já que nada reescrevia o conteúdo do
    // tbody depois disso.
    console.error('Erro ao carregar cooperativas:', e);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-8">Erro ao carregar cooperativas.<br><span class="text-xs text-slate-500">${e.message || ''}</span><br><button class="btn-outline text-xs py-1.5 px-2.5 mt-2" onclick="carregarGerenciarCooperativas()">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar cooperativas');
  }
}

function renderizarTabelaCooperativas(cooperativas) {
  const tbody = document.getElementById('tb-cooperativas');
  if (!cooperativas.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 py-8">Nenhuma cooperativa cadastrada</td></tr>';
    return;
  }

  tbody.innerHTML = cooperativas.map(c => `
    <tr>
      <td class="table-td">${c.nome}</td>
      <td class="table-td">${c.email || ''}</td>
      <td class="table-td">${c.telefone || ''}</td>
      <td class="table-td"><span class="badge ${c.ativo ? 'badge-confirmada' : 'badge-cancelada'}">${c.ativo ? 'Ativa' : 'Bloqueada'}</span></td>
      <td class="table-td">
        <div class="flex gap-2">
          <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarCooperativa(${c.id})">Editar</button>
          <button class="${c.ativo ? 'btn-danger' : 'btn-success'} text-xs py-1.5 px-2.5" onclick="alternarAtivoCooperativa(${c.id}, ${!c.ativo})">${c.ativo ? 'Bloquear' : 'Ativar'}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function limparFormCooperativa() {
  document.getElementById('form-cooperativa').reset();
  document.getElementById('cooperativa-id-edicao').value = '';
  document.getElementById('titulo-form-cooperativa').textContent = 'Nova Cooperativa';
  document.getElementById('btn-cancelar-edicao-cooperativa').classList.add('hidden');
}

function editarCooperativa(id) {
  const c = cacheCooperativasGerenciar.find(x => String(x.id) === String(id));
  if (!c) return;

  document.getElementById('cooperativa-id-edicao').value = c.id;
  document.getElementById('cooperativa-nome').value = c.nome;
  document.getElementById('cooperativa-email').value = c.email || '';
  document.getElementById('cooperativa-telefone').value = c.telefone || '';

  document.getElementById('titulo-form-cooperativa').textContent = 'Editar Cooperativa';
  document.getElementById('btn-cancelar-edicao-cooperativa').classList.remove('hidden');
  document.getElementById('form-cooperativa').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function salvarCooperativa() {
  const idEdicao = document.getElementById('cooperativa-id-edicao').value;
  const dados = {
    nome: document.getElementById('cooperativa-nome').value.trim(),
    email: document.getElementById('cooperativa-email').value.trim() || null,
    telefone: document.getElementById('cooperativa-telefone').value.trim() || null
  };

  if (!dados.nome) return Components.Toast.error('Informe o nome da Cooperativa');

  try {
    if (idEdicao) {
      await atualizarCooperativa(idEdicao, dados);
      Components.Toast.success('Cooperativa atualizada!');
    } else {
      await criarCooperativa(dados);
      Components.Toast.success('Cooperativa cadastrada!');
    }
    limparFormCooperativa();
    carregarGerenciarCooperativas();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

async function alternarAtivoCooperativa(id, ativar) {
  try {
    await atualizarCooperativa(id, { ativo: ativar });
    Components.Toast.success(ativar ? 'Cooperativa ativada!' : 'Cooperativa bloqueada!');
    carregarGerenciarCooperativas();
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

// Expor globalmente
window.carregarGerenciarCooperativas = carregarGerenciarCooperativas;
window.salvarCooperativa = salvarCooperativa;
window.limparFormCooperativa = limparFormCooperativa;
window.editarCooperativa = editarCooperativa;
window.alternarAtivoCooperativa = alternarAtivoCooperativa;
