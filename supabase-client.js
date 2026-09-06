// ============================================================
// MARKCARRO - SUPABASE CLIENT
// Wrapper para o Supabase JS SDK — acesso direto às tabelas (sem Edge
// Functions, exceto o envio de e-mail via Resend).
//
// Regras de negócio replicadas do sistema legado em Google Apps Script
// (Codigo.js / Parte2_Notificacoes_Gestor.js / Parte3_Agenda_KM_Export.gs),
// adaptadas ao schema Postgres (tabelas: profiles, solicitacoes, locais,
// tabelas_apoio, notificacoes, registros_km, lista_emails_agenda).
// ============================================================
// Utilitário local de timeout (não depende de app.js, que carrega depois
// deste arquivo) — evita que uma consulta lenta trave o carregamento do
// perfil indefinidamente.
function withTimeoutSC(promise, ms, errorMsg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
  ]);
}
 
class SupabaseClient {
  constructor() {
    this.client = null;
    this.currentUser = null;
    this.userProfile = null;
    this.initialized = false;
    this.authStateListeners = [];
  }
 
  // Inicializa o cliente Supabase
  async init() {
    if (this.initialized) return this.client;
 
    try {
      this.client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
 
      this.client.auth.onAuthStateChange((event, session) => {
        this.handleAuthStateChange(event, session);
      });
 
      const { data: { session } } = await this.client.auth.getSession();
      if (session) {
        await this.loadUserProfile(session.user.id, session.user);
      }
 
      this.initialized = true;
      return this.client;
    } catch (error) {
      console.error('Erro ao inicializar Supabase:', error);
      throw error;
    }
  }
 
  async handleAuthStateChange(event, session) {
    console.log('Auth state change:', event, session?.user?.email);
 
    if (event === 'SIGNED_IN' && session) {
      await this.loadUserProfile(session.user.id, session.user);
      this.notifyAuthListeners('signed_in', session.user);
    } else if (event === 'SIGNED_OUT') {
      this.currentUser = null;
      this.userProfile = null;
      this.notifyAuthListeners('signed_out');
    } else if (event === 'TOKEN_REFRESHED' && session) {
      await this.loadUserProfile(session.user.id, session.user);
    }
  }
 
  // Carrega perfil do usuário (tabela real: profiles).
  // `userObj`, quando informado (ex: vindo direto do retorno do login ou da
  // sessão), evita uma segunda chamada de rede (auth.getUser()) que não é
  // essencial e só criava mais um ponto onde isso podia travar/demorar.
  async loadUserProfile(userId, userObj = null) {
    try {
      const { data, error } = await withTimeoutSC(
        this.client.from('profiles').select('*').eq('id', userId).single(),
        8000,
        'Timeout ao buscar perfil'
      );
 
      if (error) {
        console.error('Erro ao carregar perfil:', error);
        if (error.code === 'PGRST116') {
          await this.createDefaultProfile(userId, userObj);
        }
        return;
      }
 
      this.currentUser = userObj || this.currentUser;
      this.userProfile = data;
      this.notifyAuthListeners('profile_loaded', data);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  }
 
  // Cria perfil padrão para novo usuário (o trigger handle_new_user já faz
  // isso no signup; isto é só um fallback de segurança)
  async createDefaultProfile(userId, userObj = null) {
    const user = userObj || (await this.client.auth.getUser()).data?.user;
    if (!user) return;
 
    const defaultProfile = {
      id: userId,
      email: user.email,
      nome: user.user_metadata?.nome || user.email.split('@')[0],
      tipo: user.user_metadata?.tipo || 'solicitante'
    };
 
    const { data, error } = await this.client.from('profiles').insert(defaultProfile).select().single();
    if (error) {
      console.error('Erro ao criar perfil padrão:', error);
    } else {
      this.currentUser = user;
      this.userProfile = data || defaultProfile;
      this.notifyAuthListeners('profile_loaded', this.userProfile);
    }
  }
 
  notifyAuthListeners(event, data) {
    this.authStateListeners.forEach(cb => {
      try { cb(event, data); } catch (e) { console.error('Erro no listener:', e); }
    });
  }
 
  onAuthStateChange(callback) {
    this.authStateListeners.push(callback);
    return () => {
      this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
    };
  }
 
  // ==================== AUTENTICAÇÃO ====================
 
  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(this.formatAuthError(error));
    return data;
  }
 
  async signUp(email, password, userData = {}) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: userData }
    });
    if (error) throw new Error(this.formatAuthError(error));
    return data;
  }
 
  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
    this.currentUser = null;
    this.userProfile = null;
  }
 
  async resetPassword(email) {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });
    if (error) throw new Error(this.formatAuthError(error));
  }
 
  async updatePassword(newPassword) {
    const { error } = await this.client.auth.updateUser({ password: newPassword });
    if (error) throw new Error(this.formatAuthError(error));
  }
 
  formatAuthError(error) {
    const messages = {
      'Invalid login credentials': 'E-mail ou senha incorretos',
      'Email not confirmed': 'E-mail não confirmado. Verifique sua caixa de entrada.',
      'User already registered': 'Este e-mail já está cadastrado',
      'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
      'Invalid email': 'E-mail inválido',
      'Too many requests': 'Muitas tentativas. Tente novamente mais tarde.'
    };
    return messages[error.message] || error.message;
  }
 
  // ==================== PERFIL ====================
 
  getUser() {
    return this.currentUser;
  }
 
  getProfile() {
    return this.userProfile;
  }
 
  isGestor() {
    return !!this.userProfile && CONFIG.GESTOR_TYPES.includes(this.userProfile.tipo);
  }
 
  isCondutor() {
    return !!this.userProfile && this.userProfile.tipo === 'condutor';
  }
 
  isSolicitante() {
    return !!this.userProfile && this.userProfile.tipo === 'solicitante';
  }
 
  async updateProfile(dados) {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
 
    const { data: profile, error } = await this.client
      .from('profiles')
      .update(dados)
      .eq('id', user.id)
      .select()
      .single();
 
    if (error) throw error;
    this.userProfile = { ...this.userProfile, ...profile };
    return profile;
  }
 
  async getUserId() {
    const { data: { user } } = await this.client.auth.getUser();
    return user?.id;
  }
 
  async _getMyEmail() {
    if (this.userProfile?.email) return this.userProfile.email;
    const { data: { user } } = await this.client.auth.getUser();
    return user?.email;
  }
 
  // ==================== HELPERS DE NEGÓCIO (regras vindas do GAS) ====================
 
  // Busca o e-mail de notificação do setor (tabelas_apoio), com fallback
  // para o e-mail do próprio solicitante — mesma regra do obterEmailNotificacao() do GAS.
  async _buscarEmailNotificacao(unidade, setor, emailSolicitante) {
    if (unidade && setor) {
      const { data } = await this.client
        .from('tabelas_apoio')
        .select('email')
        .eq('unidade', unidade)
        .eq('setor', setor)
        .maybeSingle();
      if (data?.email) return data.email;
    }
    return emailSolicitante;
  }
 
  async _buscarNomeUsuario(email) {
    if (!email) return '';
    const { data } = await this.client
      .from('profiles')
      .select('nome')
      .eq('email', email)
      .maybeSingle();
    return data?.nome || email;
  }
 
  async _buscarDadosCondutorPorEmail(email) {
    if (!email) return null;
    const { data } = await this.client
      .from('profiles')
      .select('nome, telefone, placa, modelo, capacidade')
      .eq('email', email)
      .eq('tipo', 'condutor')
      .maybeSingle();
    if (!data) return null;
    return {
      codigo: data.capacidade ? `${data.nome} ${data.capacidade}` : data.nome,
      telefone: data.telefone,
      placa: data.placa,
      modelo: data.modelo
    };
  }
 
  async _criarNotificacaoSino(emailDestinatario, tipo, mensagem) {
    if (!emailDestinatario) return;
    try {
      await this.client.from('notificacoes').insert({
        email_destinatario: emailDestinatario,
        tipo,
        mensagem
      });
    } catch (e) {
      console.error('Erro ao criar notificação:', e);
    }
  }
 
  async _notificarTodosGestores(mensagem) {
    try {
      const { data: gestores } = await this.client
        .from('profiles')
        .select('email')
        .eq('tipo', 'admin');
      for (const g of gestores || []) {
        await this._criarNotificacaoSino(g.email, 'aviso_gestor', mensagem);
      }
    } catch (e) {
      console.error('Erro ao notificar gestores:', e);
    }
  }
 
  // Envia e-mail via Edge Function (Resend). Nunca lança erro para não
  // travar o fluxo principal se o e-mail falhar — só registra no console.
  async _enviarEmail(to, subject, html) {
    try {
      const { data, error } = await this.client.functions.invoke('send-email', {
        body: { to, subject, html }
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Erro ao enviar e-mail:', e);
      return { success: false, error: e.message };
    }
  }
 
  _rodapeEmail() {
    return '<br><br><p style="color:#666;font-size:12px;">Transporte - SEMED.<br><em>(Essa mensagem foi gerada automaticamente)</em></p>';
  }
 
  // Verifica se ainda dá tempo do solicitante cancelar (até 30 min antes da saída)
  _podeCancelar(dataViagemISO, horaSaida, status) {
    if (CONFIG_STATUS_FINAIS.includes(status)) return false;
    if (!dataViagemISO || !horaSaida) return false;
    const dataHoraSaida = new Date(`${dataViagemISO}T${horaSaida.length === 5 ? horaSaida : horaSaida.slice(0, 5)}:00`);
    if (isNaN(dataHoraSaida.getTime())) return false;
    const limite = new Date(dataHoraSaida.getTime() - (CONFIG.CANCELAMENTO_MINUTOS || 30) * 60 * 1000);
    return new Date() < limite;
  }
 
  // ==================== SOLICITAÇÕES ====================
 
  async criarSolicitacao(dados) {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
 
    // O e-mail do solicitante é sempre o do usuário logado, a menos que o
    // gestor informe explicitamente um e-mail externo válido.
    let emailSolicitante = user.email;
    if (dados.emailSolicitante && dados.emailSolicitante.includes('@')) {
      emailSolicitante = dados.emailSolicitante;
    }
 
    const unidade = dados.unidade || this.userProfile?.unidade || null;
    const setor = dados.setor || this.userProfile?.setor || null;
 
    const row = {
      email_solicitante: emailSolicitante,
      data_viagem: dados.dataViagem,
      hora_saida: dados.horaSaida,
      hora_retorno: dados.horaRetorno,
      origem: dados.origem,
      destino: dados.destino,
      unidade,
      setor,
      justificativa: dados.justificativa || '',
      tipo_viagem: dados.tipoViagem || 'Motorista',
      qtd_pessoas: parseInt(dados.qtd) || 1,
      status: 'Pendente',
      nome_ext: dados.nomeSolicitanteExterno || null,
      telefone_ext: dados.telefoneSolicitanteExterno || null
    };
 
    const { data, error } = await this.client
      .from('solicitacoes')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
 
    // Notificação de recebimento (sino + e-mail para o setor, com fallback pro solicitante)
    try {
      const nomeSolicitante = dados.nomeSolicitanteExterno || await this._buscarNomeUsuario(emailSolicitante);
      const emailDestino = await this._buscarEmailNotificacao(unidade, setor, emailSolicitante);
      const mensagem =
        `Prezada(o) ${nomeSolicitante},<br><br>` +
        `Informamos que recebemos seu agendamento de transporte para a(o) ${dados.destino} em ${Utils.formatarDataBR(dados.dataViagem)}, ` +
        `para ${row.qtd_pessoas} pessoa(s).<br><br>` +
        `Aguarde a nossa resposta. Sua solicitação será analisada e poderá ser ajustada conforme nosso planejamento e disponibilidade de frota.<br><br>` +
        `Informamos que os veículos disponibilizados poderão ser compartilhados entre diferentes solicitações.<br><br>` +
        `Caso necessite cancelar ou alterar esta solicitação, entre em contato com o setor de Transporte.`;
 
      await this._criarNotificacaoSino(emailDestino, 'recebimento', `Status: Pendente — recebemos sua solicitação para ${dados.destino}`);
      await this._enviarEmail(emailDestino, '[MarkCarro] Recebemos seu agendamento de transporte', mensagem + this._rodapeEmail());
    } catch (e) {
      console.error('Erro ao notificar recebimento:', e);
    }
 
    return data;
  }
 
  async buscarMinhasSolicitacoes() {
    const email = await this._getMyEmail();
    const { data, error } = await this.client
      .from('solicitacoes')
      .select('*')
      .eq('email_solicitante', email)
      .order('data_solicitacao', { ascending: false });
    if (error) throw error;
 
    // Resolve nomes/códigos dos condutores atribuídos, se houver
    const emailsCondutores = [...new Set((data || []).flatMap(s => [s.condutor_ida, s.condutor_volta]).filter(Boolean))];
    let mapaCondutores = {};
    if (emailsCondutores.length > 0) {
      const { data: condutores } = await this.client
        .from('profiles')
        .select('email, nome, capacidade')
        .in('email', emailsCondutores);
      (condutores || []).forEach(c => {
        mapaCondutores[c.email] = c.capacidade ? `${c.nome} ${c.capacidade}` : c.nome;
      });
    }
 
    return (data || []).map(s => ({
      ...s,
      qtd: s.qtd_pessoas,
      condutor_ida_codigo: s.condutor_ida ? (mapaCondutores[s.condutor_ida] || s.condutor_ida) : null,
      condutor_ida_email: s.condutor_ida,
      pode_cancelar: s.email_solicitante === email && this._podeCancelar(s.data_viagem, s.hora_saida, s.status)
    }));
  }
 
  async cancelarSolicitacao(id) {
    const email = await this._getMyEmail();
 
    const { data: sol, error: errBusca } = await this.client
      .from('solicitacoes')
      .select('*')
      .eq('id', id)
      .single();
    if (errBusca) throw errBusca;
 
    if (sol.email_solicitante !== email) {
      throw new Error('Você não tem permissão para cancelar esta solicitação.');
    }
    if (!this._podeCancelar(sol.data_viagem, sol.hora_saida, sol.status)) {
      throw new Error('Não é mais possível cancelar: faltam menos de 30 minutos para o horário de saída (ou a viagem já passou).');
    }
 
    const { error } = await this.client
      .from('solicitacoes')
      .update({ status: 'Desprezado', data_cancel_confirm: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
 
    const nomeSolicitante = await this._buscarNomeUsuario(email);
    await this._notificarTodosGestores(
      `${nomeSolicitante} cancelou a própria solicitação para ${sol.destino} (${Utils.formatarDataBR(sol.data_viagem)} às ${Utils.formatarHoraBR(sol.hora_saida)}).`
    );
 
    return { sucesso: true };
  }
 
  // ==================== CONDUTORES ====================
 
  async listarCondutores(filtroCategoria = null) {
    let query = this.client
      .from('profiles')
      .select('*')
      .eq('tipo', 'condutor')
      .eq('ativo', true)
      .order('nome');
    if (filtroCategoria) query = query.ilike('categoria', filtroCategoria);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      codigo: c.capacidade ? `${c.nome} ${c.capacidade}` : c.nome
    }));
  }
 
  async buscarAvisosCnh(dias = 30) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('tipo', 'condutor')
      .eq('ativo', true)
      .not('validade_cnh', 'is', null)
      .lte('validade_cnh', limite.toISOString().split('T')[0])
      .order('validade_cnh');
    if (error) throw error;
    const hoje = new Date().toISOString().split('T')[0];
    return (data || []).map(c => ({ ...c, vencida: c.validade_cnh < hoje }));
  }
 
  // ==================== KM ====================
 
  async statusKmHoje() {
    const email = await this._getMyEmail();
    const hoje = new Date().toISOString().split('T')[0];
    const { data } = await this.client
      .from('registros_km')
      .select('*')
      .eq('email_condutor', email)
      .eq('data', hoje)
      .maybeSingle();
 
    if (!data) return { estado: 'sem_registro_hoje', registro: null };
    if (data.km_final !== null && data.km_final !== undefined) return { estado: 'completo', registro: data };
    return { estado: 'aguardando_final', registro: data };
  }
 
  async registrarKmInicial(kmInicial) {
    const email = await this._getMyEmail();
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await this.client
      .from('registros_km')
      .insert({ email_condutor: email, data: hoje, km_inicial: kmInicial })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
 
  async registrarKmFinal(kmFinal, dataRegistro = null) {
    const email = await this._getMyEmail();
    const data = dataRegistro || new Date().toISOString().split('T')[0];
    const { data: result, error } = await this.client
      .from('registros_km')
      .update({ km_final: kmFinal })
      .eq('email_condutor', email)
      .eq('data', data)
      .select()
      .single();
    if (error) throw error;
    return result;
  }
 
  async historicoKm() {
    const email = await this._getMyEmail();
    const { data, error } = await this.client
      .from('registros_km')
      .select('*')
      .eq('email_condutor', email)
      .order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  }
 
  async dashboardKm() {
    const historico = await this.historicoKm();
    const completos = historico.filter(r => r.km_final !== null && r.km_final !== undefined);
    const totalKm = completos.reduce((acc, r) => acc + (Number(r.km_final) - Number(r.km_inicial)), 0);
    return {
      totalKm,
      diasRegistrados: historico.length,
      diasCompletos: completos.length,
      ultimoRegistro: historico[0] || null
    };
  }
 
  // ==================== NOTIFICAÇÕES ====================
 
  async buscarNotificacoes() {
    const email = await this._getMyEmail();
    const { data, error } = await this.client
      .from('notificacoes')
      .select('*')
      .eq('email_destinatario', email)
      .order('data_hora', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }
 
  async contarNaoLidas() {
    const email = await this._getMyEmail();
    const { count, error } = await this.client
      .from('notificacoes')
      .select('*', { count: 'exact', head: true })
      .eq('email_destinatario', email)
      .eq('lida', false);
    if (error) throw error;
    return count || 0;
  }
 
  async marcarComoLidas() {
    const email = await this._getMyEmail();
    const { error } = await this.client
      .from('notificacoes')
      .update({ lida: true })
      .eq('email_destinatario', email)
      .eq('lida', false);
    if (error) throw error;
  }
 
  // ==================== GESTOR — PAINEL ====================
 
  async painelGestor() {
    const [{ data: condutoresRaw, error: errCond }, { data: solicitacoesRaw, error: errSol }] = await Promise.all([
      this.client.from('profiles').select('*').eq('tipo', 'condutor').eq('ativo', true).order('nome'),
      this.client.from('solicitacoes').select('*').order('data_solicitacao', { ascending: false })
    ]);
    if (errCond) throw errCond;
    if (errSol) throw errSol;
 
    // Auto: Pendente -> Em Análise assim que o gestor abre o painel
    const idsPendentes = (solicitacoesRaw || []).filter(s => s.status === 'Pendente').map(s => s.id);
    if (idsPendentes.length > 0) {
      await this.client.from('solicitacoes').update({ status: 'Em Análise' }).in('id', idsPendentes);
      (solicitacoesRaw || []).forEach(s => { if (idsPendentes.includes(s.id)) s.status = 'Em Análise'; });
    }
 
    // Mapa de e-mail -> nome, para exibir o solicitante
    const emails = [...new Set((solicitacoesRaw || []).map(s => s.email_solicitante).filter(Boolean))];
    let mapaNomes = {};
    if (emails.length > 0) {
      const { data: perfis } = await this.client.from('profiles').select('email, nome').in('email', emails);
      (perfis || []).forEach(p => { mapaNomes[p.email] = p.nome; });
    }
 
    const condutores = (condutoresRaw || []).map(c => ({
      id: c.id,
      email: c.email,
      codigo: c.capacidade ? `${c.nome} ${c.capacidade}` : c.nome
    }));
 
    const solicitacoes = (solicitacoesRaw || []).map(s => ({
      id: s.id,
      data_solicitacao: Utils.formatarDataBR(s.data_solicitacao),
      data_viagem: Utils.formatarDataBR(s.data_viagem),
      hora_saida: s.hora_saida,
      hora_retorno: s.hora_retorno,
      origem: s.origem,
      destino: s.destino,
      solicitante_nome: s.nome_ext || mapaNomes[s.email_solicitante] || s.email_solicitante,
      email_solicitante: s.email_solicitante,
      unidade: s.unidade,
      setor: s.setor,
      justificativa: s.justificativa,
      tipo_viagem: s.tipo_viagem,
      qtd: s.qtd_pessoas,
      status: s.status,
      condutor_ida: s.condutor_ida,
      condutor_volta: s.condutor_volta
    }));
 
    return { condutores, solicitacoes };
  }
 
  async atualizarSolicitacaoGestor(dados) {
    const { data: solAtual, error: errBusca } = await this.client
      .from('solicitacoes')
      .select('*')
      .eq('id', dados.id)
      .single();
    if (errBusca) throw errBusca;
 
    // Resolve os IDs de condutor (vindos do <select>) para e-mail (usado no
    // schema e nas políticas de RLS "condutor vê suas solicitações").
    let condutorIdaEmail = null;
    let condutorVoltaEmail = null;
    if (dados.condutor_ida_id) {
      const { data } = await this.client.from('profiles').select('email').eq('id', dados.condutor_ida_id).maybeSingle();
      condutorIdaEmail = data?.email || null;
    }
    if (dados.condutor_volta_id) {
      const { data } = await this.client.from('profiles').select('email').eq('id', dados.condutor_volta_id).maybeSingle();
      condutorVoltaEmail = data?.email || null;
    }
 
    if (dados.acao === 'confirmar' && !condutorIdaEmail) {
      throw new Error('Selecione ao menos o condutor de ida antes de confirmar.');
    }
 
    const camposComuns = {
      data_viagem: dados.data_viagem,
      hora_saida: dados.hora_saida,
      hora_retorno: dados.hora_retorno,
      origem: dados.origem,
      destino: dados.destino,
      justificativa: dados.justificativa,
      tipo_viagem: dados.tipo_viagem,
      qtd_pessoas: parseInt(dados.qtd) || solAtual.qtd_pessoas
    };
 
    const nomeSolicitante = solAtual.nome_ext || await this._buscarNomeUsuario(solAtual.email_solicitante);
    const emailNotificacao = await this._buscarEmailNotificacao(solAtual.unidade, solAtual.setor, solAtual.email_solicitante);
    const agora = new Date().toISOString();
    const ehExtra = solAtual.data_solicitacao && solAtual.data_viagem &&
      new Date(solAtual.data_solicitacao).toISOString().split('T')[0] === dados.data_viagem;
 
    if (dados.acao === 'confirmar') {
      const { error } = await this.client.from('solicitacoes').update({
        ...camposComuns,
        condutor_ida: condutorIdaEmail,
        condutor_volta: condutorVoltaEmail,
        status: 'Confirmada',
        data_cancel_confirm: agora
      }).eq('id', dados.id);
      if (error) throw error;
 
      const condIda = await this._buscarDadosCondutorPorEmail(condutorIdaEmail);
      const condVolta = condutorVoltaEmail && condutorVoltaEmail !== condutorIdaEmail
        ? await this._buscarDadosCondutorPorEmail(condutorVoltaEmail) : null;
 
      let blocoCondutor = `Favor contatar o(a) motorista responsável: ${condIda ? condIda.codigo : '-'}.<br>` +
        `Celular: ${condIda ? (condIda.telefone || '-') : '-'} | Placa: ${condIda ? (condIda.placa || '-') : '-'}` +
        (condIda ? ` | Veículo: ${condIda.modelo || '-'}` : '');
      if (condVolta) {
        blocoCondutor += `<br><br>Condutor de volta: ${condVolta.codigo}.<br>Celular: ${condVolta.telefone || '-'} | Placa: ${condVolta.placa || '-'} | Veículo: ${condVolta.modelo || '-'}`;
      }
 
      const mensagem =
        `Prezada(o) ${nomeSolicitante},<br><br>` +
        `Informamos que sua solicitação de transporte à(ao) ${dados.destino}, agendada para ${Utils.formatarDataBR(dados.data_viagem)}, está com o status de CONFIRMADA.<br><br>` +
        `${blocoCondutor}<br><br>` +
        `A tolerância para embarque é de até 5 minutos. O não comparecimento dentro desse prazo poderá acarretar o cancelamento da viagem.`;
 
      await this._criarNotificacaoSino(emailNotificacao, 'confirmacao', `Status: Confirmada — corrida para ${dados.destino}`);
      await this._enviarEmail(emailNotificacao, '[MarkCarro] Sua viagem foi confirmada', mensagem + this._rodapeEmail());
 
      if (ehExtra) {
        const msgExtra = `Nova corrida extra hoje: ${dados.origem} → ${dados.destino}. Saída ${dados.hora_saida}, retorno ${dados.hora_retorno}.`;
        await this._criarNotificacaoSino(condutorIdaEmail, 'corrida_extra', msgExtra);
        if (condutorVoltaEmail && condutorVoltaEmail !== condutorIdaEmail) {
          await this._criarNotificacaoSino(condutorVoltaEmail, 'corrida_extra', msgExtra);
        }
      }
 
      return { sucesso: true, mensagem: 'Solicitação confirmada e solicitante notificado!' };
    }
 
    if (dados.acao === 'ocupado') {
      const { error } = await this.client.from('solicitacoes').update({
        ...camposComuns, status: 'Ocupado', data_cancel_confirm: agora
      }).eq('id', dados.id);
      if (error) throw error;
 
      const mensagem =
        `Prezada(o) ${nomeSolicitante},<br><br>` +
        `Informamos que sua solicitação de transporte à(ao) ${dados.destino}, agendada para ${Utils.formatarDataBR(dados.data_viagem)}, está com o status de OCUPADO.<br>` +
        `Lamentamos! Por questões operacionais, não será possível atender sua solicitação de transporte. Recomendamos realizar uma nova solicitação com data ou horário alternativo.<br><br>` +
        `Dados da solicitação:<br>Data da viagem: ${Utils.formatarDataBR(dados.data_viagem)}.<br>` +
        `Horário de saída: ${dados.hora_saida}h.<br>Horário de retorno: ${dados.hora_retorno}h.<br>` +
        `Origem: ${dados.origem}.<br>Destino: ${dados.destino}.<br>Número de passageiros: ${dados.qtd}.`;
 
      await this._criarNotificacaoSino(emailNotificacao, 'ocupado', `Status: Ocupado — indisponibilidade de veículo`);
      await this._enviarEmail(emailNotificacao, '[MarkCarro] Indisponibilidade de veículo', mensagem + this._rodapeEmail());
 
      return { sucesso: true, mensagem: 'Solicitação marcada como Ocupado e setor notificado!' };
    }
 
    if (dados.acao === 'cancelar') {
      const { error } = await this.client.from('solicitacoes').update({
        ...camposComuns, status: 'Cancelada', data_cancel_confirm: agora
      }).eq('id', dados.id);
      if (error) throw error;
 
      const mensagem =
        `Prezada(o) ${nomeSolicitante},<br><br>` +
        `Informamos que sua solicitação de transporte para ${dados.destino}, agendada para ${Utils.formatarDataBR(dados.data_viagem)}, foi CANCELADA.`;
 
      await this._criarNotificacaoSino(emailNotificacao, 'cancelamento', `Status: Cancelada`);
      await this._enviarEmail(emailNotificacao, '[MarkCarro] Cancelamento de Viagem', mensagem + this._rodapeEmail());
 
      return { sucesso: true, mensagem: 'Solicitação cancelada e solicitante notificado!' };
    }
 
    // Ação "salvar" — edição simples, sem mudar status
    const houveMudanca =
      solAtual.hora_saida !== dados.hora_saida || solAtual.hora_retorno !== dados.hora_retorno ||
      solAtual.origem !== dados.origem || solAtual.destino !== dados.destino ||
      solAtual.data_viagem !== dados.data_viagem;
 
    const { error } = await this.client.from('solicitacoes').update(camposComuns).eq('id', dados.id);
    if (error) throw error;
 
    if (houveMudanca && solAtual.status === 'Confirmada') {
      const mensagem =
        `Prezada(o) ${nomeSolicitante},<br><br>` +
        `Houve um ajuste na sua viagem para ${dados.destino} (${Utils.formatarDataBR(dados.data_viagem)}). ` +
        `Novo horário: saída ${dados.hora_saida}, retorno ${dados.hora_retorno}. Origem: ${dados.origem}.`;
      await this._criarNotificacaoSino(emailNotificacao, 'ajuste', 'Status: Confirmada (ajuste)');
      await this._enviarEmail(emailNotificacao, '[MarkCarro] Ajuste na sua viagem', mensagem + this._rodapeEmail());
    }
 
    return { sucesso: true, mensagem: 'Alterações salvas!' };
  }
 
  // ==================== AGENDA (GESTOR) ====================
 
  async agendaGestor(dataInicio, dataFim) {
    const { data, error } = await this.client
      .from('solicitacoes')
      .select('*')
      .gte('data_viagem', dataInicio)
      .lte('data_viagem', dataFim)
      .neq('status', 'Cancelada')
      .order('data_viagem')
      .order('hora_saida');
    if (error) throw error;
 
    const emails = [...new Set((data || []).flatMap(s => [s.email_solicitante, s.condutor_ida]).filter(Boolean))];
    let mapaNomes = {};
    if (emails.length > 0) {
      const { data: perfis } = await this.client.from('profiles').select('email, nome, capacidade').in('email', emails);
      (perfis || []).forEach(p => { mapaNomes[p.email] = { nome: p.nome, codigo: p.capacidade ? `${p.nome} ${p.capacidade}` : p.nome }; });
    }
 
    return (data || []).map(s => ({
      id: s.id,
      data_viagem: s.data_viagem,
      hora_saida: s.hora_saida,
      hora_retorno: s.hora_retorno,
      origem: s.origem,
      destino: s.destino,
      solicitante: s.nome_ext || mapaNomes[s.email_solicitante]?.nome || s.email_solicitante,
      condutor_codigo: s.condutor_ida ? (mapaNomes[s.condutor_ida]?.codigo || s.condutor_ida) : null,
      status: s.status
    }));
  }
 
  // Alias — mantém compatibilidade com chamadas antigas (api.js/agenda.js usam agendaGestor)
  async agenda(dataInicio, dataFim) {
    return this.agendaGestor(dataInicio, dataFim);
  }
 
  async agendaCondutor(dataInicio, dataFim) {
    const email = await this._getMyEmail();
    let query = this.client
      .from('solicitacoes')
      .select('*')
      .or(`condutor_ida.eq.${email},condutor_volta.eq.${email}`)
      .not('status', 'in', '("Cancelada","Desprezado")')
      .order('data_viagem')
      .order('hora_saida');
    if (dataInicio) query = query.gte('data_viagem', dataInicio);
    if (dataFim) query = query.lte('data_viagem', dataFim);
 
    const { data, error } = await query;
    if (error) throw error;
 
    return (data || []).map(s => {
      const condIda = (s.condutor_ida || '').toLowerCase() === email.toLowerCase();
      const condVolta = (s.condutor_volta || '').toLowerCase() === email.toLowerCase();
      let papel = 'ida';
      if (condIda && (condVolta || !s.condutor_volta)) papel = 'ida_e_volta';
      else if (!condIda && condVolta) papel = 'volta';
      return {
        ...s,
        qtd: s.qtd_pessoas,
        papel,
        isExtra: s.data_solicitacao && new Date(s.data_solicitacao).toISOString().split('T')[0] === s.data_viagem
      };
    });
  }
 
  async dispararEnvioAgendaEmail(dataISO) {
    const agenda = await this.agendaGestor(dataISO, dataISO);
    if (agenda.length === 0) {
      return { sucesso: false, success: false, error: 'Não há corridas para essa data.' };
    }
 
    const { data: listaAtiva } = await this.client
      .from('lista_emails_agenda')
      .select('email')
      .eq('ativo', true);
    let destinatarios = (listaAtiva || []).map(l => l.email);
 
    if (destinatarios.length === 0) {
      const { data: admins } = await this.client.from('profiles').select('email').eq('tipo', 'admin');
      destinatarios = (admins || []).map(a => a.email);
    }
 
    if (destinatarios.length === 0) {
      return { sucesso: false, success: false, error: 'Nenhum e-mail cadastrado para receber a agenda.' };
    }
 
    const dataBR = Utils.formatarDataBR(dataISO);
    const linhas = agenda.map(a => `
      <tr>
        <td>${Utils.formatarHoraBR(a.hora_saida)} → ${Utils.formatarHoraBR(a.hora_retorno)}</td>
        <td>${a.origem} → ${a.destino}</td>
        <td>${a.solicitante || ''}</td>
        <td>${a.condutor_codigo || '-'}</td>
        <td>${a.status}</td>
      </tr>`).join('');
 
    const html = `<h3>Agenda de Corridas - ${dataBR}</h3>` +
      `<table border="1" cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">` +
      `<tr><th>Horário</th><th>Origem → Destino</th><th>Solicitante</th><th>Condutor</th><th>Status</th></tr>${linhas}</table>` +
      this._rodapeEmail();
 
    const result = await this._enviarEmail(destinatarios, `[MarkCarro] Agenda de Corridas - ${dataBR}`, html);
    if (result?.success === false) {
      return { sucesso: false, success: false, error: result.error || 'Erro ao enviar e-mail.' };
    }
    return { sucesso: true, success: true, message: `Agenda enviada para ${destinatarios.length} destinatário(s).` };
  }
 
  // ==================== EXPORTAÇÃO XLSX (client-side, via SheetJS) ====================
 
  async exportarXlsx() {
    const { solicitacoes } = await this.painelGestor();
    const linhas = solicitacoes.map(s => ({
      ID: s.id,
      'Data Solicitação': s.data_solicitacao,
      'Data Viagem': s.data_viagem,
      'Hora Saída': s.hora_saida,
      'Hora Retorno': s.hora_retorno,
      Origem: s.origem,
      Destino: s.destino,
      Solicitante: s.solicitante_nome,
      Unidade: s.unidade,
      Setor: s.setor,
      Justificativa: s.justificativa,
      'Tipo Viagem': s.tipo_viagem,
      Qtd: s.qtd,
      Status: s.status,
      'Condutor Ida': s.condutor_ida,
      'Condutor Volta': s.condutor_volta
    }));
 
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitacoes');
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
 
    return { base64, filename: `MarkCarro_Solicitacoes_${new Date().toISOString().split('T')[0]}.xlsx` };
  }
 
  // ==================== USUÁRIOS (GESTOR) ====================
 
  async listarUsuarios() {
    const { data, error } = await this.client.from('profiles').select('*').order('nome');
    if (error) throw error;
    return data || [];
  }
 
  async salvarUsuario(dados) {
    if (!dados.id) {
      throw new Error('Para criar um novo usuário, cadastre-o primeiro em Authentication > Users no painel do Supabase (o perfil é criado automaticamente); depois edite os dados aqui.');
    }
    const { id, ...campos } = dados;
    const { data, error } = await this.client.from('profiles').update(campos).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
 
  // ==================== CONDUTORES (GESTOR) ====================
 
  async listarCondutoresGestor() {
    const { data, error } = await this.client.from('profiles').select('*').eq('tipo', 'condutor').order('nome');
    if (error) throw error;
    return data || [];
  }
 
  async salvarCondutorGestor(dados) {
    if (!dados.id) {
      throw new Error('Para cadastrar um novo condutor, crie o usuário primeiro em Authentication > Users no painel do Supabase (com tipo=condutor nos metadados); depois edite os demais dados aqui.');
    }
    const { id, ...campos } = dados;
    const { data, error } = await this.client.from('profiles').update(campos).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
 
  // ==================== KM (GESTOR) ====================
 
  async listarKmGestor() {
    const { data, error } = await this.client.from('registros_km').select('*').order('data', { ascending: false });
    if (error) throw error;
 
    const emails = [...new Set((data || []).map(r => r.email_condutor).filter(Boolean))];
    let mapaNomes = {};
    if (emails.length > 0) {
      const { data: perfis } = await this.client.from('profiles').select('email, nome').in('email', emails);
      (perfis || []).forEach(p => { mapaNomes[p.email] = p.nome; });
    }
    return (data || []).map(r => ({ ...r, condutor_nome: mapaNomes[r.email_condutor] || r.email_condutor }));
  }
 
  async salvarKmGestor(dados) {
    const { id, ...campos } = dados;
    const { data, error } = await this.client.from('registros_km').update({ ...campos, ajustado: true }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
 
  async graficoKm(categoria, periodo) {
    const dias = parseInt(periodo) || 30;
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
 
    const { data, error } = await this.client
      .from('registros_km')
      .select('email_condutor, km_inicial, km_final, data')
      .gte('data', desde.toISOString().split('T')[0])
      .not('km_final', 'is', null);
    if (error) throw error;
 
    const emails = [...new Set((data || []).map(r => r.email_condutor))];
    const { data: perfis } = await this.client.from('profiles').select('email, nome, categoria').in('email', emails);
    const mapaPerfil = {};
    (perfis || []).forEach(p => { mapaPerfil[p.email] = p; });
 
    const porCondutor = {};
    (data || []).forEach(r => {
      const perfil = mapaPerfil[r.email_condutor];
      if (categoria && perfil?.categoria !== categoria) return;
      const nome = perfil?.nome || r.email_condutor;
      porCondutor[nome] = (porCondutor[nome] || 0) + (Number(r.km_final) - Number(r.km_inicial));
    });
 
    return {
      labels: Object.keys(porCondutor),
      valores: Object.values(porCondutor)
    };
  }
 
  // ==================== TABELAS DE APOIO ====================
 
  async listarUnidades() {
    const { data, error } = await this.client.from('tabelas_apoio').select('unidade').order('unidade');
    if (error) throw error;
    const unidades = [...new Set((data || []).map(u => u.unidade))];
    return unidades.map(nome => ({ nome }));
  }
 
  async listarSetores(unidade) {
    const { data, error } = await this.client
      .from('tabelas_apoio')
      .select('setor, email')
      .eq('unidade', unidade)
      .order('setor');
    if (error) throw error;
    return (data || []).map(s => ({ nome: s.setor, email: s.email }));
  }
 
  async listarLocais() {
    const { data, error } = await this.client.from('locais').select('nome').order('nome');
    if (error) throw error;
    return (data || []).map(l => l.nome);
  }
}
 
// Status finais — não podem mais ser cancelados pelo solicitante
const CONFIG_STATUS_FINAIS = ['Cancelada', 'Ocupado', 'Desprezado'];
 
// Instância global
window.supabaseApi = new SupabaseClient();
 
// Inicializa automaticamente
document.addEventListener('DOMContentLoaded', () => {
  window.supabaseApi.init().catch(console.error);
});
 
