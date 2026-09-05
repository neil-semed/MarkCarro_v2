// ============================================================
// MARKCARRO - NOVA SOLICITAÇÃO PAGE
// ============================================================

const NovaSolicitacaoPage = {
  form: null,
  tipoViagemSelect: null,
  qtdLabel: null,
  origemSelect: null,
  destinoSelect: null,
  boxOutroOrigem: null,
  boxOutroDestino: null,
  ehModoGestor: false,
  
  init() {
    this.form = document.getElementById('form-solicitacao');
    this.tipoViagemSelect = document.getElementById('sol-tipo-viagem');
    this.qtdLabel = document.getElementById('lbl-qtd');
    this.origemSelect = document.getElementById('sol-origem');
    this.destinoSelect = document.getElementById('sol-destino');
    this.boxOutroOrigem = document.getElementById('box-outro-origem');
    this.boxOutroDestino = document.getElementById('box-outro-destino');
    
    this.bindEvents();
    this.carregarDadosIniciais();
  },
  
  bindEvents() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.tipoViagemSelect.addEventListener('change', () => this.alternarTipoViagem());
    this.origemSelect.addEventListener('change', () => this.verificarOutroCampo('sol-origem', 'box-outro-origem'));
    this.destinoSelect.addEventListener('change', () => this.verificarOutroCampo('sol-destino', 'box-outro-destino'));
    
    // Data mínima = hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('sol-data-viagem').min = hoje;
    document.getElementById('sol-data-viagem').value = hoje;
  },
  
  async carregarDadosIniciais() {
    // Carrega locais para origem/destino
    try {
      const result = await API.listarLocais();
      if (result.success) {
        this.preencherLocais(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar locais:', error);
    }
    
    // Se for gestor, carrega unidades
    if (API.isGestor()) {
      try {
        const result = await API.listarUnidades();
        if (result.success) {
          this.preencherUnidadesGestor(result.data);
        }
      } catch (error) {
        console.error('Erro ao carregar unidades:', error);
      }
    }
  },
  
  preencherLocais(locais) {
    [this.origemSelect, this.destinoSelect].forEach(select => {
      const valorAtual = select.value;
      select.innerHTML = '<option value="">Selecione...</option>';
      locais.forEach(l => {
        const sel = (l === valorAtual) ? 'selected' : '';
        select.innerHTML += `<option value="${l}" ${sel}>${l}</option>`;
      });
      select.innerHTML += '<option value="Outro">Outro local</option>';
    });
  },
  
  preencherUnidadesGestor(unidades) {
    const select = document.getElementById('sol-unidade');
    select.innerHTML = '<option value="">Selecione a Unidade...</option>';
    unidades.forEach(u => {
      select.innerHTML += `<option value="${u.nome}">${u.nome}</option>`;
    });
    select.innerHTML += '<option value="Outro">Outra Unidade</option>';
    select.disabled = false;
    select.onchange = () => this.carregarSetoresGestor();
  },
  
  async carregarSetoresGestor() {
    const unidade = document.getElementById('sol-unidade').value;
    const selSetor = document.getElementById('sol-setor');
    
    if (!unidade || unidade === 'Outro') {
      selSetor.innerHTML = '<option value="">Selecione a Unidade primeiro</option>';
      selSetor.disabled = false;
      return;
    }
    
    try {
      const result = await API.listarSetores(unidade);
      if (result.success) {
        selSetor.innerHTML = '<option value="">Selecione o Setor...</option>';
        result.data.forEach(s => {
          selSetor.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
        });
        selSetor.innerHTML += '<option value="Outro">Outro Setor</option>';
      }
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  },
  
  alternarTipoViagem() {
    const tipo = this.tipoViagemSelect.value;
    this.qtdLabel.textContent = tipo === 'Motoboy' ? 'Nº Documentos *' : 'Nº Passageiros *';
    document.getElementById('sol-qtd').placeholder = tipo === 'Motoboy' ? 'Número de documentos' : 'Número de passageiros';
  },
  
  verificarOutroCampo(selectId, boxId) {
    const val = document.getElementById(selectId).value;
    const box = document.getElementById(boxId);
    if (val === 'Outro') {
      box.classList.remove('hidden');
      box.querySelector('input').focus();
    } else {
      box.classList.add('hidden');
    }
  },
  
  async handleSubmit(e) {
    e.preventDefault();
    
    // Verifica se é modo gestor
    this.ehModoGestor = !document.getElementById('bloco-solicitante-externo').classList.contains('hidden');
    
    // Validações
    const dataViagem = document.getElementById('sol-data-viagem').value;
    const horaSaida = document.getElementById('sol-hora-saida').value;
    const horaRetorno = document.getElementById('sol-hora-retorno').value;
    const tipoViagem = document.getElementById('sol-tipo-viagem').value;
    const qtd = document.getElementById('sol-qtd').value;
    const justificativa = document.getElementById('sol-justificativa').value.trim();
    
    if (!dataViagem || !horaSaida || !horaRetorno || !qtd || !justificativa) {
      Components.Toast.warning('Preencha todos os campos obrigatórios');
      return;
    }
    
    if (new Date(document.getElementById('sol-data-viagem').value) < new Date().setHours(0,0,0,0)) {
      Components.Toast.warning('A data da viagem não pode ser no passado');
      return;
    }
    
    if (horaSaida >= horaRetorno) {
      Components.Toast.warning('Hora de retorno deve ser posterior à hora de saída');
      return;
    }
    
    let origem = document.getElementById('sol-origem').value;
    if (origem === 'Outro') {
      origem = document.getElementById('box-outro-origem').querySelector('input').value.trim();
      if (!origem) {
        Components.Toast.warning('Informe a origem');
        return;
      }
    }
    
    let destino = document.getElementById('sol-destino').value;
    if (destino === 'Outro') {
      destino = document.getElementById('box-outro-destino').querySelector('input').value.trim();
      if (!destino) {
        Components.Toast.warning('Informe o destino');
        return;
      }
    }
    
    if (this.ehModoGestor) {
      const nomeExterno = document.getElementById('sol-nome-externo').value.trim();
      const unidade = document.getElementById('sol-unidade').value;
      const setor = document.getElementById('sol-setor').value;
      
      if (!nomeExterno) {
        Components.Toast.warning('Informe o nome do solicitante');
        return;
      }
      if (!unidade) {
        Components.Toast.warning('Selecione a unidade');
        return;
      }
      if (!setor) {
        Components.Toast.warning('Selecione o setor');
        return;
      }
    }
    
    // Prepara dados
    const dados = {
      dataViagem: Utils.formatarDataISO(dataViagem),
      horaSaida,
      horaRetorno,
      tipoViagem,
      qtd: parseInt(qtd),
      origem,
      destino,
      justificativa,
      tipoViagem
    };
    
    if (this.ehModoGestor) {
      dados.nomeSolicitanteExterno = document.getElementById('sol-nome-externo').value.trim();
      dados.unidade = document.getElementById('sol-unidade').value;
      dados.setor = document.getElementById('sol-setor').value;
      dados.emailSolicitante = document.getElementById('sol-email-externo').value.trim() || (await API.getUserId());
    }
    
    Loading.show('Enviando solicitação...');
    
    try {
      const result = await API.criarSolicitacao(dados);
      
      if (result.success) {
        Components.Toast.success('Solicitação enviada com sucesso!');
        
        if (this.ehModoGestor) {
          this.resetForm();
        } else {
          this.form.reset();
          document.getElementById('sol-unidade').value = API.getUsuario()?.unidade || '';
          document.getElementById('sol-setor').value = API.getUsuario()?.setor || '';
          this.alternarTipoViagem();
          // Atualiza lista
          if (window.MinhasSolicitacoesPage) {
            window.MinhasSolicitacoesPage.carregar();
          }
        }
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro ao enviar: ' + error.message);
    } finally {
      Loading.hide();
    }
  },
  
  resetForm() {
    this.form.reset();
    document.getElementById('sol-nome-externo').value = '';
    document.getElementById('sol-email-externo').value = '';
    document.getElementById('sol-unidade').value = '';
    document.getElementById('sol-setor').innerHTML = '<option value="">Selecione a Unidade primeiro</option>';
    this.alternarTipoViagem();
    this.boxOutroOrigem.classList.add('hidden');
    this.boxOutroDestino.classList.add('hidden');
  }
};

// NovaSolicitacaoPage.init() é chamado pelo App (app.js) quando a tela é aberta,
// não aqui — os elementos desta tela só existem dentro de #tela-nova-solicitacao,
// que fica oculta até o usuário logar e navegar até ela.
window.NovaSolicitacaoPage = NovaSolicitacaoPage;