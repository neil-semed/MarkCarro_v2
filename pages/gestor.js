// ============================================================
// MARKCARRO - Página: Painel do Gestor (funcionalidades avançadas)
// ============================================================

async function carregarPainelGestor(forcarAtualizacao = false) {
  const tbody = document.getElementById('tb-gestor-geral');
  if (!forcarAtualizacao && tbody.children.length > 1) return;
  
  Components.Loading.show(tbody);
  try {
    const [solicitacoes, condutores] = await Promise.all([
      buscarTodasSolicitacoes(),
      listarCondutores()
    ]);
    
    cacheCondutores = condutores || [];
    renderizarTabelaGestorCompleta(solicitacoes || []);
  } catch (e) {
    Components.Toast.error('Erro ao carregar painel');
  }
}

function renderizarTabelaGestorCompleta(dados) {
  const tbody = document.getElementById('tb-gestor-geral');
  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="16" class="text-center text-slate-500 p-4">Nenhuma solicitação</td></tr>';
    return;
  }
  
  const opcoesCondutor = cacheCondutores.map(c => 
    `<option value="${c.email}">${c.nome} (${c.capacidade || ''})</option>`
  ).join('');
  
  tbody.innerHTML = dados.map(s => {
    const status = s.status || 'Pendente';
    return `
    <tr data-id="${s.id}">
      <td>${formatarDataHoraBR(s.data_solicitacao)}</td>
      <td><input type="date" value="${formatarDataBR(s.data_viagem)}" class="form-control form-control-sm" onchange="salvarCampoGestor('${s.id}', 'data_viagem', this.value)"></td>
      <td><input type="time" value="${formatarHoraBR(s.hora_saida)}" class="form-control form-control-sm" onchange="salvarCampoGestor('${s.id}', 'hora_saida', this.value)"></td>
      <td><input type="time" value="${formatarHoraBR(s.hora_retorno)}" class="form-control form-control-sm" onchange="salvarCampoGestor('${s.id}', 'hora_retorno', this.value)"></td>
      <td><input type="text" value="${s.origem}" class="form-control form-control-sm" onchange="salvarCampoGestor('${s.id}', 'origem', this.value)"></td>
      <td><input type="text" value="${s.destino}" class="form-control form-control-sm" onchange="salvarCampoGestor('${s.id}', 'destino', this.value)"></td>
      <td>${s.nome_ext || s.email_solicitante}</td>
      <td>${s.unidade || ''}</td>
      <td>${s.setor || ''}</td>
      <td>${s.justificativa}</td>
      <td>${s.tipo_viagem}</td>
      <td><input type="number" value="${s.qtd_pessoas}" class="form-control form-control-sm" min="1" onchange="salvarCampoGestor('${s.id}', 'qtd_pessoas', this.value)"></td>
      <td><span class="badge ${classeStatus(status)}">${status}</span></td>
      <td>
        <select class="form-select form-select-sm" onchange="salvarCampoGestor('${s.id}', 'condutor_ida', this.value)">
          <option value="">—</option>
          ${opcoesCondutor}
        </select>
      </td>
      <td>
        <select class="form-select form-select-sm" onchange="salvarCampoGestor('${s.id}', 'condutor_volta', this.value)">
          <option value="">—</option>
          ${opcoesCondutor}
        </select>
      </td>
      <td>
        <div class="btn-group btn-group-sm">
          ${status === 'Pendente' || status === 'Em Análise' ? `
            <button class="btn btn-success" onclick="confirmarSolicitacaoGestor('${s.id}')">✓ Confirmar</button>
            <button class="btn btn-danger" onclick="cancelarSolicitacaoGestor('${s.id}')">✗ Cancelar</button>
          ` : status === 'Confirmada' ? `
            <button class="btn btn-warning" onclick="marcarOcupadoGestor('${s.id}')">Ocupado</button>
            <button class="btn btn-danger" onclick="cancelarSolicitacaoGestor('${s.id}')">Cancelar</button>
          ` : ''}
          <button class="btn btn-outline" onclick="editarSolicitacaoGestor('${s.id}')">Editar</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');
  
  // Preencher selects com valores atuais
  dados.forEach(s => {
    const row = tbody.querySelector(`tr[data-id="${s.id}"]`);
    if (row) {
      row.querySelector('select:nth-of-type(1)').value = s.condutor_ida || '';
      row.querySelector('select:nth-of-type(2)').value = s.condutor_volta || '';
    }
  });
}

async function salvarCampoGestor(id, campo, valor) {
  try {
    await atualizarSolicitacao(id, { [campo]: valor });
  } catch (e) {
    Components.Toast.error('Erro ao salvar');
  }
}

async function confirmarSolicitacaoGestor(id) {
  const row = document.querySelector(`#tb-gestor-geral tr[data-id="${id}"]`);
  const condutorIda = row.querySelector('select:nth-of-type(1)').value;
  const condutorVolta = row.querySelector('select:nth-of-type(2)').value;
  
  if (!condutorIda) return Components.Toast.error('Selecione condutor de ida');
  
  try {
    await atualizarSolicitacao(id, { 
      status: 'Confirmada',
      condutor_ida: condutorIda,
      condutor_volta: condutorVolta || null
    });
    Components.Toast.success('Solicitação confirmada!');
    carregarPainelGestor(true);
  } catch (e) {
    Components.Toast.error('Erro ao confirmar');
  }
}

async function marcarOcupadoGestor(id) {
  if (!confirm('Marcar como OCUPADO? O solicitante será notificado.')) return;
  try {
    await atualizarSolicitacao(id, { status: 'Ocupado' });
    Components.Toast.success('Marcado como Ocupado');
    carregarPainelGestor(true);
  } catch (e) {
    Components.Toast.error('Erro');
  }
}

async function cancelarSolicitacaoGestor(id) {
  if (!confirm('Cancelar esta solicitação?')) return;
  try {
    await atualizarSolicitacao(id, { status: 'Cancelada' });
    Components.Toast.success('Cancelada');
    carregarPainelGestor(true);
  } catch (e) {
    Components.Toast.error('Erro');
  }
}

function editarSolicitacaoGestor(id) {
  // A edição é inline na tabela
  Components.Toast.info('Edite diretamente na tabela');
}

// Expor globalmente
window.carregarPainelGestor = carregarPainelGestor;
window.confirmarSolicitacaoGestor = confirmarSolicitacaoGestor;
window.marcarOcupadoGestor = marcarOcupadoGestor;
window.cancelarSolicitacaoGestor = cancelarSolicitacaoGestor;
window.editarSolicitacaoGestor = editarSolicitacaoGestor;
window.salvarCampoGestor = salvarCampoGestor;