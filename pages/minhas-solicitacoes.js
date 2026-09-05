// ============================================================
// MARKCARRO - MINHAS SOLICITAÇÕES PAGE (Solicitante)
// ============================================================

const MinhasSolicitacoesPage = {
  tabela: null,
  tbody: null,
  paretoCanvas: null,
  paretoChart: null,
  paretoPeriodoSelect: null,
  btnExportar: null,
  solicitacoes: [],
  
  init() {
    this.tabela = document.getElementById('tb-minhas-solicitacoes');
    this.tbody = document.getElementById('tb-minhas-solicitacoes');
    this.paretoCanvas = document.getElementById('pareto-solic-canvas');
    this.paretoPeriodoSelect = document.getElementById('pareto-solic-periodo');
    this.btnExportar = document.getElementById('btn-exportar-minhas-solic');
    
    this.bindEvents();
    this.carregar();
  },
  
  bindEvents() {
    this.paretoPeriodoSelect.addEventListener('change', () => this.renderizarPareto());
    this.btnExportar.addEventListener('click', () => this.exportarXlsx());
  },
  
  async carregar() {
    Components.Loading.show('Carregando solicitações...');
    
    try {
      const result = await API.buscarMinhasSolicitacoes();
      
      if (result.success) {
        this.solicitacoes = result.data || [];
        this.renderizarTabela();
        this.renderizarPareto();
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro ao carregar: ' + error.message);
    } finally {
      Components.Loading.hide();
    }
  },
  
  renderizarTabela() {
    if (!this.tbody) return;
    
    if (this.solicitacoes.length === 0) {
      this.tbody.innerHTML = '<tr><td colspan="9" class="text-center text-slate-500 py-8">Nenhuma solicitação encontrada.</td></tr>';
      return;
    }
    
    // Ordena por data de viagem decrescente
    const ordenadas = [...this.solicitacoes].sort((a, b) => {
      const da = new Date(a.data_viagem + 'T' + a.hora_saida);
      const db = new Date(b.data_viagem + 'T' + b.hora_saida);
      return db - da;
    });
    
    this.tbody.innerHTML = ordenadas.map(s => `
      <tr class="hover:bg-slate-50">
        <td><small class="text-slate-500">${s.id}</small></td>
        <td>${Utils.formatarDataBR(s.data_solicitacao)}</td>
        <td>${Utils.formatarDataBR(s.data_viagem)}</td>
        <td>${Utils.formatarHoraBR(s.hora_saida)} - ${Utils.formatarHoraBR(s.hora_retorno)}</td>
        <td>${s.origem} <span class="text-slate-400 mx-1">➡️</span> ${s.destino}</td>
        <td class="max-w-xs truncate block"><small>${s.justificativa}</small></td>
        <td><span class="badge ${Utils.corStatus(s.status)}">${s.status}</span></td>
        <td>${s.condutor_ida_codigo || (s.condutor_ida_email ? '<i class="text-slate-400">Atribuído</i>' : '<i class="text-slate-400">Pendente</i>')}</td>
        <td>
          ${s.pode_cancelar ? `
            <button onclick="MinhasSolicitacoesPage.cancelar('${s.id}')" 
              class="btn-danger text-xs px-2 py-1" title="Cancelar">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              Cancelar
            </button>
          ` : '<span class="text-slate-400 text-xs">—</span>'}
        </td>
      </tr>
    `).join('');
  },
  
  async cancelar(id) {
    if (!confirm('Tem certeza que deseja cancelar esta solicitação?')) return;
    
    try {
      const result = await API.cancelarSolicitacao(id);
      
      if (result.success) {
        Components.Toast.success('Solicitação cancelada');
        this.carregar();
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro ao cancelar: ' + error.message);
    }
  },
  
  renderizarPareto() {
    if (!this.paretoCanvas) return;
    
    const diasFiltro = parseInt(this.paretoPeriodoSelect?.value) || 30;
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    let filtrados = this.solicitacoes.filter(s => {
      if (diasFiltro === 0) return true;
      const d = new Date(s.data_viagem);
      if (isNaN(d.getTime())) return false;
      const diff = (hoje - d) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= diasFiltro;
    });
    
    // Conta por status
    const contagem = {};
    filtrados.forEach(s => {
      contagem[s.status] = (contagem[s.status] || 0) + 1;
    });
    
    // Ordena do maior para menor
    const entradas = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    const labels = entradas.map(e => e[0]);
    const valores = entradas.map(e => e[1]);
    const total = valores.reduce((s, v) => s + v, 0);
    
    let acumulado = 0;
    const percentuais = valores.map(v => {
      acumulado += v;
      return total > 0 ? Math.round((acumulado / total) * 100) : 0;
    });
    
    const ctx = this.paretoCanvas.getContext('2d');
    if (this.paretoChart) this.paretoChart.destroy();
    if (labels.length === 0) return;
    
    this.paretoChart = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Quantidade',
            data: valores,
            backgroundColor: '#0d6efd',
            yAxisID: 'yQtd'
          },
          {
            type: 'line',
            label: '% Acumulado',
            data: percentuais,
            borderColor: '#dc3545',
            backgroundColor: '#dc3545',
            yAxisID: 'yPct',
            tension: 0.2,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          yQtd: { 
            type: 'linear', 
            position: 'left', 
            beginAtZero: true, 
            title: { display: true, text: 'Quantidade' } 
          },
          yPct: { 
            type: 'linear', 
            position: 'right', 
            beginAtZero: true, 
            max: 100, 
            grid: { drawOnChartArea: false },
            title: { display: true, text: '% Acumulado' }
          }
        }
      }
    });
  },
  
  async exportarXlsx() {
    const btn = this.btnExportar;
    const textoOriginal = btn?.innerText;
    
    if (btn) {
      btn.disabled = true;
      btn.innerText = '⏳ Gerando...';
    }
    
    try {
      const diasFiltro = parseInt(this.paretoPeriodoSelect?.value) || 30;
      let dataInicioBR = '', dataFimBR = '';
      
      if (diasFiltro > 0) {
        const hoje = new Date();
        const inicio = new Date(hoje.getTime() - diasFiltro * 24 * 60 * 60 * 1000);
        dataInicioBR = Utils.formatarDataBR(inicio.toISOString().split('T')[0]);
        dataFimBR = Utils.formatarDataBR(new Date().toISOString().split('T')[0]);
      }
      
      if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ Gerando...';
      }
      
      const result = await API.exportarMinhasSolicitacoesXlsx ? 
        await API.exportarMinhasSolicitacoesXlsx() : 
        await API.exportarXlsx(); // fallback
      
      if (result.success && result.data?.base64) {
        Utils.downloadBase64(result.data.base64, result.data.filename || 'Minhas_Solicitacoes.xlsx');
        Components.Toast.success('Arquivo baixado!');
      } else {
        Components.Toast.error('Erro ao gerar arquivo');
      }
    } catch (error) {
      Components.Toast.error('Erro ao exportar: ' + error.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = textoOriginal;
      }
    }
  }
};

// MinhasSolicitacoesPage.init() é chamado pelo App (app.js) quando a tela é aberta,
// não aqui — os elementos desta tela só existem dentro de #tela-minhas-solicitacoes,
// que fica oculta até o usuário logar e navegar até ela.
window.MinhasSolicitacoesPage = MinhasSolicitacoesPage;
