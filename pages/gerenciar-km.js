// ============================================================
// MARKCARRO - GERENCIAR KM PAGE (Gestor)
// ============================================================

const GerenciarKmPage = {
  tbody: null,
  form: null,
  condutorSelect: null,
  chart: null,
  registros: [],
  condutores: [],
  
  init() {
    this.tbody = document.getElementById('tb-registros-km-gestor');
    this.form = document.getElementById('form-km-gestor');
    this.condutorSelect = document.getElementById('km-gestor-condutor');
    
    this.bindEvents();
    this.carregar();
  },
  
  bindEvents() {
    this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
    document.getElementById('km-grafico-categoria')?.addEventListener('change', () => this.renderizarGrafico());
    document.getElementById('km-grafico-periodo')?.addEventListener('change', () => this.renderizarGrafico());
  },
  
  async carregar() {
    await Promise.all([
      this.carregarCondutores(),
      this.carregarRegistros()
    ]);
  },
  
  async carregarCondutores() {
    try {
      const result = await API.listarCondutores();
      if (result.success) {
        this.condutores = result.data || [];
        this.preencherCondutorSelect();
      }
    } catch (error) {
      console.error('Erro ao carregar condutores:', error);
    }
  },
  
  preencherCondutorSelect() {
    if (!this.condutorSelect) return;
    this.condutorSelect.innerHTML = '<option value="">Selecione...</option>';
    this.condutores.forEach(c => {
      this.condutorSelect.innerHTML += `<option value="${c.email}">${c.codigo}</option>`;
    });
  },
  
  async carregarRegistros() {
    try {
      const result = await API.listarKmGestor();
      if (result.success) {
        this.registros = result.data || [];
        this.renderizarTabela();
        this.renderizarGrafico();
      }
    } catch (error) {
      console.error('Erro ao carregar registros KM:', error);
    }
  },
  
  renderizarTabela() {
    const tbody = document.getElementById('tb-registros-km-gestor');
    if (!tbody) return;
    
    if (!this.registros || this.registros.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-slate-500 py-4">Nenhum registro ainda.</td></tr>';
      return;
    }
    
    tbody.innerHTML = this.registros.map(r => {
      const dadosJson = JSON.stringify(r).replace(/'/g, "&apos;");
      return `
        <tr class="hover:bg-slate-50">
          <td>${Utils.formatarDataBR(r.data)}</td>
          <td>${r.condutor_codigo || r.condutor_email}</td>
          <td class="font-mono">${Utils.formatarNumero(r.km_inicial)}</td>
          <td>${r.km_final ? Utils.formatarNumero(r.km_final) : '-'}</td>
          <td class="font-medium">${r.km_rodado ? Utils.formatarNumero(r.km_rodado) + ' km' : '-'}</td>
          <td class="text-center">${r.ajustado === 'Sim' || r.ajustado === true ? '✓' : ''}</td>
          <td>
            <button class="btn-outline text-xs px-2 py-1" onclick='GerenciarKmPage.editar("${JSON.stringify(r).replace(/"/g, '"')}")'>Editar</button>
          </td>
        </tr>
      `;
    }).join('');
  },
  
  async handleSubmit(e) {
    e.preventDefault();
    
    const emailCondutor = document.getElementById('km-gestor-condutor')?.value;
    const dataBR = document.getElementById('km-gestor-data')?.value;
    const kmInicial = document.getElementById('km-gestor-inicial')?.value;
    const kmFinal = document.getElementById('km-gestor-final')?.value;
    
    if (!emailCondutor || !dataBR || kmInicial === '') {
      Components.Toast.warning('Preencha Condutor, Data e Km Inicial');
      return;
    }
    
    const kmFinalNum = kmFinal ? parseInt(kmFinal) : null;
    const kmInicialNum = parseInt(kmInicial);
    
    if (kmFinalNum !== null && kmFinalNum < kmInicialNum) {
      Components.Toast.warning('Km final não pode ser menor que o inicial');
      return;
    }
    
    Loading.show('Salvando...');
    
    try {
      const result = await API.salvarKmGestor({
        emailCondutor,
        dataBR,
        kmInicial: kmInicialNum,
        kmFinal: kmFinalNum
      });
      
      if (result.success) {
        Components.Toast.success('Registro salvo!');
        this.form?.reset();
        this.carregarRegistros();
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro: ' + error.message);
    } finally {
      Loading.hide();
    }
  },
  
  editar(registroJson) {
    try {
      const r = JSON.parse(registroJson);
      this.condutorSelect.value = r.email_condutor;
      document.getElementById('km-gestor-data').value = Utils.formatarDataISO(r.data);
      document.getElementById('km-gestor-inicial').value = r.km_inicial;
      document.getElementById('km-gestor-final').value = r.km_final || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Erro ao editar:', error);
    }
  },
  
  async renderizarGrafico() {
    const categoria = document.getElementById('km-grafico-categoria')?.value;
    const periodo = parseInt(document.getElementById('km-grafico-periodo')?.value) || 30;
    
    try {
      const result = await API.graficoKm(categoria, periodo);
      if (result.success) {
        this.renderizarChart(result.data.labels, result.data.valores);
      }
    } catch (error) {
      console.error('Erro ao renderizar gráfico:', error);
    }
  },
  
  renderizarChart(labels, valores) {
    const ctx = document.getElementById('grafico-km-canvas')?.getContext('2d');
    if (!ctx) return;
    
    if (this.chart) this.chart.destroy();
    
    if (!labels || labels.length === 0) return;
    
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Km Rodado',
          data: valores,
          backgroundColor: '#044AAA',
          borderRadius: 6
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
};

// GerenciarKmPage.init() é chamado pelo App (app.js) quando a tela é
// aberta, não aqui — os elementos desta tela ainda não existem no HTML
// (esta tela está pendente de construção).
window.GerenciarKmPage = GerenciarKmPage;
