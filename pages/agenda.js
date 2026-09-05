// ============================================================
// MARKCARRO - AGENDA PAGE (Gestor)
// ============================================================

const AgendaPage = {
  tbody: null,
  dataInicioInput: null,
  dataFimInput: null,
  btnEnviarEmail: null,
  
  init() {
    this.tbody = document.getElementById('tb-agenda-body');
    this.dataInicioInput = document.getElementById('agenda-data-inicio');
    this.dataFimInput = document.getElementById('agenda-data-fim');
    this.btnEnviarEmail = document.getElementById('btn-enviar-agenda-email');
    
    this.bindEvents();
    this.carregar();
  },
  
  bindEvents() {
    this.dataInicioInput.addEventListener('change', () => this.carregar());
    this.dataFimInput.addEventListener('change', () => this.carregar());
    document.getElementById('btn-enviar-agenda-email')?.addEventListener('click', () => this.enviarEmail());
    
    // Define datas padrão (hoje + 7 dias)
    if (!this.dataInicioInput.value) {
      this.dataInicioInput.value = new Date().toISOString().split('T')[0];
    }
    if (!this.dataFimInput.value) {
      const fim = new Date();
      fim.setDate(fim.getDate() + 7);
      this.dataFimInput.value = fim.toISOString().split('T')[0];
    }
  },
  
  async carregar() {
    const dtIni = this.dataInicioInput.value;
    const dtFim = this.dataFimInput.value;
    
    if (!dtIni || !dtFim) return;
    
    Components.Loading.show('Carregando agenda...');
    
    try {
      const result = await API.agendaGestor(
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
      this.tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-500 py-8">Nenhuma corrida na agenda para este período.</td></tr>';
      return;
    }
    
    this.tbody.innerHTML = lista.map(c => `
      <tr class="hover:bg-slate-50">
        <td><small class="text-slate-500">${c.id}</small></td>
        <td>${Utils.formatarDataBR(c.data_viagem)}</td>
        <td>${Utils.formatarHoraBR(c.hora_saida)}</td>
        <td>${Utils.formatarHoraBR(c.hora_retorno)}</td>
        <td>${c.origem} <span class="text-slate-400 mx-1">➡️</span> ${c.destino}</td>
        <td>${c.solicitante}</td>
        <td>${c.condutor_codigo || '<i class="text-slate-400">Não atribuído</i>'}</td>
        <td><span class="badge ${Utils.corStatus(c.status)}">${c.status}</span></td>
      </tr>
    `).join('');
  },
  
  async enviarEmail() {
    const dtIni = document.getElementById('agenda-data-inicio').value;
    if (!dtIni) {
      Components.Toast.warning('Escolha a data inicial');
      return;
    }
    
    if (!confirm(`Enviar agenda do dia ${Utils.formatarDataBR(dtIni)} por e-mail?`)) return;
    
    Loading.show('Enviando e-mail...');
    
    try {
      const result = await API.dispararEnvioAgendaEmail(dtIni);
      
      if (result.success) {
        Components.Toast.success(result.message);
      } else {
        Components.Toast.error(result.error || 'Erro ao enviar');
      }
    } catch (error) {
      Components.Toast.error('Erro ao enviar: ' + error.message);
    } finally {
      Loading.hide();
    }
  }
};

// AgendaPage.init() é chamado pelo App (app.js) quando a tela é aberta pelo Gestor.
window.AgendaPage = AgendaPage;