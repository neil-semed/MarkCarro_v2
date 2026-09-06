// ============================================================
// MARKCARRO - CONEXÃO SUPABASE
// ============================================================

const SUPABASE_URL = 'https://xzltbjinzlrzfrwdqtxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bHRiamluemxyemZyd2RxdHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjMxODYsImV4cCI6MjEwNDA5OTE4Nn0.sV9vPOqhyvsyxj9IfIbvpR4_JKYF784an3juELQnDOA';

// Cliente Supabase via CDN (global)
const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabase) {
  console.error('Biblioteca Supabase não carregada. Adicione o CDN no HTML.');
}

// ============================================================
// AUTH - Autenticação
// ============================================================

async function supabaseLogin(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha
  });
  if (error) throw error;
  return data;
}

async function supabaseCadastro(email, senha, metaDados) {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: senha,
    options: {
      data: metaDados // { nome, tipo, telefone, unidade, setor, ... }
    }
  });
  if (error) throw error;
  return data;
}

async function supabaseLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function supabaseSessao() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

async function supabaseUsuarioAtual() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// ============================================================
// PROFILES - Perfis de usuário
// ============================================================

async function buscarPerfil(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

async function atualizarPerfil(userId, dados) {
  const { data, error } = await supabase
    .from('profiles')
    .update(dados)
    .eq('id', userId);
  if (error) throw error;
  return data;
}

async function listarCondutores() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('tipo', 'condutor')
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return data;
}

async function listarUsuarios() {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('solicitacoes')
    .insert(dados)
    .select();
  if (error) throw error;
  return data[0];
}

async function buscarSolicitacoesPorEmail(email) {
  const { data, error } = await supabase
    .from('solicitacoes')
    .select('*')
    .eq('email_solicitante', email)
    .order('data_solicitacao', { ascending: false });
  if (error) throw error;
  return data;
}

async function buscarTodasSolicitacoes() {
  const { data, error } = await supabase
    .from('solicitacoes')
    .select('*')
    .order('data_solicitacao', { ascending: false });
  if (error) throw error;
  return data;
}

async function buscarSolicitacoesPorData(dataIni, dataFim) {
  const { data, error } = await supabase
    .from('solicitacoes')
    .select('*')
    .gte('data_viagem', dataIni)
    .lte('data_viagem', dataFim)
    .order('data_viagem');
  if (error) throw error;
  return data;
}

async function buscarSolicitacoesPorCondutor(emailCondutor) {
  const { data, error } = await supabase
    .from('solicitacoes')
    .select('*')
    .or(`condutor_ida.eq.${emailCondutor},condutor_volta.eq.${emailCondutor}`)
    .order('data_viagem', { ascending: false });
  if (error) throw error;
  return data;
}

async function atualizarSolicitacao(id, dados) {
  const { data, error } = await supabase
    .from('solicitacoes')
    .update(dados)
    .eq('id', id);
  if (error) throw error;
  return data;
}

async function excluirSolicitacao(id) {
  const { error } = await supabase
    .from('solicitacoes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// LOCAIS
// ============================================================

async function listarLocais() {
  const { data, error } = await supabase
    .from('locais')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data;
}

async function adicionarLocal(nome) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('tabelas_apoio')
    .select('*')
    .order('unidade');
  if (error) throw error;
  return data;
}

async function listarUnidades() {
  const { data, error } = await supabase
    .from('tabelas_apoio')
    .select('unidade')
    .order('unidade');
  if (error) throw error;
  // Retorna valores únicos
  const unidades = [...new Set(data.map(item => item.unidade))];
  return unidades;
}

async function listarSetoresPorUnidade(unidade) {
  const { data, error } = await supabase
    .from('tabelas_apoio')
    .select('setor, email')
    .eq('unidade', unidade)
    .order('setor');
  if (error) throw error;
  return data;
}

async function adicionarTabelaApoio(dados) {
  const { data, error } = await supabase
    .from('tabelas_apoio')
    .insert(dados)
    .select();
  if (error) throw error;
  return data[0];
}

// ============================================================
// NOTIFICACOES
// ============================================================

async function criarNotificacao(dados) {
  const { data, error } = await supabase
    .from('notificacoes')
    .insert(dados)
    .select();
  if (error) throw error;
  return data[0];
}

async function buscarNotificacoes(email) {
  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .eq('email_destinatario', email)
    .order('data_hora', { ascending: false });
  if (error) throw error;
  return data;
}

async function marcarNotificacaoLida(id) {
  const { data, error } = await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('id', id);
  if (error) throw error;
  return data;
}

async function contarNaoLidas(email) {
  const { count, error } = await supabase
    .from('notificacoes')
    .select('*', { count: 'exact', head: true })
    .eq('email_destinatario', email)
    .eq('lida', false);
  if (error) throw error;
  return count;
}

// ============================================================
// REGISTROS DE KM
// ============================================================

async function registrarKM(dados) {
  const { data, error } = await supabase
    .from('registros_km')
    .insert(dados)
    .select();
  if (error) throw error;
  return data[0];
}

async function buscarKM_porData(emailCondutor, data) {
  const { data: resultado, error } = await supabase
    .from('registros_km')
    .select('*')
    .eq('email_condutor', emailCondutor)
    .eq('data', data)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = não encontrado
  return resultado;
}

async function buscarKM_porPeriodo(emailCondutor, dataIni, dataFim) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('registros_km')
    .update(dados)
    .eq('id', id);
  if (error) throw error;
  return data;
}

async function excluirKM(id) {
  const { error } = await supabase
    .from('registros_km')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function listarTodosKM() {
  const { data, error } = await supabase
    .from('registros_km')
    .select('*')
    .order('data', { ascending: false });
  if (error) throw error;
  return data;
}
