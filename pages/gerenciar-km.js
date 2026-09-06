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
    renderizarRegistrosKmGestor(dados || []);
  } catch (e) {
    Components.Toast.error('Erro ao carregar KM');
  }
}

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

async function salvarKmGestor() {
  const email = document.getElementById('km-gestor-condutor').value;
  const data = document.getElementById('km-gestor-data').value;
  const inicial = parseInt(document.getElementById('km-gestor-inicial').value);
  const final = document.getElementById('km-gestor-final').value;
  
  if (!email || !data || !inicial) return Components.Toast.error('Preencha todos os campos obrigatórios');
  
  try {
    const kmFinal = final ? parseInt(final) : null;
    await registrarKM({
      email_condutor: email,
      data: data,
      km_inicial: inicial,
      km_final: kmFinal,
      ajustado: true
    });
    Components.Toast.success('Registro salvo!');
    document.getElementById('form-km-gestor').reset();
    carregarRegistrosKmGestor();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

// Expor globalmente
window.carregarGerenciarKm = carregarGerenciarKm;
window.salvarKmGestor = salvarKmGestor;
window.carregarRegistrosKmGestor = carregarRegistrosKmGestor;