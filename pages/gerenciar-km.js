// ============================================================
// MARKCARRO - Página: Gerenciar KM (Gestor)
// ============================================================

async function carregarGerenciarKm() {
  preencherSelectCondutoresKm();
  preencherFiltroCondutorKm();
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

// CORREÇÃO (item 5 do lote do admin): dropdown do filtro de Condutor,
// separado do <select> do formulário de lançamento (km-gestor-condutor) -
// mesma lista (cacheCondutores), só que com "Todos" em vez de "Selecione..."
// como primeira opção.
function preencherFiltroCondutorKm() {
  const select = document.getElementById('km-filtro-condutor');
  if (!select) return;
  const atual = select.value;
  select.innerHTML = '<option value="">Todos</option>' +
    cacheCondutores.map(c => `<option value="${c.email}">${c.nome} (${c.capacidade || ''})</option>`).join('');
  if (atual) select.value = atual;
}

// Mesmo princípio de _dentroDoPeriodo() (pages/gestor.js), aplicado aqui
// à data do registro de KM em vez da data da viagem.
function _dentroDoPeriodoKm(dataStr, dias) {
  if (dias === 0) return true;
  if (!dataStr) return false;
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const d = new Date(dataStr);
  const diffDias = (hoje - d) / (1000 * 60 * 60 * 24);
  return diffDias >= 0 && diffDias <= dias;
}

function aplicarFiltrosKmGestor() {
  const condutor = document.getElementById('km-filtro-condutor')?.value || '';
  const ajustado = document.getElementById('km-filtro-ajustado')?.value || '';
  const dias = Number(document.getElementById('km-filtro-periodo')?.value ?? 0);

  let filtrados = cacheRegistrosKmGestor.filter(r => _dentroDoPeriodoKm(r.data, dias));
  if (condutor) filtrados = filtrados.filter(r => r.email_condutor === condutor);
  if (ajustado === 'sim') filtrados = filtrados.filter(r => !!r.ajustado);
  if (ajustado === 'nao') filtrados = filtrados.filter(r => !r.ajustado);

  renderizarRegistrosKmGestor(filtrados);
}

function limparFiltrosKmGestor() {
  const selCondutor = document.getElementById('km-filtro-condutor');
  const selAjustado = document.getElementById('km-filtro-ajustado');
  const selPeriodo = document.getElementById('km-filtro-periodo');
  if (selCondutor) selCondutor.value = '';
  if (selAjustado) selAjustado.value = '';
  if (selPeriodo) selPeriodo.value = '0';
  aplicarFiltrosKmGestor();
}

async function carregarRegistrosKmGestor() {
  const tbody = document.getElementById('tb-registros-km-gestor');
  Components.Loading.show(tbody);
  try {
    const dados = await listarTodosKM();
    cacheRegistrosKmGestor = dados || [];
    aplicarFiltrosKmGestor();
  } catch (e) {
    // Sem isso, um erro aqui deixava a tabela travada no spinner de
    // "Carregando..." pra sempre (nada reescrevia o tbody depois do catch).
    console.error('Erro ao carregar KM:', e);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-8">Erro ao carregar KM. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarRegistrosKmGestor()">Tentar de novo</button></td></tr>`;
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
        <div class="flex gap-2">
          <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarKmGestor('${r.id}')">Editar</button>
          <button class="btn-danger text-xs py-1.5 px-2.5" onclick="excluirKmGestor('${r.id}')">Excluir</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');
}

function limparFormKmGestor() {
  document.getElementById('form-km-gestor').reset();
  document.getElementById('km-gestor-id-edicao').value = '';
  document.getElementById('titulo-form-km-gestor').textContent = 'Lançar KM';
  document.getElementById('btn-cancelar-edicao-km-gestor').classList.add('hidden');
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
  document.getElementById('btn-cancelar-edicao-km-gestor').classList.remove('hidden');
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
window.preencherFiltroCondutorKm = preencherFiltroCondutorKm;
window.aplicarFiltrosKmGestor = aplicarFiltrosKmGestor;
window.limparFiltrosKmGestor = limparFiltrosKmGestor;