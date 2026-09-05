// ============================================================
// MARKCARRO - AGENDA CONDUTOR PAGE
// ============================================================

const AgendaCondutorPage = {
  tbody: null,
  dataInicioInput: null,
  dataFimInput: null,
  btnLimparFiltro: null,
  
  init() {
    this.tbody = document.getElementById('tb-agenda-condutor');
    this.dataInicioInput = document.getElementById('agenda-condutor-data-inicio');
    this.dataFimInput = document.getElementById('agenda-condutor-data-fim');
    this.btnLimparFiltro = document.getElementById('btn-limpar-filtro-agenda-condutor');
    
    this.bindEvents();
    this.carregar();
  },
  
  bindEvents() {
    this.dataInicioInput.addEventListener('change', () => this.carregar());
    this.dataFimInput.addEventListener('change', () => this.carregar());
    this.btnLimparFiltro?.addEventListener('click', () => this.limparFiltro());
  },
  
  async carregar() {
    const dtIni = this.dataInicioInput.value;
    const dtFim = this.dataFimInput.value;
    
    Components.Loading.show('Carregando agenda...');
    
    try {
      const result = await API.agendaCondutor(
        this.dataInicioInput.value,
        this.dataFimInput.value
      );
      
      if (result.success) {
        this.renderizar(result.data || []);
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro ao carregar: ' + error.message);
    } finally {
      Components.Loading.hide();
    }
  },
  
  renderizar(lista) {
    if (!this.tbody) return;
    
    if (!lista || lista.length === 0) {
      this.tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-500 py-8">Nenhuma corrida encontrada para este filtro.</td></tr>';
      return;
    }
    
    const rotuloPapel = {
      ida: 'Ida',
      volta: 'Volta',
      ida_e_volta: 'Ida e Volta'
    };
    
    this.tbody.innerHTML = lista.map(c => `
      <tr class="hover:bg-slate-50">
        <td>${Utils.formatarDataBR(c.data_viagem)}${c.is_extra ? ' <span class="badge bg-warning text-dark ml-1">Extra</span>' : ''}</td>
        <td>${Utils.formatarHoraBR(c.hora_saida)}</td>
        <td>${Utils.formatarHoraBR(c.hora_retorno)}</td>
        <td>${c.origem} <span class="text-slate-400 mx-1">➡️</span> ${c.destino}</td>
        <td>${c.solicitante}</td>
        <td>${c.celular_solicitante || '-'}</td>
        <td>${rotuloPapel[c.papel] || c.papel}</td>
        <td><span class="badge ${Utils.corStatus(c.status)}">${c.status}</span></td>
      </tr>
    `).join('');
  },
  
  limparFiltro() {
    this.dataInicioInput.value = '';
    this.dataFimInput.value = '';
    this.carregar();
  }
};

// AgendaCondutorPage.init() é chamado pelo App (app.js) quando o Condutor loga.
window.AgendaCondutorPage = AgendaCondutorPage;