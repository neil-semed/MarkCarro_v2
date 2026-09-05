// ============================================================
// MARKCARRO - API WRAPPER
// Camada de abstração sobre supabaseApi para facilitar uso nas páginas
// ============================================================

const API = {
  // ==================== AUTENTICAÇÃO ====================
  
  async login(email, senha) {
    try {
      const data = await window.supabaseApi.signIn(email, senha);
      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async logout() {
    try {
      await window.supabaseApi.signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async alterarSenha(senhaAtual, novaSenha) {
    try {
      await window.supabaseApi.updatePassword(novaSenha);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // ==================== PERFIL ====================
  
  getUsuario() {
    return window.supabaseApi.getProfile();
  },
  
  getUserId() {
    return window.supabaseApi.getUserId();
  },
  
  isGestor() {
    return window.supabaseApi.isGestor();
  },
  
  isCondutor() {
    return window.supabaseApi.isCondutor();
  },
  
  isSolicitante() {
    return window.supabaseApi.isSolicitante();
  },
  
  async atualizarPerfil(dados) {
    try {
      const profile = await window.supabaseApi.updateProfile(dados);
      return { success: true, profile };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // ==================== SOLICITAÇÕES ====================
  
  async criarSolicitacao(dados) {
    try {
      const result = await window.supabaseApi.criarSolicitacao(dados);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async buscarMinhasSolicitacoes() {
    try {
      const data = await window.supabaseApi.buscarMinhasSolicitacoes();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async cancelarSolicitacao(id) {
    try {
      const result = await window.supabaseApi.cancelarSolicitacao(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // ==================== CONDUTORES ====================
  
  async listarCondutores(categoria = null) {
    try {
      const data = await window.supabaseApi.listarCondutores(categoria);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async buscarAvisosCnh(dias = 30) {
    try {
      const data = await window.supabaseApi.buscarAvisosCnh(dias);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  // ==================== KM ====================
  
  async statusKmHoje() {
    try {
      const data = await window.supabaseApi.statusKmHoje();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async registrarKmInicial(kmInicial) {
    try {
      const result = await window.supabaseApi.registrarKmInicial(kmInicial);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async registrarKmFinal(kmFinal, dataRegistro = null) {
    try {
      const result = await window.supabaseApi.registrarKmFinal(kmFinal, dataRegistro);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async historicoKm() {
    try {
      const data = await window.supabaseApi.historicoKm();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async dashboardKm() {
    try {
      const data = await window.supabaseApi.dashboardKm();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // ==================== NOTIFICAÇÕES ====================
  
  async buscarNotificacoes() {
    try {
      const data = await window.supabaseApi.buscarNotificacoes();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async contarNaoLidas() {
    try {
      const count = await window.supabaseApi.contarNaoLidas();
      return { success: true, count };
    } catch (error) {
      return { success: false, error: error.message, count: 0 };
    }
  },
  
  async marcarComoLidas() {
    try {
      await window.supabaseApi.marcarComoLidas();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // ==================== GESTOR ====================
  
  async painelGestor() {
    try {
      const data = await window.supabaseApi.painelGestor();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async atualizarSolicitacaoGestor(dados) {
    try {
      const result = await window.supabaseApi.atualizarSolicitacaoGestor(dados);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async agendaGestor(dataInicio, dataFim) {
    try {
      const data = await window.supabaseApi.agendaGestor(dataInicio, dataFim);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async exportarXlsx() {
    try {
      const data = await window.supabaseApi.exportarXlsx();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  // ==================== USUÁRIOS (GESTOR) ====================
  
  async listarUsuarios() {
    try {
      const data = await window.supabaseApi.listarUsuarios();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async salvarUsuario(dados) {
    try {
      const result = await window.supabaseApi.salvarUsuario(dados);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // ==================== CONDUTORES (GESTOR) ====================
  
  async listarCondutoresGestor() {
    try {
      const data = await window.supabaseApi.listarCondutoresGestor();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async salvarCondutorGestor(dados) {
    try {
      const result = await window.supabaseApi.salvarCondutorGestor(dados);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // ==================== KM GESTOR ====================
  
  async listarKmGestor() {
    try {
      const data = await window.supabaseApi.listarKmGestor();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async salvarKmGestor(dados) {
    try {
      const result = await window.supabaseApi.salvarKmGestor(dados);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async graficoKm(categoria, periodo) {
    try {
      const data = await window.supabaseApi.graficoKm(categoria, periodo);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // ==================== AGENDA ====================

  async dispararEnvioAgendaEmail(dataISO) {
    try {
      const result = await window.supabaseApi.dispararEnvioAgendaEmail(dataISO);
      return { success: !!(result.success ?? result.sucesso), message: result.message || result.mensagem, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async agendaCondutor(dataInicio, dataFim) {
    try {
      const data = await window.supabaseApi.agendaCondutor(dataInicio, dataFim);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  // ==================== TABELAS DE APOIO ====================
  
  async listarUnidades() {
    try {
      const data = await window.supabaseApi.listarUnidades();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async listarSetores(unidadeId) {
    try {
      const data = await window.supabaseApi.listarSetores(unidadeId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async listarLocais() {
    try {
      const data = await window.supabaseApi.listarLocais();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  // ==================== USUÁRIO ====================
  
  async getUserId() {
    return await window.supabaseApi.getUserId();
  },
  
  isGestor() {
    return window.supabaseApi.isGestor();
  },
  
  isCondutor() {
    return window.supabaseApi.isCondutor();
  },
  
  isSolicitante() {
    return window.supabaseApi.isSolicitante();
  }
};

// Exporta globalmente
window.API = API;