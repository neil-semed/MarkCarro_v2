// ============================================================
// MARKCARRO - GERENCIAR USUÁRIOS PAGE (Gestor)
// ============================================================

const GerenciarUsuariosPage = {
  tbody: null,
  form: null,
  emailOriginalInput: null,
  tituloForm: null,
  btnCancelar: null,
  unidadeSelect: null,
  setorSelect: null,
  
  init() {
    this.tbody = document.getElementById('tb-usuarios');
    this.form = document.getElementById('form-usuario');
    this.emailOriginalInput = document.getElementById('usr-email-original');
    this.tituloForm = document.getElementById('titulo-form-usuario');
    this.btnCancelar = document.getElementById('btn-cancelar-edicao-usuario');
    this.unidadeSelect = document.getElementById('usr-unidade');
    this.setorSelect = document.getElementById('usr-setor');
    
    this.bindEvents();
    this.carregar();
  },
  
  bindEvents() {
    this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
    this.btnCancelar?.addEventListener('click', () => this.limparForm());
    this.unidadeSelect?.addEventListener('change', () => this.carregarSetores());
    
    document.getElementById('usr-telefone')?.addEventListener('input', (e) => 
      Utils.aplicarMascaraTelefone(e.target));
  },
  
  async carregar() {
    await Promise.all([
      this.carregarUnidades(),
      this.carregarLista()
    ]);
  },
  
  async carregarUnidades() {
    try {
      const result = await API.listarUnidades();
      if (result.success) {
        this.unidadeSelect.innerHTML = '<option value="">Selecione a Unidade...</option>';
        result.data.forEach(u => {
          this.unidadeSelect.innerHTML += `<option value="${u.nome}">${u.nome}</option>`;
        });
      }
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    }
  },
  
  async carregarSetores() {
    const unidade = this.unidadeSelect?.value;
    if (!unidade) {
      this.setorSelect.innerHTML = '<option value="">Selecione a Unidade primeiro</option>';
      return;
    }
    
    try {
      const result = await API.listarSetores(unidade);
      if (result.success) {
        this.setorSelect.innerHTML = '<option value="">Selecione o Setor...</option>';
        result.data.forEach(s => {
          this.setorSelect.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
        });
      }
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  },
  
  async carregarLista() {
    try {
      const result = await API.listarUsuarios();
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
      this.tbody.innerHTML = '<tr><td colspan="6" class="text-center text-slate-500 py-4">Nenhum usuário cadastrado.</td></tr>';
      return;
    }
    
    this.tbody.innerHTML = lista.map(u => `
      <tr class="hover:bg-slate-50">
        <td class="font-medium">${u.nome}</td>
        <td><small class="text-slate-500">${u.email}</small></td>
        <td>${u.telefone || '-'}</td>
        <td>${u.unidade || '-'}</td>
        <td>${u.setor || '-'}</td>
        <td>
          <button class="btn-outline text-xs px-2 py-1" onclick='GerenciarUsuariosPage.editar(${JSON.stringify(u).replace(/'/g, "&apos;")})'>
            Editar
          </button>
        </td>
      </tr>
    `).join('');
  },
  
  editar(usuario) {
    this.emailOriginalInput.value = usuario.email;
    document.getElementById('usr-nome').value = usuario.nome || '';
    document.getElementById('usr-email').value = usuario.email || '';
    document.getElementById('usr-email').readOnly = true;
    document.getElementById('usr-senha').value = '';
    document.getElementById('usr-telefone').value = usuario.telefone || '';
    this.unidadeSelect.value = usuario.unidade || '';
    this.carregarSetores().then(() => {
      this.setorSelect.value = usuario.setor || '';
    });
    this.tituloForm.textContent = 'Editando: ' + usuario.nome;
    this.btnCancelar.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  
  limparForm() {
    this.form?.reset();
    this.emailOriginalInput.value = '';
    document.getElementById('usr-email').readOnly = false;
    this.unidadeSelect.value = '';
    this.setorSelect.innerHTML = '<option value="">Selecione a Unidade primeiro</option>';
    this.tituloForm.textContent = 'Novo Usuário';
    this.btnCancelar?.classList.add('hidden');
  },
  
  async handleSubmit(e) {
    e.preventDefault();
    
    const dados = {
      email: document.getElementById('usr-email').value.trim(),
      nome: document.getElementById('usr-nome').value.trim(),
      senha: document.getElementById('usr-senha')?.value,
      telefone: document.getElementById('usr-telefone')?.value?.replace(/\D/g, '') || '',
      unidade: this.unidadeSelect?.value,
      setor: this.setorSelect?.value
    };
    
    if (!dados.nome || !dados.email || !dados.unidade || !dados.setor) {
      Components.Toast.warning('Nome, e-mail, Unidade e Setor são obrigatórios');
      return;
    }
    
    if (!Utils.validarEmail(dados.email)) {
      Components.Toast.warning('E-mail inválido');
      return;
    }
    
    const emailOriginal = this.emailOriginalInput.value;
    const isEdit = !!emailOriginal;
    
    if (isEdit) {
      dados.email = emailOriginal; // Mantém o e-mail original
    } else {
      if (!dados.senha) {
        Components.Toast.warning('Defina uma senha para o novo usuário');
        return;
      }
    }
    
    Loading.show('Salvando...');
    
    try {
      const result = await API.salvarUsuario(dados);
      
      if (result.success) {
        Components.Toast.success(result.data?.message || (isEdit ? 'Usuário atualizado!' : 'Usuário cadastrado!'));
        this.limparForm();
        this.carregarLista();
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

document.addEventListener('DOMContentLoaded', () => {
  GerenciarUsuariosPage.init();
});

window.GerenciarUsuariosPage = GerenciarUsuariosPage;