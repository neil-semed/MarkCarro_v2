// ============================================================
// MARKCARRO - Página: Registro de KM
// ============================================================

async function carregarRegistroKm() {
  if (!usuarioAtual || usuarioAtual.tipo !== 'condutor') return;
  
  const conteudo = document.getElementById('km-conteudo');
  conteudo.innerHTML = '<div class="p-4 text-center">Carregando status...</div>';
  
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const registro = await buscarKM_porData(usuarioAtual.email, hoje);
    
    if (registro && registro.km_final) {
      conteudo.innerHTML = `
        <div class="alert alert-success">
          <h6>✅ Registro de hoje completo</h6>
          <p>Inicial: ${registro.km_inicial} km | Final: ${registro.km_final} km | Rodado: ${registro.km_final - registro.km_inicial} km</p>
        </div>
        <button class="btn btn-outline w-100" onclick="registrarKmFinalUI()">Registrar KM Final (correção)</button>
      `;
    } else if (registro) {
      conteudo.innerHTML = `
        <div class="alert alert-warning">
          <h6>⏳ Aguardando KM Final</h6>
          <p>KM Inicial: ${registro.km_inicial} km</p>
        </div>
        <div class="mb-3">
          <label class="form-label">KM Final</label>
          <input type="number" id="km-final-input" class="form-control" placeholder="Ex: 12500">
        </div>
        <button class="btn btn-success w-100" onclick="registrarKmFinalUI()">Salvar KM Final</button>
      `;
    } else {
      conteudo.innerHTML = `
        <div class="alert alert-info">
          <h6>📝 Registrar KM Inicial</h6>
        </div>
        <div class="mb-3">
          <label class="form-label">KM Inicial</label>
          <input type="number" id="km-inicial-input" class="form-control" placeholder="Ex: 12350">
        </div>
        <button class="btn btn-primary w-100" onclick="registrarKmInicialUI()">Salvar KM Inicial</button>
      `;
    }
    
    carregarHistoricoKm();
  } catch (e) {
    Components.Toast.error('Erro ao carregar registro de KM');
  }
}

async function registrarKmInicialUI() {
  const km = parseInt(document.getElementById('km-inicial-input').value);
  if (!km) return Components.Toast.error('Informe o KM inicial');
  
  try {
    await registrarKM({ email_condutor: usuarioAtual.email, data: new Date().toISOString().split('T')[0], km_inicial: km });
    Components.Toast.success('KM Inicial registrado!');
    carregarRegistroKm();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

async function registrarKmFinalUI() {
  const km = parseInt(document.getElementById('km-final-input').value);
  if (!km) return Components.Toast.error('Informe o KM final');
  
  const hoje = new Date().toISOString().split('T')[0];
  const registro = await buscarKM_porData(usuarioAtual.email, hoje);
  
  if (!registro) return Components.Toast.error('Nenhum KM inicial hoje');
  if (km < registro.km_inicial) return Components.Toast.error('KM final não pode ser menor que o inicial');
  
  try {
    await atualizarKM(registro.id, { km_final: km });
    Components.Toast.success(`KM Final salvo! Total: ${km - registro.km_inicial} km`);
    carregarRegistroKm();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

async function carregarHistoricoKm() {
  try {
    const dados = await buscarKM_porPeriodo(usuarioAtual.email, '2020-01-01', new Date().toISOString().split('T')[0]);
    const tbody = document.getElementById('tb-historico-km');
    tbody.innerHTML = (dados || []).map(r => `
      <tr>
        <td>${formatarDataBR(r.data)}</td>
        <td>${r.km_final ? r.km_final - r.km_inicial : '—'} km</td>
      </tr>
    `).join('') || '<tr><td colspan="2" class="text-center text-slate-500">Nenhum registro</td></tr>';
  } catch (e) {
    console.warn('Erro ao carregar histórico:', e);
  }
}

// Expor globalmente
window.carregarRegistroKm = carregarRegistroKm;
window.registrarKmInicialUI = registrarKmInicialUI;
window.registrarKmFinalUI = registrarKmFinalUI;