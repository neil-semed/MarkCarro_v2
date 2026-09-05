// ============================================================
// MARKCARRO - REGISTRO DE KM PAGE (Condutor)
// ============================================================

const RegistroKmPage = {
  conteudoDiv: null,
  totalKmDiv: null,
  periodoSelect: null,
  historicoTbody: null,
  historicoKm: [],
  chart: null,
  
  init() {
    this.conteudoDiv = document.getElementById('km-conteudo');
    this.totalKmDiv = document.getElementById('total-km-condutor');
    this.periodoSelect = document.getElementById('km-condutor-periodo');
    this.historicoTbody = document.getElementById('tb-historico-km');
    
    this.bindEvents();
    this.carregar();
  },
  
  bindEvents() {
    this.periodoSelect?.addEventListener('change', () => this.renderizarTotal());
  },
  
  async carregar() {
    await Promise.all([
      this.carregarStatus(),
      this.carregarHistorico()
    ]);
  },
  
  async carregarStatus() {
    try {
      const result = await API.statusKmHoje();
      if (result.success) {
        this.renderizarStatus(result.data);
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      console.error('Erro ao carregar status KM:', error);
    }
  },
  
  async carregarHistorico() {
    try {
      const result = await API.historicoKm();
      if (result.success) {
        this.historicoKm = result.data || [];
        this.renderizarHistorico();
        this.renderizarTotal();
      }
    } catch (error) {
      console.error('Erro ao carregar histórico KM:', error);
    }
  },
  
  renderizarStatus(status) {
    if (!this.conteudoDiv) return;
    
    if (status.status === 'sem_registro_hoje') {
      this.conteudoDiv.innerHTML = `
        <div class="text-center py-8">
          <svg class="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2v2m-6 12l-2 2m0 0l2 2m-2-2l-2 2"/></svg>
          <h3 class="text-lg font-semibold text-slate-900 mb-2">Nenhum registro hoje</h3>
          <p class="text-slate-500 mb-4">Você ainda não registrou o km inicial de hoje.</p>
          <div class="max-w-xs mx-auto">
            <label class="block text-sm font-medium text-slate-700 mb-1">Km Inicial *</label>
            <input type="number" id="km-inicial-input" class="input-field mb-3" min="0" placeholder="Ex: 15420">
            <button class="btn-success w-full" onclick="RegistroKmPage.registrarInicial()">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Registrar Km Inicial
            </button>
          </div>
        </div>
      `;
    } else if (status.status === 'aguardando_final') {
      this.conteudoDiv.innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p class="text-green-800">Km inicial de hoje: <strong>${status.registro.kmInicial}</strong>. Falta lançar o km final.</p>
        </div>
        <div class="max-w-xs mx-auto">
          <label class="block text-sm font-medium text-slate-700 mb-1">Km Final *</label>
          <input type="number" id="km-final-input" class="input-field mb-3" min="0" placeholder="Ex: 15465">
          <button class="btn-success w-full" onclick="RegistroKmPage.registrarFinal('${status.registro.data}')">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Registrar Km Final
          </button>
        </div>
      `;
    } else if (status.status === 'pendente_dia_anterior') {
      this.conteudoDiv.innerHTML = `
        <div class="alert alert-warning mb-4">
          Você esqueceu de lançar o km final do dia <strong>${Utils.formatarDataBR(status.registro.data)}</strong> (inicial: ${status.registro.kmInicial}). Complete abaixo antes de registrar o de hoje.
        </div>
        <div class="max-w-xs mx-auto">
          <label class="block text-sm font-medium text-slate-700 mb-1">Km Final de ${Utils.formatarDataBR(status.registro.data)} *</label>
          <input type="number" id="km-final-input" class="input-field mb-3" min="0">
          <button class="btn-success w-full" onclick="RegistroKmPage.registrarFinal('${status.registro.data}')">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Registrar Km Final
          </button>
        </div>
      `;
    } else { // completo
      this.conteudoDiv.innerHTML = `
        <div class="alert alert-success mb-4">
          Registro de hoje completo: Km Inicial ${status.registro.kmInicial}, Km Final ${status.registro.kmFinal}
          — total rodado: <strong>${status.registro.kmRodado} km</strong>.
        </div>
      `;
    }
  },
  
  async registrarInicial() {
    const valor = document.getElementById('km-inicial-input')?.value;
    if (!valor) {
      Components.Toast.warning('Informe o km inicial');
      return;
    }
    
    Loading.show('Registrando...');
    
    try {
      const result = await API.registrarKmInicial(parseInt(valor));
      if (result.success) {
        Components.Toast.success('Km inicial registrado!');
        this.carregar();
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro: ' + error.message);
    } finally {
      Loading.hide();
    }
  },
  
  async registrarFinal(dataRegistroBR) {
    const valor = document.getElementById('km-final-input')?.value;
    if (!valor) {
      Components.Toast.warning('Informe o km final');
      return;
    }
    
    Loading.show('Registrando...');
    
    try {
      const result = await API.registrarKmFinal(parseInt(valor), dataRegistroBR);
      if (result.success) {
        Components.Toast.success('Km final registrado! Rodados: ' + result.kmRodado + ' km');
        this.carregar();
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro: ' + error.message);
    } finally {
      Loading.hide();
    }
  },
  
  async carregarHistorico() {
    try {
      const result = await API.historicoKm();
      if (result.success) {
        this.historicoKm = result.data || [];
        this.renderizarHistorico();
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  },
  
  renderizarHistorico() {
    if (!this.historicoTbody) return;
    
    if (!this.historicoKm || this.historicoKm.length === 0) {
      this.historicoTbody.innerHTML = '<tr><td colspan="2" class="text-center text-slate-500 py-4">Nenhum registro ainda.</td></tr>';
      return;
    }
    
    // Mostra últimos 10
    this.historicoTbody.innerHTML = this.historicoKm
      .slice()
      .reverse()
      .slice(0, 10)
      .map(r => `
        <tr>
          <td>${Utils.formatarDataBR(r.data)}</td>
          <td class="font-medium">${Utils.formatarNumero(r.km_rodado)} km</td>
        </tr>
      `).join('');
  },
  
  renderizarTotal() {
    if (!this.totalKmDiv) return;
    
    const diasFiltro = parseInt(this.periodoSelect?.value) || 30;
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    const filtrados = this.historicoKm.filter(r => {
      if (diasFiltro === 0) return true;
      const partes = (r.data || '').split('/');
      if (partes.length !== 3) return false;
      const dataRegistro = new Date(partes[2], partes[1] - 1, partes[0]);
      const diff = (hoje - dataRegistro) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= diasFiltro;
    });
    
    const total = filtrados.reduce((s, r) => s + Number(r.km_rodado || 0), 0);
    const rotulos = { 1: 'hoje', 7: 'na última semana', 15: 'na última quinzena', 30: 'no último mês', 365: 'no último ano', 0: 'no total' };
    
    if (this.totalKmDiv) {
      this.totalKmDiv.innerText = 
        `${Utils.formatarNumero(total)} km rodados ${rotulos[diasFiltro] || ''} (${filtrados.length} dia(s) registrado(s)).`;
    }
  }
};

// RegistroKmPage.init() é chamado pelo App (app.js) quando a tela é
// aberta, não aqui — os elementos desta tela ainda não existem no HTML
// (esta tela está pendente de construção).
window.RegistroKmPage = RegistroKmPage;
