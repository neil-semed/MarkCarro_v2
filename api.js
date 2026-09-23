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

  // CORREÇÃO ("não cria [solicitante]"): quando o e-mail já tem conta
  // (ex.: alguém tenta se auto-cadastrar de novo depois de já ter sido
  // cadastrado pelo Admin, ou depois de uma tentativa anterior que
  // pareceu não ter funcionado), o Supabase NÃO devolve erro - só um
  // "usuário" com identities: [] e SEM criar nada de novo. Sem esta
  // checagem, o app seguia como se fosse um cadastro novo e chamava
  // completarCadastroProprio() (RPC) pra completar o perfil - só que
  // essa RPC só aceita completar uma conta criada nos ÚLTIMOS 15 MINUTOS
  // (proteção contra sobrescrever perfil de outra pessoa só por saber o
  // e-mail dela), então uma conta mais antiga sempre batia nesse limite e
  // devolvia "Cadastro não encontrado ou expirado" - uma mensagem
  // confusa pra quem só estava tentando se cadastrar nesse e-mail de
  // novo. Agora avisa direto, sem passar pela RPC.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('Este e-mail já tem conta no sistema. Volte e faça login, ou use "Esqueci minha senha". Se não conseguir entrar, peça pro Admin conferir em Gerenciar Usuários/Condutores.');
  }

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
    // "criado_por_admin: true" marca esta conta pro gatilho do banco
    // confirmar o e-mail sozinho (ver supabase_auto_confirmar_criados_por_admin.sql)
    // - sem isso, se "Confirm email" estiver ligado no projeto Supabase, o
    // condutor/usuário criado aqui pelo admin fica com a conta criada mas
    // NUNCA consegue logar (e-mail não confirmado, e ele nunca recebe/
    // clica em confirmação nenhuma, já que quem cadastrou foi o admin).
    options: { data: Object.assign({ criado_por_admin: true }, metaDados || {}) }
  });

  if (sessaoAntes) {
    await _sb.auth.setSession({
      access_token: sessaoAntes.access_token,
      refresh_token: sessaoAntes.refresh_token
    });
  }

  if (error) throw error;

  // CORREÇÃO (bug "super grave": "não salva o cadastro de motorista novo"):
  // quando o e-mail já existe no sistema de autenticação (com qualquer
  // perfil), o Supabase NÃO devolve erro nenhum por segurança (evita
  // revelar quais e-mails já têm conta) - só devolve um "usuário" com
  // identities: [] (array vazio) e SEM criar nada de verdade. Isso passava
  // batido como sucesso: o gatilho que cria a linha em profiles nunca
  // rodava (usuário novo nenhum foi inserido), e a atualização seguinte
  // (telefone/placa/CNH etc.) não achava ninguém pra atualizar - o
  // formulário limpava e mostrava "cadastrado!" sem ter salvo nada.
  //
  // CORREÇÃO 2 (raiz real do "continua sem criar usuário" nos casos
  // Gilberto/Evandro): esse "e-mail já existe" também acontece quando o
  // Gestor excluiu o condutor/usuário direto na tabela "profiles" pelo
  // editor do Supabase, achando que isso apaga tudo. Não apaga: a conta de
  // login em auth.users fica órfã (profiles.id -> auth.users(id) ON DELETE
  // CASCADE só funciona nesse sentido, nunca no contrário), e toda nova
  // tentativa de cadastro com o mesmo e-mail cai sempre neste mesmo "já
  // existe", travando pra sempre sem nenhuma ação manual no banco. Em vez
  // de travar, agora "adotamos" essa conta órfã: buscamos o id dela e
  // seguimos o fluxo normal (admin_upsert_perfil/admin_confirmar_email já
  // preenchem o perfil completo com os dados do formulário).
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    const idExistente = await adminBuscarIdPorEmail(email);
    if (!idExistente) {
      throw new Error('Este e-mail já está cadastrado no sistema de login, mas não foi possível localizar a conta para completá-la. Tente novamente ou cadastre com outro e-mail.');
    }
    return { user: { id: idExistente }, session: null, contaAdotada: true };
  }
  if (!data?.user?.id) {
    throw new Error('O Supabase não retornou o novo usuário criado. Tente novamente.');
  }

  return data; // { user, session } do usuário recém-criado
}

// Ver comentário "CORREÇÃO 2" acima em criarUsuarioComoAdmin(): busca o id
// de uma conta de login (auth.users) já existente por e-mail, usada só
// para "adotar" contas órfãs (login existente sem profiles correspondente,
// geralmente criadas por exclusão manual da linha em profiles no Supabase).
// Ver supabase_admin_buscar_id_por_email.sql.
async function adminBuscarIdPorEmail(email) {
  _checarClient();
  const { data, error } = await _sb.rpc('admin_buscar_id_por_email', { p_email: email });
  if (error) throw error;
  return data || null;
}

// Ver criarUsuarioComoAdmin() acima e handle_new_user() no banco - usada só
// na hora de CRIAR (não editar) um condutor/usuário pelo Admin, logo depois
// de criarUsuarioComoAdmin(): o gatilho handle_new_user() já devia ter
// criado a linha em profiles (roda na mesma transação do signUp), mas o
// Supabase às vezes demora um instante pra essa linha ficar visível pra
// esta próxima consulta (PostgREST/réplica) - sem isso, o UPDATE abaixo não
// encontrava ninguém (0 linhas, SEM erro nenhum) e o app dizia
// "cadastrado!" mesmo sem ter salvo telefone/placa/CNH/unidade/setor etc.
// Agora tenta de novo 1x depois de uma pequena espera, e avisa claramente
// se mesmo assim não achar a linha - nunca mais finge sucesso.
async function atualizarPerfilPorEmailComVerificacao(email, dados) {
  let atualizado = await atualizarPerfilPorEmail(email, dados);
  if (atualizado && atualizado.length) return atualizado;

  await new Promise(resolve => setTimeout(resolve, 1200));
  atualizado = await atualizarPerfilPorEmail(email, dados);
  if (atualizado && atualizado.length) return atualizado;

  throw new Error('A conta de login foi criada, mas o perfil (telefone/placa/CNH/unidade/setor etc.) não foi encontrado para completar o cadastro. Tente "Editar" na lista em alguns segundos - se continuar faltando, avise o suporte.');
}

// SUBSTITUI atualizarPerfilPorEmailComVerificacao() na criação de novo
// condutor/usuário pelo Admin (gerenciar-condutores.js/gerenciar-
// usuarios.js): em vez de esperar o gatilho handle_new_user() criar a
// linha e torcer pra ela já estar visível (retry com espera de 1.2s, que
// mesmo assim continuava falhando às vezes), chama uma função do banco
// (admin_upsert_perfil, ver supabase_fix_criar_usuario_rpc.sql) que
// GRAVA o perfil completo direto - se o gatilho já criou a linha,
// completa ela (INSERT ... ON CONFLICT DO UPDATE); se o gatilho ainda
// não rodou ou falhou por qualquer motivo, cria a linha inteira na hora,
// sem depender dele. Roda IMEDIATAMENTE após criarUsuarioComoAdmin(),
// sem nenhuma espera.
async function adminUpsertPerfil(userId, dados) {
  _checarClient();
  const { error } = await _sb.rpc('admin_upsert_perfil', { p_user_id: userId, p_dados: dados });
  if (error) throw error;
}

// CORREÇÃO (6ª tentativa - "continua sem criar usuário"): confirmação de
// e-mail de conta criada pelo Admin deixou de ser um gatilho em auth.users
// (suspeito de estar bloqueando a criação da conta inteira) e virou esta
// chamada separada, feita DEPOIS que a conta já existe de verdade - ver
// supabase_fix_signup_definitivo.sql (admin_confirmar_email). Erro aqui
// nunca deve impedir o cadastro de completar (a conta e o perfil já foram
// criados antes desta chamada) - por isso é sempre envolvida num try/catch
// não-bloqueante em quem chama.
async function adminConfirmarEmail(userId) {
  _checarClient();
  const { error } = await _sb.rpc('admin_confirmar_email', { p_user_id: userId });
  if (error) throw error;
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

// CORREÇÃO ("não cria solicitante" no auto-cadastro público): usada só
// logo depois do signUp() da tela "Criar conta", pra completar
// telefone/Unidade/Setor/placa/etc. Antes essa etapa chamava
// atualizarPerfil() (UPDATE direto, sujeito a RLS) - se o projeto
// Supabase exige confirmação de e-mail, signUp() não devolve sessão
// nenhuma, então esse UPDATE rodava sem login (anônimo) e a política
// "Usuario atualiza proprio perfil" (exige auth.uid() = id) sempre
// bloqueava silenciosamente (0 linhas afetadas, sem erro) - a conta de
// login era criada, mas telefone/Unidade/Setor nunca eram salvos, e o
// app mesmo assim mostrava "Cadastro realizado!". Esta RPC (SECURITY
// DEFINER, ver supabase_fix_completar_cadastro_solicitante.sql) roda
// por fora do RLS - só aceita completar um cadastro criado nos últimos
// 15 minutos (a própria conta recém-criada), nunca um perfil antigo ou
// de outra pessoa.
async function completarCadastroProprio(userId, dados) {
  _checarClient();
  const { error } = await _sb.rpc('completar_cadastro_proprio', { p_user_id: userId, p_dados: dados });
  if (error) throw error;
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

// CORREÇÃO (pedido do usuário, 5ª vez: "Agenda carrega todas as viagens
// aprovadas de todos os motoristas - o nome dos motoristas tem que
// aparecer nos cards"): listarCondutores() acima filtra "ativo = true" de
// propósito - é o que preenche o <select> de ATRIBUIR motorista numa
// viagem nova (Gerenciamento de Solicitações, Nova Solicitação pelo
// Admin), e ali é certo não oferecer um condutor bloqueado. O PROBLEMA é
// que Agenda de Corridas, Agenda Geral do Condutor, Viagens do Dia e
// Minhas Solicitações usam essa MESMA lista só pra RESOLVER O NOME a
// partir do e-mail de uma viagem JÁ CONFIRMADA - e qualquer condutor
// desativado depois (ou que tenha ficado com "ativo" nulo por causa do
// bug antigo do gatilho do banco) simplesmente sumia dessa lista, e a
// viagem dele passava a mostrar o e-mail cru em vez do nome. Esta função
// é igual, sem o filtro de "ativo" - só pra exibição, nunca pra
// preencher um <select> de atribuição.
async function listarCondutoresParaExibicao() {
  _checarClient();
  const { data, error } = await _sb
    .from('profiles')
    .select('*')
    .eq('tipo', 'condutor')
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

// ============================================================
// AGENDA COMBINADA (MarkCarro + Bora Lá) - só LEITURA
// ============================================================
// Busca no OUTRO projeto Supabase (Bora Lá, excursões escolares) quais
// placas já estão ocupadas no período, via a Edge Function "agenda-
// veiculos" (ver README entregue com o código dela) - não dá pra usar o
// client normal (_sb) porque é outro projeto/projeto diferente, com login
// e RLS próprios; por isso fetch() direto, com a anon key do Bora Lá.
async function buscarAgendaBoraLa(dataIni, dataFim) {
  const url = `${CONFIG.BORA_LA_AGENDA_URL}?desde=${encodeURIComponent(dataIni)}&ate=${encodeURIComponent(dataFim)}`;
  const resp = await fetch(url, {
    headers: {
      'apikey': CONFIG.BORA_LA_ANON_KEY,
      'Authorization': `Bearer ${CONFIG.BORA_LA_ANON_KEY}`
    }
  });
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(corpo?.error || 'Erro ao buscar agenda do Bora Lá');
  return corpo.data || [];
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

// Insere vários Setores de uma vez (usado pela tela Gerenciar Unidades
// quando o admin escolhe "Aplicar em: Todas as Unidades" ou "Todas de um
// Tipo" - grava uma linha em tabelas_apoio por Unidade alcançada, com o
// mesmo nome de Setor/e-mail).
async function adicionarTabelasApoioEmLote(linhas) {
  _checarClient();
  const { data, error } = await _sb
    .from('tabelas_apoio')
    .insert(linhas)
    .select();
  if (error) throw error;
  return data;
}

async function atualizarTabelaApoio(id, dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('tabelas_apoio')
    .update(dados)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data;
}

async function excluirTabelaApoio(id) {
  _checarClient();
  const { error } = await _sb
    .from('tabelas_apoio')
    .delete()
    .eq('id', id);
  if (error) throw error;
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
// COOPERATIVAS (vínculo do Condutor - nome/e-mail/telefone, Editar/
// Bloquear igual a Unidades)
// ============================================================

async function listarTodasCooperativas() {
  _checarClient();
  const { data, error } = await _sb
    .from('cooperativas')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data;
}

// Usada pelo dropdown "Cooperativa" em Gerenciar Condutores - só as ativas,
// pra não deixar escolher uma cooperativa já bloqueada num condutor novo.
async function listarCooperativasAtivas() {
  _checarClient();
  const { data, error } = await _sb
    .from('cooperativas')
    .select('*')
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return data;
}

async function criarCooperativa(dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('cooperativas')
    .insert(dados)
    .select();
  if (error) throw error;
  return data[0];
}

async function atualizarCooperativa(id, dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('cooperativas')
    .update(dados)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data;
}

// ============================================================
// PERFIS DE ACESSO (papéis customizados: nome, unidade/setor, telas
// permitidas, bloqueado) - tabela "perfis_acesso", ver
// supabase_criar_perfis_acesso.sql
// ============================================================

async function listarPerfisAcesso() {
  _checarClient();
  const { data, error } = await _sb
    .from('perfis_acesso')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data;
}

async function criarPerfilAcesso(dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('perfis_acesso')
    .insert(dados)
    .select();
  if (error) throw error;
  return data[0];
}

async function atualizarPerfilAcesso(id, dados) {
  _checarClient();
  const { data, error } = await _sb
    .from('perfis_acesso')
    .update(dados)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data;
}

async function excluirPerfilAcesso(id) {
  _checarClient();
  const { error } = await _sb
    .from('perfis_acesso')
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

// PEDIDO DO USUÁRIO ("criar opção para limpar as notificações"): apaga
// TODAS as notificações do usuário (não só marca como lida) - usado pelo
// botão "Limpar" na tela de Alertas (pages/notificacoes.js) e no
// painelzinho do sino (pages/login.js, só Admin).
async function excluirTodasNotificacoes(email) {
  _checarClient();
  const { error } = await _sb
    .from('notificacoes')
    .delete()
    .eq('email_destinatario', email);
  if (error) throw error;
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
// A partir daqui, os registros de KM (odômetro início/fim do dia) NÃO
// ficam mais na tabela local registros_km - passam a ser salvos no banco
// do Bora Lá (tabela driver_km_logs), via a Edge Function km-bridge.
// Motivo (pedido do usuário): o mesmo motorista roda pelos 2 sistemas
// (MarkCarro e Bora Lá) - se cada um guardasse KM na sua própria tabela,
// dava pra abrir o dia num app e nunca conseguir fechar no outro. Com os 2
// apontando pro mesmo registro (achado pelo e-mail do condutor), o
// motorista pode abrir pelo MarkCarro de manhã e fechar pelo Bora Lá à
// tarde, ou vice-versa, sem duplicar nada.
//
// A tabela antiga registros_km NÃO é apagada nem migrada (pedido do
// usuário, "Começar do zero") - fica congelada como histórico; só fica
// inacessível por aqui porque estas 6 funções passam a ler/gravar só no
// Bora Lá a partir de agora.
//
// Identidade: quem autoriza cada chamada é o PRÓPRIO MarkCarro - a função
// valida o token de sessão de quem está logado aqui, chamando de volta o
// nosso auth server, então cada condutor só mexe no seu próprio registro
// (e o Admin do MarkCarro, em qualquer um) - ver comentário completo no
// topo do km-bridge/index.ts.

async function _chamarKmBridge(action, params) {
  _checarClient();
  const { data: { session } } = await _sb.auth.getSession();
  if (!session) throw new Error('Sessão expirada. Faça login novamente.');

  const resp = await fetch(CONFIG.BORA_LA_KM_BRIDGE_URL, {
    method: 'POST',
    headers: {
      'apikey': CONFIG.BORA_LA_ANON_KEY,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, ...params })
  });
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(corpo?.error || 'Erro ao falar com o registro de KM.');
  return corpo;
}

// Acha o CNH de um condutor pelo e-mail, do jeito mais barato disponível no
// momento (sem chamada extra ao banco): o próprio usuário logado, ou a lista
// de condutores já carregada na tela (cacheCondutores/cacheCondutoresParaExibicao,
// preenchidas por listarCondutores()/listarCondutoresParaExibicao() - já vem
// com "cnh" junto, select('*') em profiles).
function _cnhCondutor(email) {
  if (!email) return undefined;
  if (email === usuarioAtual?.email) return usuarioAtual?.cnh;
  const listas = [
    typeof cacheCondutores !== 'undefined' ? cacheCondutores : null,
    typeof cacheCondutoresParaExibicao !== 'undefined' ? cacheCondutoresParaExibicao : null,
  ];
  for (const lista of listas) {
    const c = lista?.find(c => c.email === email);
    if (c?.cnh) return c.cnh;
  }
  return undefined;
}

async function registrarKM(dados) {
  // dados: { email_condutor, data, km_inicial, km_final?, ajustado? }
  // nome_condutor é só pra dar um nome decente ao motorista, se ele ainda
  // não existir no Bora Lá e precisar ser criado automático - tenta o
  // próprio usuário logado (condutor abrindo seu KM) e, senão, a lista de
  // condutores já carregada na tela (admin criando registro de outra
  // pessoa, em pages/gerenciar-km.js).
  //
  // cnh_condutor (CORREÇÃO - motorista já cadastrado no Bora Lá sem e-mail
  // preenchido virava um cadastro DUPLICADO lá, e o KM gravado pelo MarkCarro
  // ia pro duplicado vazio em vez do cadastro de verdade, que já tinha
  // histórico): manda a CNH junto - é a mesma chave que já existe nos dois
  // sistemas antes de qualquer migration, então o km-bridge consegue achar o
  // cadastro certo mesmo sem e-mail ainda vinculado (ver
  // supabase_km_bridge_migration.sql / km-bridge/index.ts).
  let nome_condutor;
  if (dados.email_condutor === usuarioAtual?.email) nome_condutor = usuarioAtual?.nome;
  else if (typeof cacheCondutores !== 'undefined' && cacheCondutores) nome_condutor = cacheCondutores.find(c => c.email === dados.email_condutor)?.nome;
  const cnh_condutor = _cnhCondutor(dados.email_condutor);

  const corpo = await _chamarKmBridge('registrar', { ...dados, nome_condutor, cnh_condutor });
  return corpo.data;
}

async function buscarKM_porData(emailCondutor, data) {
  const corpo = await _chamarKmBridge('buscar_data', { email_condutor: emailCondutor, data, cnh_condutor: _cnhCondutor(emailCondutor) });
  return corpo.data;
}

async function buscarKM_porPeriodo(emailCondutor, dataIni, dataFim) {
  const corpo = await _chamarKmBridge('buscar_periodo', { email_condutor: emailCondutor, data_ini: dataIni, data_fim: dataFim, cnh_condutor: _cnhCondutor(emailCondutor) });
  return corpo.data;
}

async function atualizarKM(id, dados) {
  // dados pode trazer: data, km_inicial, km_final, ajustado (e, sem efeito
  // aqui, email_condutor - o "dono" do registro não muda numa edição)
  const corpo = await _chamarKmBridge('atualizar', { id, ...dados });
  return corpo.data;
}

async function excluirKM(id) {
  await _chamarKmBridge('excluir', { id });
}

// PEDIDO DO USUÁRIO ("não busca nem o que está na base do markcarro"): a
// tela Gerenciar KM some por completo quando o km-bridge (Bora Lá) dá erro
// - e os registros ANTIGOS (antes da migration pro km-bridge) continuam
// existindo na tabela local registros_km (congelada, nunca foi apagada nem
// migrada, ver comentário grande acima). Agora busca as duas fontes em
// paralelo: se uma falhar, mostra a outra em vez de travar tudo (Promise.
// allSettled) - só lança erro de verdade se as DUAS falharem. Registros
// antigos vêm marcados com _legado:true - a UI usa isso pra desabilitar
// Editar/Excluir neles (esses ids não existem no km-bridge/Bora Lá).
async function listarTodosKM() {
  const [doLegado, doBridge] = await Promise.allSettled([
    (async () => {
      _checarClient();
      const { data, error } = await _sb.from('registros_km').select('*').order('data', { ascending: false });
      if (error) throw error;
      return (data || []).map(r => ({ ...r, _legado: true }));
    })(),
    _chamarKmBridge('listar_todos', {}).then(corpo => corpo.data || []),
  ]);

  if (doLegado.status === 'rejected') console.error('Erro ao carregar KM (tabela local registros_km):', doLegado.reason);
  if (doBridge.status === 'rejected') console.error('Erro ao carregar KM (km-bridge/Bora Lá):', doBridge.reason);

  if (doLegado.status === 'rejected' && doBridge.status === 'rejected') {
    throw doBridge.reason || doLegado.reason;
  }

  const legado = doLegado.status === 'fulfilled' ? doLegado.value : [];
  const bridge = doBridge.status === 'fulfilled' ? doBridge.value : [];
  return [...bridge, ...legado];
}
