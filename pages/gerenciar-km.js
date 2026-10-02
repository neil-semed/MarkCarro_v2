// ============================================================
// MARKCARRO - Página: Gerenciar KM (Gestor)
// ============================================================

async function carregarGerenciarKm() {
  preencherSelectCondutoresKm();
  preencherFiltroCondutorKm();
  aplicarModoConsultaTela('gerenciar-km', 'form-km-gestor');
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

// Escape local (não depende de escapeHtml de app.js existir/estar
// disponível nesta tela) - só usado pro nome vindo do Bora Lá em registros
// ainda não vinculados a um condutor do MarkCarro.
function _escapeHtmlKm(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function aplicarFiltrosKmGestor() {
  const condutor = document.getElementById('km-filtro-condutor')?.value || '';
  const ajustado = document.getElementById('km-filtro-ajustado')?.value || '';
  const dias = Number(document.getElementById('km-filtro-periodo')?.value ?? 0);

  let filtrados = cacheRegistrosKmGestor.filter(r => _dentroDoPeriodoKm(r.data, dias));
  if (condutor) filtrados = filtrados.filter(r => (r.email_condutor || '').trim().toLowerCase() === condutor.trim().toLowerCase());
  if (ajustado === 'sim') filtrados = filtrados.filter(r => !!r.ajustado);
  if (ajustado === 'nao') filtrados = filtrados.filter(r => !r.ajustado);

  // PEDIDO DO USUÁRIO ("ordenar registros pela data, do mais recente pro
  // mais antigo, para todos os registros, inclusive os antigos"): a lista
  // vinha na ordem devolvida pela API (mistura de km-bridge + registros
  // legados, sem ordem garantida) - agora sempre por data decrescente, pra
  // qualquer origem do registro (_legado ou não).
  filtrados = filtrados.slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));

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
  const aviso = document.getElementById('aviso-km-bridge');
  Components.Loading.show(tbody);
  try {
    const dados = await listarTodosKM();
    cacheRegistrosKmGestor = dados || [];
    // Mostra o motivo REAL quando a ponte com o Bora Lá falha, em vez de só
    // sumir os registros de lá sem explicação (é o que impedia de saber se o
    // problema era função não publicada, erro de permissão, etc.).
    if (aviso) {
      if (dados?._erroBridge) {
        aviso.textContent = `Não foi possível carregar os registros do Bora Lá: ${dados._erroBridge}`;
        aviso.classList.remove('hidden');
      } else {
        aviso.classList.add('hidden');
      }
    }
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
    // Registro do Bora Lá que não foi possível casar automático com nenhum
    // condutor do MarkCarro (e-mail/CNH/nome não bateram) - em vez de sumir
    // da lista (o que já causou o caso do Cristiano ficar invisível aqui),
    // aparece com o nome como está no Bora Lá e um seletor pra vincular
    // manualmente ao condutor certo (grava o e-mail de vez, só precisa fazer
    // uma vez por motorista).
    if (r._nao_vinculado) {
      return `
      <tr class="bg-amber-50">
        <td>${formatarDataBR(r.data)}</td>
        <td>${_escapeHtmlKm(r._nome_bora_la || '(sem nome)')} <span class="text-xs text-amber-600">(não vinculado)</span></td>
        <td>${r.km_inicial}</td>
        <td>${r.km_final || ''}</td>
        <td>${r.km_final ? r.km_final - r.km_inicial : ''}</td>
        <td>${r.ajustado ? 'Sim' : 'Não'}</td>
        <td>
          <div class="flex gap-2 items-center">
            <select id="km-vincular-${r._driver_id}" class="text-xs border border-slate-300 rounded px-1.5 py-1">
              <option value="">Vincular a...</option>
              ${cacheCondutores.map(c => `<option value="${c.email}">${c.nome}</option>`).join('')}
            </select>
            <button class="btn-outline text-xs py-1.5 px-2.5" onclick="vincularMotoristaKmGestor('${r._driver_id}')">Vincular</button>
            <button class="btn-danger text-xs py-1.5 px-2.5" onclick="excluirKmGestor('${r.id}')">Excluir</button>
          </div>
        </td>
      </tr>
      `;
    }

    const condutor = cacheCondutores.find(c => (c.email || '').trim().toLowerCase() === (r.email_condutor || '').trim().toLowerCase());
    // Registro _legado (tabela antiga registros_km, de antes do km-bridge)
    // continua editável/excluível normalmente - só que direto na tabela
    // local (ver atualizarKMLegado/excluirKMLegado em api.js), já que o id
    // dele não existe no Bora Lá. A tag "antigo" é só informativa.
    return `
    <tr>
      <td>${formatarDataBR(r.data)}</td>
      <td>${condutor?.nome || r.email_condutor}</td>
      <td>${r.km_inicial}</td>
      <td>${r.km_final || ''}</td>
      <td>${r.km_final ? r.km_final - r.km_inicial : ''}</td>
      <td>${r.ajustado ? 'Sim' : 'Não'}</td>
      <td>
        <div class="flex gap-2 items-center">
          ${r._legado ? '<span class="text-xs text-slate-400" title="Registro de antes da integração com o Bora Lá">antigo</span>' : ''}
          <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarKmGestor('${r.id}')">Editar</button>
          <button class="btn-danger text-xs py-1.5 px-2.5" onclick="excluirKmGestor('${r.id}')">Excluir</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');
}

async function vincularMotoristaKmGestor(driverId) {
  if (!usuarioPodeEditarTela('gerenciar-km')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  const select = document.getElementById(`km-vincular-${driverId}`);
  const email = select?.value || '';
  if (!email) return Components.Toast.error('Selecione o condutor correspondente.');
  try {
    await vincularMotoristaKM(driverId, email);
    Components.Toast.success('Motorista vinculado! Os registros dele já aparecem normalmente.');
    carregarRegistrosKmGestor();
  } catch (e) {
    Components.Toast.error('Erro ao vincular: ' + e.message);
  }
}

// Guarda se o registro em edição é _legado (tabela local) ou do km-bridge
// (Bora Lá) - salvarKmGestor() usa isso pra saber pra onde mandar o PATCH.
let idEdicaoLegado = false;

// PEDIDO DO USUÁRIO ("lançar km/ condutor - manter o último selecionado
// após clicar em salvar"): form.reset() sempre voltava o <select> de
// Condutor pra "Selecione..." depois de salvar - obrigava escolher o
// condutor de novo a cada lançamento, mesmo lançando vários KMs seguidos
// pro mesmo condutor. manterCondutor=true preserva o valor atual do
// select depois do reset (usado só ao salvar - "Cancelar edição" continua
// limpando tudo, inclusive o condutor).
function limparFormKmGestor(manterCondutor = false) {
  const condutorAtual = document.getElementById('km-gestor-condutor')?.value || '';
  document.getElementById('form-km-gestor').reset();
  if (manterCondutor) document.getElementById('km-gestor-condutor').value = condutorAtual;
  document.getElementById('km-gestor-id-edicao').value = '';
  idEdicaoLegado = false;
  document.getElementById('titulo-form-km-gestor').textContent = 'Lançar KM';
  document.getElementById('btn-cancelar-edicao-km-gestor').classList.add('hidden');
}

function editarKmGestor(id) {
  if (!usuarioPodeEditarTela('gerenciar-km')) { Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.'); return; }
  const r = cacheRegistrosKmGestor.find(x => String(x.id) === String(id));
  if (!r) return;
  idEdicaoLegado = !!r._legado;

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
  if (!usuarioPodeEditarTela('gerenciar-km')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  const r = cacheRegistrosKmGestor.find(x => String(x.id) === String(id));
  if (!confirm('Tem certeza que deseja excluir este registro de KM?')) return;
  try {
    if (r?._legado) await excluirKMLegado(id);
    else await excluirKM(id);
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
  if (!usuarioPodeEditarTela('gerenciar-km')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');

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
      if (idEdicaoLegado) await atualizarKMLegado(idEdicao, dados);
      else await atualizarKM(idEdicao, dados);
      Components.Toast.success('Registro atualizado!');
    } else {
      await registrarKM(dados);
      Components.Toast.success('Registro salvo!');
    }

    limparFormKmGestor(true);
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
window.vincularMotoristaKmGestor = vincularMotoristaKmGestor;
