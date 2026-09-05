// ============================================================
// MARKCARRO - GESTOR PAGE
// ============================================================

const GestorPage = {
  condutores: [],
  solicitacoes: [],
  filtroDataSolic: null,
  filtroDataViagem: null,
  filtroStatus: null,
  
  init() {
    this.filtroDataSolic = document.getElementById('filtro-gestor-data-solic');
    this.filtroDataViagem = document.getElementById('filtro-gestor-data-viagem');
    this.filtroStatus = document.getElementById('filtro-gestor-status');
    
    this.bindEvents();
    this.carregar();
  },
  
  bindEvents() {
    this.filtroDataSolic?.addEventListener('change', () => this.aplicarFiltros());
    this.filtroDataViagem?.addEventListener('change', () => this.aplicarFiltros());
    this.filtroStatus?.addEventListener('change', () => this.aplicarFiltros());
    
    document.getElementById('btn-exportar-xlsx')?.addEventListener('click', () => this.exportarXlsx());
    document.getElementById('btn-atualizar-gestor')?.addEventListener('click', () => this.carregar());
  },
  
  async carregar() {
    Components.Loading.show('Carregando painel...');
    
    try {
      const result = await API.painelGestor();
      if (result.success) {
        this.condutores = result.data?.condutores || [];
        this.solicitacoes = result.data?.solicitacoes || [];
        this.aplicarFiltros();
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro ao carregar: ' + error.message);
    } finally {
      Components.Loading.hide();
    }
  },
  
  aplicarFiltros() {
    const fSolic = this.filtroDataSolic?.value;
    const fViag = this.filtroDataViagem?.value;
    const fStatus = this.filtroStatus?.value;
    
    const fSolicBR = Utils.formatarDataBR(fSolic);
    const fViagBR = Utils.formatarDataBR(fViag);
    
    let filtradas = this.solicitacoes.filter(s => {
      const bSolic = !fSolicBR || s.data_solicitacao === fSolicBR;
      const bViag = !fViagBR || s.data_viagem === fViagBR;
      const bStatus = fStatus === 'TODOS' || s.status === fStatus;
      return bSolic && bViag && bStatus;
    });
    
    this.renderizarTabela(filtradas);
  },
  
  limparFiltros() {
    this.filtroDataSolic.value = '';
    this.filtroDataViagem.value = '';
    this.filtroStatus.value = 'TODOS';
    this.aplicarFiltros();
  },
  
  renderizarTabela(lista) {
    const tbody = document.getElementById('tb-gestor-geral');
    if (!tbody) return;
    
    if (!lista || lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="16" class="text-center text-slate-500 p-4">Nenhum registro encontrado.</td></tr>';
      return;
    }
    
    // Prepara options de condutores
    const optCondutoresIda = this.condutores.map(c => 
      `<option value="${c.id}">${c.codigo}</option>`
    ).join('');
    
    const optCondutoresVolta = ['<option value="">(mesmo da ida / nenhum)</option>'] + 
      this.condutores.map(c => `<option value="${c.id}">${c.codigo}</option>`).join('');
    
    tbody.innerHTML = lista.map(s => {
      const dtViagISO = Utils.formatarDataISO(s.data_viagem);
      const sId = s.id;
      
      return `
        <tr>
          <td class="text-center text-sm">${s.data_solicitacao}</td>
          <td><input type="date" id="g_dataViag_${sId}" class="input-field text-xs" value="${Utils.formatarDataISO(s.data_viagem)}"></td>
          <td><input type="time" id="g_horaSaida_${sId}" class="input-field text-xs" value="${s.hora_saida}"></td>
          <td><input type="time" id="g_horaRetorno_${sId}" class="input-field text-xs" value="${s.hora_retorno}"></td>

          <td>
            <select id="g_origem_${sId}" class="input-field text-xs mb-1" onchange="GestorPage.alternarBoxLocal('g_origem_${sId}', 'g_boxOrigem_${sId}')"></select>
            <input type="text" id="g_boxOrigem_${sId}" class="input-field text-xs hidden" value="${s.origem}">
          </td>

          <td>
            <select id="g_destino_${sId}" class="input-field text-xs mb-1" onchange="GestorPage.alternarBoxLocal('g_destino_${sId}', 'g_boxDestino_${sId}')"></select>
            <input type="text" id="g_boxDestino_${sId}" class="input-field text-xs hidden" value="${s.destino}">
          </td>

          <td><small>${s.solicitante_nome || s.email_solicitante}</small></td>
          <td><small>${s.unidade}</small></td>
          <td><small>${s.setor}</small></td>
          <td><input type="text" id="g_just_${sId}" class="input-field text-xs" value="${s.justificativa}"></td>

          <td>
            <select id="g_tipo_${sId}" class="input-field text-xs">
              <option value="Motorista" ${s.tipo_viagem === 'Motorista' ? 'selected' : ''}>Motorista</option>
              <option value="Motoboy" ${s.tipo_viagem === 'Motoboy' ? 'selected' : ''}>Motoboy</option>
            </select>
          </td>

          <td><input type="number" id="g_qtd_${sId}" class="input-field text-xs w-20" value="${s.qtd}"></td>
          <td class="text-center"><span class="badge ${Utils.corStatus(s.status)}">${s.status}</span></td>

          <td>
            <select id="g_condutor_${sId}" class="input-field text-xs">
              <option value="">Selecione...</option>
              ${optCondutoresIda}
            </select>
          </td>

          <td>
            <select id="g_condutorVolta_${sId}" class="input-field text-xs">
              <option value="">(mesmo da ida / nenhum)</option>
              ${optCondutoresVolta}
            </select>
          </td>

          <td>
            <div class="d-flex flex-column gap-1">
              <button class="btn-primary text-xs py-1 px-2" onclick="GestorPage.salvar('${sId}', 'salvar')">💾 Salvar</button>
              <button class="btn-success text-xs py-1 px-2" onclick="GestorPage.salvar('${sId}', 'confirmar')">✓ Confirmar</button>
              <button class="btn-secondary text-xs py-1 px-2" onclick="GestorPage.salvar('${sId}', 'ocupado')">🚫 Ocupado</button>
              <button class="btn-danger text-xs py-1 px-2" onclick="GestorPage.salvar('${sId}', 'cancelar')">✕ Cancelar</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    // Preenche dropdowns de origem/destino
    setTimeout(() => {
      lista.forEach(s => {
        const sId = s.id;
        const selO = document.getElementById(`g_origem_${sId}`);
        const selD = document.getElementById(`g_destino_${sId}`);
        if (selO) {
          this.preencherLocaisSelect(selO, s.origem);
          this.alternarBoxLocal(`g_origem_${sId}`, `g_boxOrigem_${sId}`);
        }
        if (selD) {
          this.preencherLocaisSelect(selD, s.destino);
          this.alternarBoxLocal(`g_destino_${sId}`, `g_boxDestino_${sId}`);
        }
      });
    }, 50);
  },
  
  preencherLocaisSelect(select, valorAtual) {
    // Carrega locais do cache ou da API
    // Por enquanto usa os valores conhecidos
    const locais = [...new Set(this.solicitacoes.flatMap(s => [s.origem, s.destino]).filter(Boolean))];
    select.innerHTML = '<option value="">Selecione...</option>';
    locais.forEach(l => {
      const sel = (l === valorAtual) ? 'selected' : '';
      select.innerHTML += `<option value="${l}" ${sel}>${l}</option>`;
    });
    select.innerHTML += '<option value="Outro">Outro local</option>';
  },
  
  alternarBoxLocal(selectId, boxId) {
    const sel = document.getElementById(selectId);
    const box = document.getElementById(boxId);
    if (!sel || !box) return;
    if (sel.value === 'Outro') {
      box.classList.remove('hidden');
      box.focus();
    } else {
      box.classList.add('hidden');
    }
  },
  
  async salvar(id, acao) {
    const valOrig = document.getElementById(`g_origem_${id}`)?.value;
    const valOrigFinal = valOrig === 'Outro' ? document.getElementById(`g_boxOrigem_${id}`)?.value : valOrig;
    
    const valDest = document.getElementById(`g_destino_${id}`)?.value;
    const valDestFinal = valDest === 'Outro' ? document.getElementById(`g_boxDestino_${id}`)?.value : valDest;
    
    const dados = {
      id,
      data_viagem: document.getElementById(`g_dataViag_${id}`)?.value,
      hora_saida: document.getElementById(`g_horaSaida_${id}`)?.value,
      hora_retorno: document.getElementById(`g_horaRetorno_${id}`)?.value,
      origem: valOrigFinal,
      destino: valDestFinal,
      justificativa: document.getElementById(`g_just_${id}`)?.value,
      tipo_viagem: document.getElementById(`g_tipo_${id}`)?.value,
      qtd: document.getElementById(`g_qtd_${id}`)?.value,
      condutor_ida_id: document.getElementById(`g_condutor_${id}`)?.value || null,
      condutor_volta_id: document.getElementById(`g_condutorVolta_${id}`)?.value || null,
      acao
    };
    
    if (acao === 'confirmar' && !dados.condutor_ida_id) {
      Components.Toast.warning('Selecione ao menos o condutor de ida');
      return;
    }
    
    Components.Loading.show('Salvando...');
    
    try {
      const result = await API.atualizarSolicitacaoGestor(dados);
      if (result.success) {
        Components.Toast.success('Alterações salvas!');
        this.carregar();
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro: ' + error.message);
    } finally {
      Components.Loading.hide();
    }
  },
  
  async exportarXlsx() {
    const btn = document.getElementById('btn-exportar-xlsx');
    const textoOriginal = btn?.innerText;
    
    if (btn) {
      btn.disabled = true;
      btn.innerText = '⏳ Gerando...';
    }
    
    try {
      const result = await API.exportarXlsx();
      if (result.success && result.data?.base64) {
        Utils.downloadBase64(result.data.base64, result.data.filename || 'MarkCarro_Solicitacoes.xlsx');
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

// GestorPage.init() é chamado pelo App (app.js) quando a tela é aberta
// (carregarTelaInicial para o gestor, ou abrirPainelGestor()), não aqui —
// os elementos desta tela só existem dentro de #tela-gestor, que fica
// oculta até o usuário logar.
window.GestorPage = GestorPage;