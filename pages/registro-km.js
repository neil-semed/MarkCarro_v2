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
let _kmPeriodoGrafico = 30;      // 7, 30 ou 0 (= tudo)
let _kmRegistrosGrafico = [];

function definirPeriodoGraficoKm(n) {
  _kmPeriodoGrafico = n;
  _renderizarGraficoHistoricoKm(_kmRegistrosGrafico);
}

function _renderizarGraficoHistoricoKm(registros) {
  _kmRegistrosGrafico = registros || [];
  const canvas = document.getElementById('km-historico-canvas');
  const elChips = document.getElementById('km-chips');
  const elTiles = document.getElementById('km-tiles');
  if (elChips) {
    elChips.innerHTML = [[7, '7 dias'], [30, '30 dias'], [0, 'Tudo']].map(([n, t]) =>
      `<button type="button" onclick="definirPeriodoGraficoKm(${n})" style="padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid ${n === _kmPeriodoGrafico ? '#1e40af' : '#cbd5e1'};background:${n === _kmPeriodoGrafico ? '#1e40af' : '#fff'};color:${n === _kmPeriodoGrafico ? '#fff' : '#475569'}">${t}</button>`
    ).join('');
  }
  if (!canvas || typeof Chart === 'undefined') return;

  // PEDIDO DO USUÁRIO ("gráficos devem respeitar datas cronologicamente e
  // não momento de registro"): ordena por data.
  const mapa = {};
  (registros || [])
    .filter(r => r.km_final != null && r.km_final !== '')
    .forEach(r => { mapa[r.data] = (mapa[r.data] || 0) + Math.round(r.km_final - r.km_inicial); });
  const datas = Object.keys(mapa).sort();

  // 7 / 30 dias: eixo contínuo (dias sem rodagem aparecem vazios); Tudo: só os dias com registro
  let eixo;
  if (_kmPeriodoGrafico > 0) {
    eixo = [];
    const fim = new Date(); fim.setHours(12, 0, 0, 0);
    for (let k = _kmPeriodoGrafico - 1; k >= 0; k--) {
      const d = new Date(fim); d.setDate(d.getDate() - k);
      eixo.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  } else {
    eixo = datas;
  }
  const valores = eixo.map(d => mapa[d] != null ? mapa[d] : null);
  const comValor = valores.filter(v => v != null && v > 0);
  const total = comValor.reduce((a, b) => a + b, 0);
  const media = comValor.length ? Math.round(total / comValor.length) : 0;
  const maior = comValor.length ? Math.max(...comValor) : 0;

  if (elTiles) {
    elTiles.innerHTML = [[total, 'Total'], [media, 'Média/dia'], [maior, 'Maior dia']].map(([v, t]) =>
      `<div class="rounded-lg border border-slate-200 bg-slate-50 text-center py-2"><div class="text-base font-bold text-slate-800">${v} km</div><div class="text-[11px] text-slate-500">${t}</div></div>`
    ).join('');
  }

  if (_chartHistoricoKm) { _chartHistoricoKm.destroy(); _chartHistoricoKm = null; }
  if (!eixo.length) return;

  const rotularTodos = eixo.length <= 14;
  const plugin = {
    id: 'kmRotulosMedia',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      if (media > 0) {
        const y = scales.y.getPixelForValue(media);
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(chartArea.left, y); ctx.lineTo(chartArea.right, y); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('média ' + media, chartArea.right, y - 3);
      }
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      meta.data.forEach((bar, i) => {
        const v = valores[i];
        if (v == null || v <= 0) return;
        if (rotularTodos || v === maior) ctx.fillText(String(v), bar.x, bar.y - 4);
      });
      ctx.restore();
    }
  };

  _chartHistoricoKm = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    plugins: [plugin],
    data: {
      labels: eixo.map(d => d.slice(8, 10) + '/' + d.slice(5, 7)),
      datasets: [{
        label: 'Km rodado',
        data: valores,
        backgroundColor: valores.map(v => v === maior && v > 0 ? '#044AAA' : '#5b8ad6'),
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: 'bottom',
        categoryPercentage: 0.9,
        barPercentage: 0.85
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 16 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (it) => formatarDataBR(eixo[it[0].dataIndex]),
            label: (it) => it.raw == null ? 'Sem rodagem' : `${it.raw} km`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { font: { size: 10 } } }
      }
    }
  });
}

// Expor globalmente
window.carregarRegistroKm = carregarRegistroKm;
window.definirPeriodoGraficoKm = definirPeriodoGraficoKm;
window.registrarKmInicialUI = registrarKmInicialUI;
window.registrarKmFinalUI = registrarKmFinalUI;