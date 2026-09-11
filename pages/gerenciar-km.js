// ============================================================
// MARKCARRO - Página: Gerenciar KM (Gestor)
// ============================================================

async function carregarGerenciarKm() {
  preencherSelectCondutoresKm();
  await carregarRegistrosKmGestor();
}

function preencherSelectCondutoresKm() {
  const select = document.getElementById('km-gestor-condutor');
  if (!select) return;
  select.innerHTML = '<option value="">Selecione...</option>';
  cacheCondutores.forEach(c => {
    select.innerHTML += `<option value="${c.email}">${c.nome} (${c.capacidade || ''})</option>`;
  });
}

async function carregarRegistrosKmGestor() {
  Components.Loading.show(document.getElementById('tb-registros-km-gestor'));
  try {
    const dados = await listarTodosKM();
    cacheRegistrosKmGestor = dados || [];
    renderizarRegistrosKmGestor(cacheRegistrosKmGestor);
  } catch (e) {
    Components.Toast.error('Erro ao carregar KM');
  }
}

// Cache dos registros carregados, usado por editarKmGestor/excluirKmGestor
let cacheRegistrosKmGestor = [];

function renderizarRegistrosKmGestor(dados) {
  const tbody = document.getElementById('tb-registros-km-gestor');
  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-slate-500">Nenhum registro</td></tr>';
    return;
  }

  tbody.innerHTML = dados.map(r => {
    const condutor = cacheCondutores.find(c => c.email === r.email_condutor);
    return `
    <tr>
      <td>${formatarDataBR(r.data)}</td>
      <td>${condutor?.nome || r.email_condutor}</td>
      <td>${r.km_inicial}</td>
      <td>${r.km_final || ''}</td>
      <td>${r.km_final ? r.km_final - r.km_inicial : ''}</td>
      <td>${r.ajustado ? 'Sim' : 'Não'}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editarKmGestor('${r.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="excluirKmGestor('${r.id}')">Excluir</button>
      </td>
    </tr>
    `;
  }).join('');
}

function limparFormKmGestor() {
  document.getElementById('form-km-gestor').reset();
  document.getElementById('km-gestor-id-edicao').value = '';
  document.getElementById('titulo-form-km-gestor').textContent = 'Lançar KM';
  document.getElementById('btn-cancelar-edicao-km-gestor').classList.add('d-none');
}

function editarKmGestor(id) {
  const r = cacheRegistrosKmGestor.find(x => String(x.id) === String(id));
  if (!r) return;

  document.getElementById('km-gestor-id-edicao').value = r.id;
  document.getElementById('km-gestor-condutor').value = r.email_condutor;
  document.getElementById('km-gestor-data').value = r.data;
  document.getElementById('km-gestor-inicial').value = r.km_inicial;
  document.getElementById('km-gestor-final').value = r.km_final || '';

  document.getElementById('titulo-form-km-gestor').textContent = 'Editar KM';
  document.getElementById('btn-cancelar-edicao-km-gestor').classList.remove('d-none');
  document.getElementById('form-km-gestor').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function excluirKmGestor(id) {
  if (!confirm('Tem certeza que deseja excluir este registro de KM?')) return;
  try {
    await excluirKM(id);
    Components.Toast.success('Registro excluído!');
    if (document.getElementById('km-gestor-id-edicao').value === String(id)) {
      limparFormKmGestor();
    }
    carregarRegistrosKmGestor();
  } catch (e) {
    Components.Toast.error('Erro ao excluir: ' + e.message);
  }
}

async function salvarKmGestor() {
  const idEdicao = document.getElementById('km-gestor-id-edicao').value;
  const email = document.getElementById('km-gestor-condutor').value;
  const data = document.getElementById('km-gestor-data').value;
  const inicial = parseInt(document.getElementById('km-gestor-inicial').value);
  const final = document.getElementById('km-gestor-final').value;

  if (!email || !data || !inicial) return Components.Toast.error('Preencha todos os campos obrigatórios');

  try {
    const kmFinal = final ? parseInt(final) : null;
    const dados = {
      email_condutor: email,
      data: data,
      km_inicial: inicial,
      km_final: kmFinal,
      ajustado: true
    };

    if (idEdicao) {
      await atualizarKM(idEdicao, dados);
      Components.Toast.success('Registro atualizado!');
    } else {
      await registrarKM(dados);
      Components.Toast.success('Registro salvo!');
    }

    limparFormKmGestor();
    carregarRegistrosKmGestor();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

// Expor globalmente
window.carregarGerenciarKm = carregarGerenciarKm;
window.salvarKmGestor = salvarKmGestor;
window.carregarRegistrosKmGestor = carregarRegistrosKmGestor;
window.editarKmGestor = editarKmGestor;
window.excluirKmGestor = excluirKmGestor;
window.limparFormKmGestor = limparFormKmGestor;