// ============================================================
// MARKCARRO - API Supabase (usando o client oficial com sessão)
// ============================================================
// Todas as funções abaixo usam `_sb` (window.supabase), o
// client criado em supabase-client.js. Diferença crucial em relação
// à versão anterior: o SDK oficial anexa automaticamente o
// Authorization: Bearer <access_token da sessão> em toda chamada
// depois do login - por isso as policies de RLS (que exigem
// auth.uid() ou auth.role() = 'authenticated') passam a funcionar.
// A versão antiga usava fetch() manual sempre com a ANON KEY fixa,
// então nenhuma consulta pós-login enxergava o usuário autenticado
// (era isso que causava "Perfil não encontrado" no login).
// ============================================================

const _sb = window.supabase;

function _checarClient() {
  if (!_sb) {
    throw new Error('Cliente Supabase não inicializado. Verifique config.js e supabase-client.js.');
  }
}

// ============================================================
// AUTH
// ============================================================

async function supabaseLogin(email, senha) {
  _checarClient();
  const { data, error } = await _sb.auth.signInWithPassword({
    email,
    password: senha
  });
  if (error) throw error;
  return data; // { user, session }
}

async function supabaseCadastro(email, senha, metaDados) {
  _checarClient();
  const { data, error } = await _sb.auth.signUp({
    email,
    password: senha,
    options: { data: metaDados || {} }
  });
  if (error) throw error;
  return data; // { user, session }
}

// Usada quando um GESTOR cria a conta de outra pessoa (novo condutor ou
// solicitante nas telas de Gerenciar). Problema que isso resolve: o SDK do
// Supabase troca a sessão ativa do navegador para a do usuário recém-criado
// sempre que signUp() retorna uma sessão (o que acontece quando a
// confirmação de e-mail está desativada no projeto) - ou seja, o gestor
// seria deslogado da própria conta e ficaria logado como o condutor/usuário
// que ele acabou de cadastrar. Aqui guardamos a sessão do gestor antes de
// chamar signUp() e a restauramos logo em seguida.
async function criarUsuarioComoAdmin(email, senha, metaDados) {
  _checarClient();
  const { data: { session: sessaoAntes } } = await _sb.auth.getSession();

  const { data, error } = await _sb.auth.signUp({
    email,
    password: senha,
    options: { data: metaDados || {} }
  });

  if (sessaoAntes) {
    await _sb.auth.setSession({
      access_token: sessaoAntes.access_token,
      refresh_token: sessaoAntes.refresh_token
    });
  }

  if (error) throw error;
  return data; // { user, session } do usuário recém-criado
}

async function supabaseLogout() {
  _checarClient();
  const { error } = await _sb.auth.signOut();
  if (error) throw error;
}

async function supabaseSessao() {
  _checarClient();
  const { data: { session }, error } = await _sb.auth.getSession();
  if (error) throw error;
  return session;
}

async function supabaseUsuarioAtual() {
  _checarClient();
  const { data: { user }, error } = await _sb.auth.getUser();
  if (error) throw error;
  return user;
}

// ============================================================
// PROFILES
// ============================================================

// Busca por id (auth.uid()) e cai para busca por e-mail como reserva
// (útil pra usuários migrados sem profiles.id == auth.users.id ainda).
async function buscarPerfil(userId, email = null) {
  _checarClient();

  if (userId) {
    const { data, error } = await _sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  if (email) {
    const { data, error } = await _sb
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  return null;
}

// Atualiza pelo id (UUID = auth.users.id). Use esta quando tiver o id.
async function atualizarPerfil(userId, dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('profiles')
    .update(dados)
    .eq('id', userId)
    .select();
  if (error) throw error;
  return data;
}

// Atualiza pelo e-mail. Use esta nas telas de gestão (Gerenciar
// Condutores/Usuários), que só têm o e-mail em mãos, não o UUID.
// (Antes, essas telas chamavam atualizarPerfil(email, ...), que
// filtra por "id" - como "id" é UUID, isso nunca batia com nenhuma
// linha e a edição feita pelo gestor não tinha efeito nenhum.)
async function atualizarPerfilPorEmail(email, dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('profiles')
    .update(dados)
    .eq('email', email)
    .select();
  if (error) throw error;
  return data;
}

async function listarCondutores() {
  _checarClient();
  const { data, error } = await _sb
    .from('profiles')
    .select('*')
    .eq('tipo', 'condutor')
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return data;
}

async function listarUsuarios() {
  _checarClient();
  const { data, error } = await _sb
    .from('profiles')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data;
}

// ============================================================
// SOLICITACOES
// ============================================================

async function criarSolicitacao(dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('solicitacoes')
    .insert(dados)
    .select();
  if (error) throw error;
  return data[0];
}

async function buscarSolicitacoesPorEmail(email) {
  _checarClient();
  const { data, error } = await _sb
    .from('solicitacoes')
    .select('*')
    .eq('email_solicitante', email)
    .order('data_solicitacao', { ascending: false });
  if (error) throw error;
  return data;
}

// "Meu Setor" (tela Dashboard do Solicitante) - resumo agregado de todas as
// solicitações da mesma unidade+setor do usuário logado (ou seja, incluindo
// as dos colegas, não só as próprias). Só funciona com a policy de RLS
// "Solicitante ve solicitacoes do proprio setor" aplicada no banco (ver
// supabase_rls_dashboard_solicitante.sql) - sem ela, o Postgres já filtra
// tudo antes de chegar aqui e a consulta volta só as próprias solicitações
// (igual buscarSolicitacoesPorEmail), sem erro nenhum.
async function buscarSolicitacoesPorSetor(unidade, setor) {
  _checarClient();
  if (!unidade || !setor) return [];
  const { data, error } = await _sb
    .from('solicitacoes')
    .select('*')
    .eq('unidade', unidade)
    .eq('setor', setor)
    .order('data_viagem', { ascending: false });
  if (error) throw error;
  return data;
}

async function buscarTodasSolicitacoes() {
  _checarClient();
  const { data, error } = await _sb
    .from('solicitacoes')
    .select('*')
    .order('data_solicitacao', { ascending: false });
  if (error) throw error;
  return data;
}

async function buscarSolicitacoesPorData(dataIni, dataFim) {
  _checarClient();
  const { data, error } = await _sb
    .from('solicitacoes')
    .select('*')
    .gte('data_viagem', dataIni)
    .lte('data_viagem', dataFim)
    .order('data_viagem');
  if (error) throw error;
  return data;
}

async function buscarSolicitacoesPorCondutor(emailCondutor) {
  _checarClient();
  const { data, error } = await _sb
    .from('solicitacoes')
    .select('*')
    .or(`condutor_ida.eq.${emailCondutor},condutor_volta.eq.${emailCondutor}`)
    .order('data_viagem', { ascending: false });
  if (error) throw error;
  return data;
}

async function atualizarSolicitacao(id, dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('solicitacoes')
    .update(dados)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data;
}

async function excluirSolicitacao(id) {
  _checarClient();
  const { error } = await _sb
    .from('solicitacoes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// LOCAIS
// ============================================================

async function listarLocais() {
  _checarClient();
  const { data, error } = await _sb
    .from('locais')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data;
}

async function adicionarLocal(nome) {
  _checarClient();
  const { data, error } = await _sb
    .from('locais')
    .insert({ nome })
    .select();
  if (error) throw error;
  return data[0];
}

// ============================================================
// TABELAS DE APOIO
// ============================================================

async function listarTabelasApoio() {
  _checarClient();
  const { data, error } = await _sb
    .from('tabelas_apoio')
    .select('*')
    .order('unidade');
  if (error) throw error;
  return data;
}

async function listarUnidades() {
  _checarClient();
  const { data, error } = await _sb
    .from('tabelas_apoio')
    .select('unidade')
    .order('unidade');
  if (error) throw error;
  return [...new Set((data || []).map(item => item.unidade))];
}

async function listarSetoresPorUnidade(unidade) {
  _checarClient();
  const { data, error } = await _sb
    .from('tabelas_apoio')
    .select('setor, email')
    .eq('unidade', unidade)
    .order('setor');
  if (error) throw error;
  return data;
}

async function adicionarTabelaApoio(dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('tabelas_apoio')
    .insert(dados)
    .select();
  if (error) throw error;
  return data[0];
}

// ============================================================
// UNIDADES (cadastro nome/endereço/telefone/e-mail, separado dos
// dropdowns de Unidade/Setor em tabelas_apoio)
// ============================================================

async function listarTodasUnidades() {
  _checarClient();
  const { data, error } = await _sb
    .from('unidades')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data;
}

async function criarUnidade(dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('unidades')
    .insert(dados)
    .select();
  if (error) throw error;
  return data[0];
}

async function atualizarUnidade(id, dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('unidades')
    .update(dados)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data;
}

async function excluirUnidade(id) {
  _checarClient();
  const { error } = await _sb
    .from('unidades')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// NOTIFICACOES
// ============================================================

async function criarNotificacao(dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('notificacoes')
    .insert(dados)
    .select();
  if (error) throw error;
  return data[0];
}

async function buscarNotificacoes(email) {
  _checarClient();
  const { data, error } = await _sb
    .from('notificacoes')
    .select('*')
    .eq('email_destinatario', email)
    .order('data_hora', { ascending: false });
  if (error) throw error;
  return data;
}

async function marcarNotificacaoLida(id) {
  _checarClient();
  const { data, error } = await _sb
    .from('notificacoes')
    .update({ lida: true })
    .eq('id', id)
    .select();
  if (error) throw error;
  return data;
}

async function contarNaoLidas(email) {
  _checarClient();
  const { count, error } = await _sb
    .from('notificacoes')
    .select('*', { count: 'exact', head: true })
    .eq('email_destinatario', email)
    .eq('lida', false);
  if (error) throw error;
  return count || 0;
}

// Equivalente ao notificarTodosGestores(mensagem) do sistema antigo em Apps
// Script: cria uma notificação no sino para CADA gestor/admin ativo. Usado
// quando um solicitante cancela a própria viagem (Desprezado), pra avisar
// quem cuida do painel sem depender de e-mail.
async function notificarTodosGestores(mensagem, tipo = 'aviso_gestor') {
  _checarClient();
  const { data: gestores, error: erroGestores } = await _sb
    .from('profiles')
    .select('email')
    .eq('tipo', 'admin')
    .eq('ativo', true);
  if (erroGestores) throw erroGestores;
  if (!gestores || !gestores.length) return;

  const linhas = gestores.map(g => ({
    email_destinatario: g.email,
    tipo,
    mensagem,
    lida: false
  }));

  const { error } = await _sb.from('notificacoes').insert(linhas);
  if (error) throw error;
}

// ============================================================
// REGISTROS DE KM
// ============================================================

async function registrarKM(dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('registros_km')
    .insert(dados)
    .select();
  if (error) throw error;
  return data[0];
}

async function buscarKM_porData(emailCondutor, data) {
  _checarClient();
  const { data: resultado, error } = await _sb
    .from('registros_km')
    .select('*')
    .eq('email_condutor', emailCondutor)
    .eq('data', data)
    .maybeSingle();
  if (error) throw error;
  return resultado;
}

async function buscarKM_porPeriodo(emailCondutor, dataIni, dataFim) {
  _checarClient();
  const { data, error } = await _sb
    .from('registros_km')
    .select('*')
    .eq('email_condutor', emailCondutor)
    .gte('data', dataIni)
    .lte('data', dataFim)
    .order('data', { ascending: false });
  if (error) throw error;
  return data;
}

async function atualizarKM(id, dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('registros_km')
    .update(dados)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data;
}

async function excluirKM(id) {
  _checarClient();
  const { error } = await _sb
    .from('registros_km')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function listarTodosKM() {
  _checarClient();
  const { data, error } = await _sb
    .from('registros_km')
    .select('*')
    .order('data', { ascending: false });
  if (error) throw error;
  return data;
}
