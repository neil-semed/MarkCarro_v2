// ============================================================
// MARKCARRO - Página: Registro de KM
// ============================================================

let _chartHistoricoKm = null;

async function carregarRegistroKm() {
  // BUG ENCONTRADO ("registro de km não está carregando os registros de km
  // anteriores, nem gerando gráficos"): comparação com case sensível
  // (=== 'condutor') - o resto do app (ex.: pages/login.js) já compara com
  // .toLowerCase(), porque o valor gravado no perfil nem sempre é
  // "condutor" tudo minúsculo. Sem essa correção, a função saía (return)
  // ANTES até de chamar carregarHistoricoKm() - por isso nada carregava.
  if (!usuarioAtual || usuarioAtual.tipo?.toLowerCase() !== 'condutor') return;
  
  const conteudo = document.getElementById('km-conteudo');
  conteudo.innerHTML = '<div class="p-4 text-center">Carregando status...</div>';
  
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const registro = await buscarKM_porData(usuarioAtual.email, hoje);
    
    // Antes usava classes do Bootstrap (alert/form-control/form-label/
    // "btn btn-x"/w-100) que não existem neste app (só Tailwind) - a tela
    // inteira aparecia sem nenhum estilo (caixa branca crua, botão sem cor).
    // Trocado pelas classes reais da aplicação (.alert-box+.alert-*,
    // .input-field, .btn-*).
    if (registro && registro.km_final) {
      conteudo.innerHTML = `
        <div class="alert-box alert-success mb-3">
          <h6 class="font-semibold mb-1">✅ Registro de hoje completo</h6>
          <p>Inicial: ${registro.km_inicial} km | Final: ${registro.km_final} km | Rodado: ${registro.km_final - registro.km_inicial} km</p>
        </div>
        <button class="btn-outline w-full" onclick="registrarKmFinalUI()">Registrar KM Final (correção)</button>
      `;
    } else if (registro) {
      conteudo.innerHTML = `
        <div class="alert-box alert-warning mb-3">
          <h6 class="font-semibold mb-1">⏳ Aguardando KM Final</h6>
          <p>KM Inicial: ${registro.km_inicial} km</p>
        </div>
        <div class="mb-3">
          <label class="block text-sm font-medium text-slate-700 mb-1">KM Final</label>
          <input type="number" id="km-final-input" class="input-field" placeholder="Ex: 12500">
        </div>
        <button class="btn-success w-full" onclick="registrarKmFinalUI()">Salvar KM Final</button>
      `;
    } else {
      conteudo.innerHTML = `
        <div class="alert-box alert-info mb-3">
          <h6 class="font-semibold mb-1">📝 Registrar KM Inicial</h6>
        </div>
        <div class="mb-3">
          <label class="block text-sm font-medium text-slate-700 mb-1">KM Inicial</label>
          <input type="number" id="km-inicial-input" class="input-field" placeholder="Ex: 12350">
        </div>
        <button class="btn-primary w-full" onclick="registrarKmInicialUI()">Salvar KM Inicial</button>
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
    _renderizarGraficoHistoricoKm(dados || []);
  } catch (e) {
    console.warn('Erro ao carregar histórico:', e);
  }
}

// PEDIDO DO USUÁRIO ("nem gerando gráficos"): esta tela não tinha nenhum
// gráfico (só a tabela acima) - km rodado por dia, só os registros já com
// KM final lançado, mesmo padrão do gráfico de Km do Dashboard do Condutor
// (pages/dashboard-condutor.js: _renderizarGraficoKmDashCond).
function _renderizarGraficoHistoricoKm(registros) {
  const canvas = document.getElementById('km-historico-canvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const comKmFinal = (registros || []).filter(r => r.km_final != null && r.km_final !== '');
  if (_chartHistoricoKm) { _chartHistoricoKm.destroy(); _chartHistoricoKm = null; }
  if (!comKmFinal.length) return;

  _chartHistoricoKm = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: comKmFinal.map(r => formatarDataBR(r.data)),
      datasets: [{
        label: 'Km rodado',
        data: comKmFinal.map(r => Math.round(r.km_final - r.km_inicial)),
        borderColor: '#044AAA',
        backgroundColor: '#044AAA',
        tension: 0.2,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// Expor globalmente
window.carregarRegistroKm = carregarRegistroKm;
window.registrarKmInicialUI = registrarKmInicialUI;
window.registrarKmFinalUI = registrarKmFinalUI;