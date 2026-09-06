// ============================================================
// MARKCARRO - API Supabase (wrapper)
// ============================================================

async function sbRequest(method, path, body = null) {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': CONFIG.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  if (response.status === 204) return null;
  return response.json();
}

async function sbAuthRequest(action, data) {
  const url = `${CONFIG.SUPABASE_URL}/auth/v1/${action}`;
  const headers = {
    'apikey': CONFIG.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
  
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data) });
  const result = await response.json();
  
  if (!response.ok) throw new Error(result.msg || result.error_description || 'Auth error');
  return result;
}

async function supabaseLogin(email, senha) {
  return sbAuthRequest('token?grant_type=password', { email, password: senha });
}

async function supabaseCadastro(email, senha, metaDados) {
  return sbAuthRequest('signup', { email, password: senha, data: metaDados });
}

async function supabaseLogout() {
  return sbAuthRequest('logout', {});
}

async function supabaseSessao() {
  return sbAuthRequest('user', {});
}

async function supabaseUsuarioAtual() {
  const session = await supabaseSessao();
  return session?.user || null;
}

async function buscarPerfil(userId, email = null) {
  let data = await sbRequest('GET', `profiles?id=eq.${userId}&select=*`);
  if (data && data.length > 0) return data[0];
  
  if (email) {
    data = await sbRequest('GET', `profiles?email=eq.${encodeURIComponent(email)}&select=*`);
    if (data && data.length > 0) return data[0];
  }
  return null;
}

async function atualizarPerfil(userId, dados) {
  return sbRequest('PATCH', `profiles?id=eq.${userId}`, dados);
}

async function listarCondutores() {
  return sbRequest('GET', 'profiles?tipo=eq.condutor&ativo=eq.true&order=nome');
}

async function listarUsuarios() {
  return sbRequest('GET', 'profiles?order=nome');
}

async function criarSolicitacao(dados) {
  const data = await sbRequest('POST', 'solicitacoes?select=*', dados);
  return data?.[0] || null;
}

async function buscarSolicitacoesPorEmail(email) {
  return sbRequest('GET', `solicitacoes?email_solicitante=eq.${encodeURIComponent(email)}&order=data_solicitacao.desc`);
}

async function buscarTodasSolicitacoes() {
  return sbRequest('GET', 'solicitacoes?order=data_solicitacao.desc');
}

async function buscarSolicitacoesPorData(dataIni, dataFim) {
  return sbRequest('GET', `solicitacoes?data_viagem=gte.${dataIni}&data_viagem=lte.${dataFim}&order=data_viagem`);
}

async function buscarSolicitacoesPorCondutor(emailCondutor) {
  return sbRequest('GET', `solicitacoes?or=(condutor_ida.eq.${emailCondutor},condutor_volta.eq.${emailCondutor})&order=data_viagem.desc`);
}

async function atualizarSolicitacao(id, dados) {
  return sbRequest('PATCH', `solicitacoes?id=eq.${id}`, dados);
}

async function excluirSolicitacao(id) {
  return sbRequest('DELETE', `solicitacoes?id=eq.${id}`);
}

async function listarLocais() {
  return sbRequest('GET', 'locais?order=nome');
}

async function adicionarLocal(nome) {
  const data = await sbRequest('POST', 'locais?select=*', { nome });
  return data?.[0] || null;
}

async function listarTabelasApoio() {
  return sbRequest('GET', 'tabelas_apoio?order=unidade');
}

async function listarUnidades() {
  const data = await sbRequest('GET', 'tabelas_apoio?select=unidade&order=unidade');
  return [...new Set(data.map(item => item.unidade))];
}

async function listarSetoresPorUnidade(unidade) {
  return sbRequest('GET', `tabelas_apoio?unidade=eq.${encodeURIComponent(unidade)}&order=setor`);
}

async function adicionarTabelaApoio(dados) {
  const data = await sbRequest('POST', 'tabelas_apoio?select=*', dados);
  return data?.[0] || null;
}

async function criarNotificacao(dados) {
  const data = await sbRequest('POST', 'notificacoes?select=*', dados);
  return data?.[0] || null;
}

async function buscarNotificacoes(email) {
  return sbRequest('GET', `notificacoes?email_destinatario=eq.${encodeURIComponent(email)}&order=data_hora.desc`);
}

async function marcarNotificacaoLida(id) {
  return sbRequest('PATCH', `notificacoes?id=eq.${id}`, { lida: true });
}

async function contarNaoLidas(email) {
  const data = await sbRequest('GET', `notificacoes?email_destinatario=eq.${encodeURIComponent(email)}&lida=eq.false&select=id`);
  return data?.length || 0;
}

async function registrarKM(dados) {
  const data = await sbRequest('POST', 'registros_km?select=*', dados);
  return data?.[0] || null;
}

async function buscarKM_porData(emailCondutor, data) {
  const data_result = await sbRequest('GET', `registros_km?email_condutor=eq.${encodeURIComponent(emailCondutor)}&data=eq.${data}&select=*`);
  return data_result?.[0] || null;
}

async function buscarKM_porPeriodo(emailCondutor, dataIni, dataFim) {
  return sbRequest('GET', `registros_km?email_condutor=eq.${encodeURIComponent(emailCondutor)}&data=gte.${dataIni}&data=lte.${dataFim}&order=data.desc`);
}

async function atualizarKM(id, dados) {
  return sbRequest('PATCH', `registros_km?id=eq.${id}`, dados);
}

async function excluirKM(id) {
  return sbRequest('DELETE', `registros_km?id=eq.${id}`);
}

async function listarTodosKM() {
  return sbRequest('GET', 'registros_km?order=data.desc');
}