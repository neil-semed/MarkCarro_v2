// ============================================================
// MARKCARRO - GERENCIAR CONDUTORES PAGE (Gestor)
// ============================================================

const GerenciarCondutoresPage = {
  tbody: null,
  form: null,
  emailOriginalInput: null,
  tituloForm: null,
  btnCancelar: null,
  
  init() {
    this.tbody = document.getElementById('tb-condutores');
    this.form = document.getElementById('form-condutor');
    this.emailOriginalInput = document.getElementById('cond-email-original');
    this.tituloForm = document.getElementById('titulo-form-condutor');
    this.btnCancelar = document.getElementById('btn-cancelar-edicao-condutor');
    
    this.bindEvents();
    this.carregar();
  },
  
  bindEvents() {
    this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
    this.btnCancelar?.addEventListener('click', () => this.limparForm());
    
    // Máscaras
    document.getElementById('cond-telefone')?.addEventListener('input', (e) => 
      Utils.aplicarMascaraTelefone(e.target));
    document.getElementById('cond-placa')?.addEventListener('input', (e) => 
      Utils.aplicarMascaraPlaca(e.target));
  },
  
  async carregar() {
    try {
      const result = await API.listarCondutoresGestor();
      if (result.success) {
        this.renderizarLista(result.data);
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro ao carregar: ' + error.message);
    }
  },
  
  renderizarLista(lista) {
    if (!this.tbody) return;
    
    if (!lista || lista.length === 0) {
      this.tbody.innerHTML = '<tr><td colspan="10" class="text-center text-slate-500 py-4">Nenhum condutor cadastrado.</td></tr>';
      return;
    }
    
    this.tbody.innerHTML = lista.map(c => `
      <tr class="hover:bg-slate-50">
        <td class="font-medium">${c.nome}</td>
        <td><small class="text-slate-500">${c.email}</small></td>
        <td>${c.telefone || '-'}</td>
        <td>${c.categoria || '-'}</td>
        <td>${c.placa || '-'}</td>
        <td>${c.modelo || '-'}</td>
        <td>${c.capacidade || '-'}</td>
        <td>${c.cnh || '-'}</td>
        <td>${Utils.formatarDataBR(c.validade_cnh)}</td>
        <td>
          <button class="btn-outline text-xs px-2 py-1" onclick='GerenciarCondutoresPage.editar(${JSON.stringify(c).replace(/'/g, "&apos;")})'>
            Editar
          </button>
        </td>
      </tr>
    `).join('');
  },
  
  editar(condutor) {
    this.emailOriginalInput.value = condutor.email;
    document.getElementById('cond-nome').value = condutor.nome || '';
    document.getElementById('cond-email').value = condutor.email || '';
    document.getElementById('cond-email').readOnly = true;
    document.getElementById('cond-senha').value = '';
    document.getElementById('cond-telefone').value = condutor.telefone || '';
    document.getElementById('cond-categoria').value = condutor.categoria || 'Motorista';
    document.getElementById('cond-placa').value = condutor.placa || '';
    document.getElementById('cond-modelo').value = condutor.modelo || '';
    document.getElementById('cond-capacidade').value = condutor.capacidade || '';
    document.getElementById('cond-cnh').value = condutor.cnh || '';
    document.getElementById('cond-validade-cnh').value = Utils.formatarDataISO(condutor.validade_cnh || '');
    
    this.tituloForm.textContent = 'Editando: ' + condutor.nome;
    this.btnCancelar.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  
  limparForm() {
    this.form?.reset();
    this.emailOriginalInput.value = '';
    document.getElementById('cond-email').readOnly = false;
    this.tituloForm.textContent = 'Novo Condutor';
    this.btnCancelar?.classList.add('hidden');
  },
  
  async handleSubmit(e) {
    e.preventDefault();
    
    const dados = {
      email: document.getElementById('cond-email').value.trim(),
      nome: document.getElementById('cond-nome').value.trim(),
      senha: document.getElementById('cond-senha').value,
      telefone: document.getElementById('cond-telefone')?.value?.replace(/\D/g, '') || '',
      categoria: document.getElementById('cond-categoria')?.value,
      placa: document.getElementById('cond-placa')?.value?.toUpperCase() || '',
      modelo: document.getElementById('cond-modelo')?.value || '',
      capacidade: document.getElementById('cond-capacidade')?.value || '',
      cnh: document.getElementById('cond-cnh')?.value || '',
      validadeCnh: Utils.formatarDataISO(document.getElementById('cond-validade-cnh')?.value || '')
    };
    
    if (!dados.nome || !dados.email || !dados.categoria) {
      Components.Toast.warning('Nome, e-mail e categoria são obrigatórios');
      return;
    }
    
    const emailOriginal = this.emailOriginalInput.value;
    const isEdit = !!emailOriginal;
    
    if (isEdit) {
      dados.email = emailOriginal; // Mantém o e-mail original
    } else {
      if (!dados.senha) {
        Components.Toast.warning('Defina uma senha para o novo condutor');
        return;
      }
    }
    
    Loading.show('Salvando...');
    
    try {
      const result = await API.salvarCondutorGestor(dados);
      
      if (result.success) {
        Components.Toast.success(result.data?.message || (isEdit ? 'Condutor atualizado!' : 'Condutor cadastrado!'));
        this.limparForm();
        this.carregar();
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro: ' + error.message);
    } finally {
      Loading.hide();
    }
  }
};

// GerenciarCondutoresPage.init() é chamado pelo App (app.js) quando a tela é
// aberta, não aqui — os elementos desta tela ainda não existem no HTML
// (esta tela está pendente de construção).
window.GerenciarCondutoresPage = GerenciarCondutoresPage;
