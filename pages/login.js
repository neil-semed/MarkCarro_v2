// ============================================================
// MARKCARRO - Página: Login
// ============================================================

let usuarioAtual = null;

function salvarSessao() {
  try {
    sessionStorage.setItem('markcarro_usuario', JSON.stringify(usuarioAtual));
  } catch (e) {}
}

function restaurarSessao() {
  // Só limpa a sessão se os dados salvos estiverem corrompidos (JSON
  // inválido). Erros de renderização das telas não devem apagar uma sessão
  // válida - por isso o try/catch cobre só a leitura/parse, não a chamada
  // das funções de tela.
  let salvo;
  try {
    salvo = sessionStorage.getItem('markcarro_usuario');
    if (!salvo) return;
    usuarioAtual = JSON.parse(salvo);
  } catch (e) {
    sessionStorage.removeItem('markcarro_usuario');
    return;
  }
  carregarSaudacao();
  carregarPainelPorPerfil();
}

async function processarLogin() {
  const emailInput = document.getElementById('login-email');
  const senhaInput = document.getElementById('login-senha');
  
  console.log('[DEBUG] emailInput:', emailInput);
  console.log('[DEBUG] senhaInput:', senhaInput);
  
  const email = emailInput?.value?.trim().toLowerCase();
  const senha = senhaInput?.value;
  
  console.log('[DEBUG] email:', email);
  console.log('[DEBUG] senha:', senha ? '***' : 'vazio');
  
  if (!email || !senha) {
    Components.Toast.error('Preencha e-mail e senha');
    return;
  }
  
  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Entrando...';

  try {
    const resultado = await supabaseLogin(email, senha);

    if (resultado && resultado.user) {
      const perfil = await buscarPerfil(resultado.user.id, resultado.user.email);

      if (perfil) {
        if (!perfil.ativo) {
          Components.Toast.error('Seu perfil está inativo. Entre em contato com o administrador.');
          btn.disabled = false;
          btn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a1 1 0 01-1 1h-1"/></svg> Entrar</span>';
          return;
        }

        usuarioAtual = {
          id: perfil.id || resultado.user.id,
          nome: perfil.nome,
          email: perfil.email,
          tipo: perfil.tipo,
          telefone: perfil.telefone,
          unidade: perfil.unidade,
          setor: perfil.setor,
          placa: perfil.placa,
          modelo: perfil.modelo,
          capacidade: perfil.capacidade,
          categoria: perfil.categoria,
          cnh: perfil.cnh,
          validade_cnh: perfil.validade_cnh,
          ativo: perfil.ativo,
          ver_agenda_geral: perfil.ver_agenda_geral
        };

        salvarSessao();
        Components.Toast.success(`Bem-vindo, ${usuarioAtual.nome}!`);
        carregarSaudacao();
        carregarPainelPorPerfil();
      } else {
        Components.Toast.error('Perfil não encontrado. Complete seu cadastro ou contate o admin.');
      }
    }
  } catch (erro) {
    console.error('Erro no login:', erro);
    Components.Toast.error('Erro no login: ' + (erro.message || 'Verifique e-mail e senha.'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a1 1 0 01-1 1h-1"/></svg> Entrar</span>';
  }
}

async function fazerLogout() {
  // A troca de tela acontece IMEDIATAMENTE, sem esperar a resposta do
  // Supabase. Antes, o "await supabaseLogout()" vinha primeiro - numa
  // conexão lenta/instável (ou se o pedido de rede simplesmente demorasse),
  // a tela ficava sem nenhum feedback visual por vários segundos, dando a
  // impressão de estar travada ("congelando"). O signOut no Supabase agora
  // roda em segundo plano, best-effort: mesmo que falhe ou demore, o
  // usuário já saiu localmente (sessão local limpa) e voltou pro login.
  fecharMenuMobile();
  pararAvisosTempoReal();
  usuarioAtual = null;
  sessionStorage.removeItem('markcarro_usuario');

  document.getElementById('app-principal').classList.add('hidden');
  document.getElementById('tela-login').classList.remove('hidden');
  document.getElementById('form-login')?.reset();
  Components.Toast.info('Você saiu do sistema.');

  try {
    await supabaseLogout();
  } catch (e) {
    console.warn('Erro no logout Supabase:', e);
  }
}

function carregarSaudacao() {
  if (!usuarioAtual) return;
  const hora = new Date().getHours();
  let saudacao = 'Boa noite';
  if (hora >= 5 && hora < 12) saudacao = 'Bom dia';
  else if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';

  // Os elementos abaixo usam "?." de propósito: um elemento removido ou
  // renomeado no HTML não pode voltar a quebrar a função inteira (e com ela
  // a restauração de sessão), como já aconteceu antes (ver comentário mais
  // abaixo, em carregarPainelPorPerfil).
  const elEmailMenu = document.getElementById('usuario-email');
  if (elEmailMenu) elEmailMenu.textContent = usuarioAtual.email;
  const elPerfilMenu = document.getElementById('usuario-perfil');
  if (elPerfilMenu) elPerfilMenu.textContent = usuarioAtual.tipo;

  // Saudação em destaque no topo (ao lado do sino): agora em duas linhas -
  // "Bom dia!" e, embaixo, "Nome (perfil)" - a pedido do usuário, no lugar
  // do avatar com iniciais (que repetia a mesma informação) e do "Perfil: X"
  // que antes ficava do lado da logo (a logo também saiu do header - fica
  // só na tela de login agora).
  const elSaudacao = document.getElementById('saudacao-usuario');
  const elNomePerfil = document.getElementById('saudacao-nome-perfil');

  // CORREÇÃO (pedido do usuário, Solicitante e Condutor: "quebre o texto da
  // saudação - Bom dia numa linha e CRISTIANO! em outra"): antes ficava tudo
  // numa linha só ("Bom dia Cristiano!"), que empurrava o botão Sair pra
  // fora da tela no celular (linha do header sem quebra, "overflow-x-auto"
  // pro Condutor). Agora usa as 2 linhas que o bloco já tinha
  // (saudacao-usuario / saudacao-nome-perfil), reduzindo a largura ocupada.
  if (usuarioAtual.tipo?.toLowerCase() === 'solicitante') {
    const primeiroNome = (usuarioAtual.nome || '').trim().split(/\s+/)[0] || '';
    if (elSaudacao) elSaudacao.textContent = saudacao;
    if (elNomePerfil) { elNomePerfil.textContent = primeiroNome ? `${primeiroNome}!` : ''; elNomePerfil.classList.remove('hidden'); }
  } else if (usuarioAtual.tipo?.toLowerCase() === 'condutor') {
    // Condutor (pedido do usuário, exemplo do print: "Bom dia SÉRGIO!") -
    // mesma quebra em 2 linhas do Solicitante, com o primeiro nome em
    // maiúsculas.
    const primeiroNome = (usuarioAtual.nome || '').trim().split(/\s+/)[0] || '';
    if (elSaudacao) elSaudacao.textContent = saudacao;
    if (elNomePerfil) { elNomePerfil.textContent = primeiroNome ? `${primeiroNome.toUpperCase()}!` : ''; elNomePerfil.classList.remove('hidden'); }
  } else {
    if (elSaudacao) elSaudacao.textContent = `${saudacao}!`;
    if (elNomePerfil) { elNomePerfil.classList.remove('hidden'); elNomePerfil.textContent = `${usuarioAtual.nome} (${usuarioAtual.tipo?.toLowerCase() || ''})`; }
  }
}

function carregarPainelPorPerfil() {
  document.getElementById('tela-login').classList.add('hidden');
  document.getElementById('app-principal').classList.remove('hidden');

  const tipo = usuarioAtual?.tipo?.toLowerCase();

  // Esconder todos os botões de navegação do header primeiro - EXCETO o sino
  // e o menu do usuário, que não são botões "por perfil" e sim utilitários
  // fixos do header (ficam dentro de um dropdown próprio, sempre presentes).
  //
  // IMPORTANTE: este bloco (e o if/else logo abaixo) chamava
  // getElementById('btn-agenda-condutor'), ('btn-registrar-km'),
  // ('btn-nova-solicitacao') e ('btn-minhas-solicitacoes') SEM "?." - ids que
  // não existem mais no HTML atual (viraram "topo-*" quando os botões do
  // Condutor/Solicitante passaram a ficar no topo, no PC). Chamar
  // .classList em null lançava TypeError e interrompia esta função NA HORA,
  // antes de: ativar a gaveta lateral, mostrar os botões certos, e o mais
  // grave, ANTES de abrir a tela inicial do perfil (abrirPainelDoDia /
  // abrirMinhasSolicitacoes nunca eram chamadas) - por isso Condutor e
  // Solicitante pareciam "travados"/sem reagir a nada logo após o login, e
  // o mesmo erro (relançado por restaurarSessao()) também apagava a sessão
  // salva a cada F5. Corrigido usando os ids atuais, todos com "?.".
  // CORREÇÃO (pedido do usuário: "tirar ícone de sino do topo - já está no
  // rodapé"): agora que Condutor/Solicitante têm a aba "Alertas" própria
  // (rodapé/pílulas), o sino do topo virou duplicado pra esses dois perfis
  // - ele sai da exceção do reset genérico (era sempre visível antes) e só
  // volta a aparecer explicitamente pro Admin, mais abaixo, que não tem
  // aba Alertas e continua dependendo do sino + painelzinho.
  document.querySelectorAll('#app-principal header button[id^="btn-"]').forEach(btn => {
    if (btn.id !== 'btn-usuario-menu') btn.classList.add('hidden');
  });
  // Barra de pílulas do Condutor/Solicitante no topo (PC, ids "topo-*") -
  // não começam com "btn-", então precisam do próprio reset aqui.
  document.querySelectorAll('#header-nav-admin [id^="topo-"]').forEach(btn => btn.classList.add('hidden'));

  // Reset dos itens exclusivos do topo do Solicitante (saudação
  // centralizada, botão Sair direto) - sem isso, trocar de perfil na mesma
  // sessão do navegador (logout + login com outro usuário) deixava esses
  // ajustes "grudados" pros outros perfis.
  {
    const bloco = document.getElementById('bloco-saudacao');
    if (bloco) {
      bloco.classList.remove('flex-1', 'text-center');
      bloco.classList.add('text-right', 'max-w-[112px]', 'sm:max-w-none');
    }
  }
  // Elementos que não começam com "btn-" não são pegos pelo reset genérico
  // acima (btn-pane-topo-condutor já é, por começar com "btn-") - precisam
  // de reset próprio aqui. header-titulo-marca-padrao volta a ficar visível
  // por padrão (só o Solicitante esconde, mais abaixo).
  //
  // CORREÇÃO (pedido do usuário): os botões "Avisos" e "Menu" da barra
  // inferior foram removidos do HTML (eram redundantes com o sino e o
  // menu do avatar, que já ficam sempre visíveis no topo) - não há mais
  // "bnav-menu" nem exceção nenhuma a fazer aqui: o reset genérico da
  // barra inferior agora esconde tudo mesmo, sem exceção.
  document.getElementById('header-marca-solicitante')?.classList.add('hidden');
  document.getElementById('header-marca-texto-solicitante')?.classList.add('hidden');
  document.getElementById('header-titulo-marca-padrao')?.classList.remove('hidden');
  // Faixa do topo volta a poder quebrar linha por padrão - só o Condutor
  // força linha única (ver o "else if (tipo === 'condutor')" mais abaixo).
  document.getElementById('header-linha-principal')?.classList.remove('flex-nowrap', 'overflow-x-auto');
  document.getElementById('header-linha-principal')?.classList.add('flex-wrap');

  // Barra de navegação inferior (mobile) - mesmo princípio: esconde tudo
  // e mostra só os itens do perfil atual.
  document.querySelectorAll('#bottom-nav [data-aba]').forEach(el => el.classList.add('hidden'));

  // Menu lateral = gaveta (celular, só Condutor/Solicitante) - começa
  // escondendo tudo, desativando a coluna e fechando a gaveta (caso tivesse
  // ficado aberta de uma sessão anterior), igual ao header e à barra
  // inferior acima. O botão ☰ que abre a gaveta segue o mesmo princípio.
  const sidebar = document.getElementById('sidebar-nav');
  sidebar?.classList.remove('sidebar-ativa');
  fecharMenuLateral();
  document.querySelectorAll('#sidebar-nav button').forEach(btn => btn.classList.add('hidden'));
  document.getElementById('btn-menu-lateral')?.classList.add('hidden');

  if (tipo === 'admin') {
    document.getElementById('btn-painel-gestor').classList.remove('hidden');
    document.getElementById('btn-gerenciamento-solicitacoes')?.classList.remove('hidden');
    document.getElementById('btn-ir-agenda').classList.remove('hidden');
    document.getElementById('btn-agenda-combinada')?.classList.remove('hidden');
    document.getElementById('btn-nova-solicitacao-gestor').classList.remove('hidden');
    document.getElementById('btn-gerenciar-condutores').classList.remove('hidden');
    document.getElementById('btn-gerenciar-km').classList.remove('hidden');
    document.getElementById('btn-gerenciar-usuarios').classList.remove('hidden');
    document.getElementById('btn-gerenciar-unidades')?.classList.remove('hidden');
    document.getElementById('btn-gerenciar-cooperativas')?.classList.remove('hidden');
    document.getElementById('btn-gerenciar-perfis-acesso')?.classList.remove('hidden');
    document.getElementById('btn-senha-pill')?.classList.remove('hidden');
    document.getElementById('btn-sair-pill')?.classList.remove('hidden');
    // Admin não tem aba "Alertas" própria (essa aba só existe pro
    // Condutor/Solicitante) - continua dependendo do sino + painelzinho
    // pra ver notificações, então é o único perfil que o mantém visível.
    document.getElementById('btn-sino')?.classList.remove('hidden');
    // Admin não usa gaveta, nem a barra de pílulas do Condutor/Solicitante,
    // nem o botão ☰ - continua só com as pílulas fixas acima, em qualquer
    // tamanho de tela.
    abrirPainelGestor();
  } else if (tipo === 'condutor') {
    // PC: barra de pílulas fixa no topo.
    document.getElementById('topo-dashboard-condutor')?.classList.remove('hidden');
    document.getElementById('topo-hoje-condutor')?.classList.remove('hidden');
    document.getElementById('topo-solicitacoes-condutor')?.classList.remove('hidden');
    document.getElementById('topo-registrar-km')?.classList.remove('hidden');
    document.getElementById('topo-proximas-agendas')?.classList.remove('hidden');
    document.getElementById('topo-alertas-condutor')?.classList.remove('hidden');
    // "topo-senha-cs"/"topo-sair-cs" removidos do HTML (duplicavam
    // btn-senha-topo/btn-sair-topo, mais abaixo) - nada a mostrar aqui.
    // CORREÇÃO (pedido do usuário): tirado o menu lateral (☰ + gaveta) do
    // Condutor, no topo e no rodapé - "btn-menu-lateral" e "sidebar-ativa"
    // ficam com o reset padrão (ocultos/desativados) feito mais acima;
    // nada a reativar aqui. Sem a gaveta, "Alterar Senha" continua acessível
    // pelo menu do avatar (btn-usuario-menu, sempre visível no header).
    // Barra inferior (celular) - navegação principal do Condutor, na
    // ordem pedida pelo usuário: dashboards | hoje | próximas | agenda
    // geral | km ("Avisos" e "Menu" não existem mais aqui - ver o
    // comentário no reset genérico, mais acima, e no HTML do #bottom-nav).
    document.getElementById('bnav-dashboard-condutor')?.classList.remove('hidden');
    document.getElementById('bnav-painel-dia')?.classList.remove('hidden');
    document.getElementById('bnav-agenda-condutor')?.classList.remove('hidden');
    document.getElementById('bnav-registrar-km')?.classList.remove('hidden');
    document.getElementById('bnav-proximas-agendas')?.classList.remove('hidden');
    document.getElementById('bnav-alertas-condutor')?.classList.remove('hidden');
    // PEDIDO DO USUÁRIO ("o topo do app solicitante replique para o topo do
    // app do motorista"): mesmo bloco favicon (redondo) | MarkCarro |
    // saudação+nome | sino que o Solicitante já usa - a marca padrão do
    // canto esquerdo (só texto, sem ícone) some pra não duplicar "MarkCarro".
    document.getElementById('header-titulo-marca-padrao')?.classList.add('hidden');
    document.getElementById('header-marca-solicitante')?.classList.remove('hidden');
    document.getElementById('header-marca-texto-solicitante')?.classList.remove('hidden');
    //
    // CORREÇÃO (pedido do usuário: "apresente todos os componentes em
    // linha"): a saudação centralizada (flex-1) combinada com o sino e o
    // botão de Pane Mecânica podia estourar a largura da tela e quebrar
    // pra uma 2ª linha em celulares estreitos - "header-linha-principal"
    // (a faixa toda do topo) passa a não quebrar linha pro Condutor,
    // com rolagem horizontal como último recurso se ainda não couber.
    document.getElementById('header-linha-principal')?.classList.add('flex-nowrap', 'overflow-x-auto');
    document.getElementById('header-linha-principal')?.classList.remove('flex-wrap');
    {
      const bloco = document.getElementById('bloco-saudacao');
      if (bloco) {
        bloco.classList.remove('text-right', 'max-w-[112px]', 'sm:max-w-none');
        bloco.classList.add('flex-1', 'text-center');
      }
    }
    // PEDIDO DO USUÁRIO ("ponha o botão de pane mecânica debaixo do nome"):
    // o botão saiu de perto do sino/senha/sair e foi pra DENTRO de
    // bloco-saudacao, numa linha própria logo abaixo do nome (ver o próprio
    // botão, mais abaixo no HTML, agora dentro de #bloco-saudacao).
    document.getElementById('btn-pane-topo-condutor')?.classList.remove('hidden');
    document.getElementById('btn-senha-topo')?.classList.remove('hidden');
    document.getElementById('btn-sair-topo')?.classList.remove('hidden');
    // Rótulo "Agenda Geral" em vez de "Solicitações/Agenda" quando o gestor
    // liberou "Ver Agenda Geral" pra este condutor (Gerenciar Condutores) -
    // deixa claro, já no menu, que ele enxerga TODAS as corridas, não só as
    // dele (pedido do usuário: "apresentar o menu de Agenda geral pro
    // condutor com direito atribuído na tela condutores").
    {
      const rotulo = usuarioAtual.ver_agenda_geral ? 'Agenda Geral' : 'Solicitações';
      const rotuloCurto = usuarioAtual.ver_agenda_geral ? 'Agenda Geral' : 'Agenda';
      const elTopo = document.getElementById('topo-label-agenda-condutor');
      const elBnav = document.getElementById('bnav-label-agenda-condutor');
      const elSide = document.getElementById('side-label-agenda-condutor');
      if (elTopo) elTopo.textContent = rotulo;
      if (elBnav) elBnav.textContent = rotuloCurto;
      if (elSide) elSide.textContent = rotulo;
    }
    abrirPainelDoDia();
  } else {
    // PC: barra de pílulas fixa no topo.
    document.getElementById('topo-dashboard-solicitante')?.classList.remove('hidden');
    document.getElementById('topo-minhas-solicitacoes')?.classList.remove('hidden');
    document.getElementById('topo-nova-solicitacao')?.classList.remove('hidden');
    document.getElementById('topo-viagens-do-dia')?.classList.remove('hidden');
    document.getElementById('topo-alertas-solicitante')?.classList.remove('hidden');
    // "topo-senha-cs"/"topo-sair-cs" removidos do HTML (duplicavam
    // btn-senha-topo/btn-sair-topo, mais abaixo) - nada a mostrar aqui.
    // CORREÇÃO (pedido do usuário): tirado o menu lateral (☰ + gaveta) pro
    // Solicitante no celular - a navegação agora é só a barra inferior
    // (Dashboard/Nova/Minhas) e o botão Sair direto no topo.
    // "btn-menu-lateral" e "sidebar-ativa" ficam com o reset padrão (ocultos/
    // desativados) feito mais acima na função - nada a reativar aqui.
    //
    // CORREÇÃO (pedido do usuário: "colocar sino no topo - tirar do
    // rodapé; retirar ícone de menu do rodapé"): "Avisos" e "Menu" saíram
    // da barra inferior (ver #bottom-nav no HTML) - "Alterar Senha"/"Sair"
    // continuam acessíveis pelo menu do avatar, sempre visível no topo
    // (btn-usuario-menu, desde a correção anterior do Condutor).
    // Barra inferior (celular) - navegação principal do Solicitante.
    document.getElementById('bnav-dashboard-solicitante')?.classList.remove('hidden');
    document.getElementById('bnav-nova-solicitacao')?.classList.remove('hidden');
    document.getElementById('bnav-minhas-solicitacoes')?.classList.remove('hidden');
    document.getElementById('bnav-viagens-do-dia')?.classList.remove('hidden');
    document.getElementById('bnav-alertas-solicitante')?.classList.remove('hidden');
    // Topo (pedido do usuário): favicon | MarkCarro | saudação+nome | sino,
    // tudo num único bloco (sem o botão de Sair direto, que saiu do topo -
    // "Sair" continua no menu do avatar). A marca padrão do canto esquerdo
    // (header-titulo-marca-padrao) some pra não duplicar "MarkCarro" na tela.
    document.getElementById('header-titulo-marca-padrao')?.classList.add('hidden');
    document.getElementById('header-marca-solicitante')?.classList.remove('hidden');
    document.getElementById('header-marca-texto-solicitante')?.classList.remove('hidden');
    document.getElementById('btn-senha-topo')?.classList.remove('hidden');
    document.getElementById('btn-sair-topo')?.classList.remove('hidden');
    {
      const bloco = document.getElementById('bloco-saudacao');
      if (bloco) {
        bloco.classList.remove('text-right', 'max-w-[112px]', 'sm:max-w-none');
        bloco.classList.add('flex-1', 'text-center');
      }
    }
    // Tela inicial agora é o Dashboard do Solicitante (dados próprios +
    // resumo do setor) - antes caía direto em Minhas Solicitações.
    abrirDashboardSolicitante();
    // Avisos automáticos (10 min antes da viagem/retorno, aprovada/
    // rejeitada no mesmo dia) - só faz sentido pro Solicitante, e só
    // roda enquanto ele está logado com o app aberto (ver
    // pages/avisos-tempo-real.js).
    iniciarAvisosTempoReal();
  }

  // "Sair" e "Alterar Senha" vivem dentro do dropdown do usuário (sem id
  // próprio, sempre presentes no DOM) - não fazem parte do conjunto de
  // botões de navegação por perfil, então não precisam ser mostrados aqui.
  // (Antes, este código tentava document.getElementById('btn-sair') e
  // 'btn-alterar-senha', que não existem no HTML atual - isso lançava um
  // erro que interrompia a função ANTES de contar notificações, e o mesmo
  // erro, capturado por restaurarSessao(), fazia a sessão ser apagada
  // sempre que a página era recarregada (F5), mesmo com login válido.)
  // PEDIDO DO USUÁRIO (Condutor/Solicitante): Alterar Senha/Sair viraram
  // ícones fixos no topo (btn-senha-topo/btn-sair-topo, acima) - o menu do
  // avatar (que tinha os dois escondidos ali dentro) ficaria uma segunda
  // forma redundante de fazer a mesma coisa pra esses 2 perfis, então some
  // pra eles. O Admin continua usando o menu do avatar normalmente (além
  // das pílulas "Senha"/"Sair" que ele já tinha).
  if (tipo === 'admin') {
    document.getElementById('btn-usuario-menu')?.classList.remove('hidden');
  } else {
    document.getElementById('btn-usuario-menu')?.classList.add('hidden');
    document.getElementById('usuario-dropdown')?.classList.add('hidden');
  }
  // CORREÇÃO (pedido do usuário: "tirar ícone de sino do topo - já está no
  // rodapé"): o sino deixou de ser mostrado aqui pra todo mundo - agora só
  // o Admin o reativa (ver "if (tipo === 'admin')" mais acima), já que
  // Condutor/Solicitante passaram a ter a aba "Alertas" própria (rodapé/
  // pílulas do topo) - o sino ficaria duplicado pra eles. O contador
  // continua rodando pra TODOS (usado pelo badge da aba Alertas e pelo som
  // de notificação), só a exibição do ícone do sino em si que mudou.
  atualizarContadorNotificacoes();
  setInterval(atualizarContadorNotificacoes, 60000);
}

// Guarda a última contagem conhecida pra saber quando uma notificação NOVA
// chegou (e não só continua a mesma) - é isso que dispara o som de aviso.
// Começa null de propósito: não temos som no primeiro carregamento após o
// login, só quando o número sobe durante a sessão já aberta.
let _ultimaContagemNotificacoes = null;

async function atualizarContadorNotificacoes() {
  // Antes o condutor era excluído daqui (nunca contava/tocava som) - por
  // isso "notificação sonora pro motorista" nunca funcionava, mesmo com o
  // sino visível: o contador simplesmente nunca rodava pra esse perfil.
  if (!usuarioAtual) return;
  try {
    const n = await contarNaoLidas(usuarioAtual.email);

    if (_ultimaContagemNotificacoes !== null && n > _ultimaContagemNotificacoes) {
      tocarSomNotificacao();
    }
    _ultimaContagemNotificacoes = n;

    const badge = document.getElementById('badge-notificacoes');
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : n;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (e) {
    console.warn('Erro ao contar notificações:', e);
  }
}

function toggleUsuarioMenu() {
  document.getElementById('usuario-dropdown').classList.toggle('hidden');
}

function toggleNotificacoes() {
  const painel = document.getElementById('painel-notificacoes');
  painel.classList.toggle('hidden');
  if (!painel.classList.contains('hidden')) {
    // CORREÇÃO (pedido do usuário: "app motorista - registra notificações
    // mas não as visualiza"): o painel virou "position:fixed" (ver
    // comentário no index.html, na própria div) - antes era "absolute"
    // dentro do header, que corta o painel só pro Condutor (overflow-x-auto
    // no header dele força overflow-y a cortar também, por regra do CSS).
    // Como "fixed" não segue mais o botão sozinho via CSS, posiciona aqui
    // manualmente, colado embaixo do sino, cada vez que abre.
    const btn = document.getElementById('btn-sino');
    if (btn) {
      const r = btn.getBoundingClientRect();
      painel.style.top = (r.bottom + 8) + 'px';
      painel.style.right = (window.innerWidth - r.right) + 'px';
      painel.style.left = 'auto';
    }
    carregarNotificacoes();
  }
}

async function carregarNotificacoes() {
  if (!usuarioAtual) return;
  const lista = document.getElementById('lista-notificacoes');
  lista.innerHTML = '<div class="p-4 text-center text-slate-500 text-sm">Carregando...</div>';
  
  const btnLimpar = document.getElementById('btn-limpar-notificacoes-painel');
  try {
    const notifs = await buscarNotificacoes(usuarioAtual.email);
    if (!notifs || notifs.length === 0) {
      lista.innerHTML = '<div class="p-4 text-center text-slate-500 text-sm">Nenhuma notificação</div>';
      btnLimpar?.classList.add('hidden');
      return;
    }

    lista.innerHTML = notifs.map(n => `
      <div class="p-3 border-b border-slate-100 hover:bg-slate-50 ${n.lida ? '' : 'bg-blue-50'}" onclick="marcarNotificacaoLidaUI('${n.id}'); this.classList.remove('bg-blue-50')">
        <p class="text-sm font-medium text-slate-900 ${n.lida ? '' : 'font-semibold'}">${n.mensagem}</p>
        <p class="text-xs text-slate-500 mt-1">${formatarDataHoraBR(n.data_hora)}</p>
      </div>
    `).join('');

    const btnMarcarTodas = document.getElementById('btn-marcar-todas-lidas');
    if (notifs.some(n => !n.lida)) btnMarcarTodas.classList.remove('hidden');
    else btnMarcarTodas.classList.add('hidden');
    btnLimpar?.classList.remove('hidden');
  } catch (e) {
    lista.innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Erro ao carregar</div>';
  }
}

// PEDIDO DO USUÁRIO ("criar opção para limpar as notificações") - versão
// do painelzinho do sino (só Admin agora - ver carregarPainelPorPerfil).
async function limparNotificacoesPainel() {
  if (!usuarioAtual) return;
  if (!window.confirm('Apagar todas as notificações? Essa ação não pode ser desfeita.')) return;
  try {
    await excluirTodasNotificacoes(usuarioAtual.email);
    carregarNotificacoes();
    atualizarContadorNotificacoes();
    Components.Toast.success('Notificações apagadas');
  } catch (e) {
    Components.Toast.error('Erro ao limpar notificações');
  }
}

// Renomeada para marcarNotificacaoLidaUI: "marcarNotificacaoLida" já é o nome
// da função de API (em api.js) que faz o update no Supabase. Como este
// arquivo carrega depois de api.js, uma função de mesmo nome aqui
// sobrescrevia a de api.js - e "await marcarNotificacaoLida(id)" dentro dela
// passava a chamar a si mesma (recursão infinita / estouro de pilha) a cada
// clique numa notificação.
async function marcarNotificacaoLidaUI(id) {
  try {
    await marcarNotificacaoLida(id);
    atualizarContadorNotificacoes();
  } catch (e) {
    console.warn('Erro ao marcar notificação:', e);
  }
}

async function marcarTodasLidas() {
  if (!usuarioAtual) return;
  try {
    const notifs = await buscarNotificacoes(usuarioAtual.email);
    for (const n of notifs) {
      if (!n.lida) await marcarNotificacaoLida(n.id);
    }
    carregarNotificacoes();
    atualizarContadorNotificacoes();
    Components.Toast.success('Todas marcadas como lidas');
  } catch (e) {
    Components.Toast.error('Erro ao marcar todas');
  }
}

// abrirAlterarSenha / voltarDaAlterarSenha / salvarNovaSenha: a implementação
// real e completa vive em pages/alterar-senha.js (usa supabase.auth.updateUser
// de verdade, com os IDs de campo corretos). Havia uma versão incompleta
// duplicada aqui (placeholder que nem chegava a trocar a senha, e usava IDs
// de input que não existem no HTML) - removida para não confundir: como
// alterar-senha.js carrega depois, a versão dele sempre prevalecia mesmo
// antes desta limpeza, mas manter duas implementações divergentes do mesmo
// nome de função só convida a bugs futuros.

// Expor globalmente
window.processarLogin = processarLogin;
window.fazerLogout = fazerLogout;
window.toggleUsuarioMenu = toggleUsuarioMenu;
window.toggleNotificacoes = toggleNotificacoes;
window.marcarTodasLidas = marcarTodasLidas;
window.marcarNotificacaoLidaUI = marcarNotificacaoLidaUI;
window.limparNotificacoesPainel = limparNotificacoesPainel;
