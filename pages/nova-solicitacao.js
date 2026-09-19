// ============================================================
// MARKCARRO - Página: Nova Solicitação
// ============================================================

// cacheCondutores é declarado em app.js (compartilhado com outras telas que
// atribuem condutor). Esta função é chamada por abrirNovaSolicitacao() /
// abrirNovaSolicitacaoGestor() em app.js sempre que a tela é aberta.
async function prepararFormSolicitacao() {
  document.getElementById('form-solicitacao').reset();
  document.getElementById('sol-data-viagem').value = new Date().toISOString().split('T')[0];
  document.getElementById('sol-qtd').value = 1;
  document.getElementById('box-outro-origem').classList.add('hidden');
  document.getElementById('box-outro-destino').classList.add('hidden');
  document.getElementById('box-outro-unidade-externa')?.classList.add('hidden');
  document.getElementById('box-outro-setor-externo')?.classList.add('hidden');
  document.getElementById('bloco-recorrencia')?.classList.add('hidden');

  // CORREÇÃO (pedido do usuário: "tela nova - tirar card unidade e setor"):
  // card de conferência de Unidade/Setor do próprio Solicitante removido -
  // Unidade/Setor continuam sendo enviados por baixo dos panos ao salvar a
  // solicitação, só não aparecem mais nesta tela.

  // CORREÇÃO (item 7 do lote do admin): "origem e destino não carregou
  // dados da tabela de locais". Causa: cacheLocais/cacheUnidades (usados
  // por preencherDropdownLocais/preencherDropdownUnidades) só eram
  // buscados UMA VEZ, em carregarDropdownsApoio() (app.js), disparado no
  // DOMContentLoaded - ANTES até de restaurarSessao() rodar. Se a consulta
  // a "locais"/"unidades" depende de estar autenticado (RLS), essa busca
  // bem cedo, sem sessão ainda, voltava vazia - e como nada recarregava
  // esses dropdowns depois do login, Origem/Destino (e a Unidade do bloco
  // Solicitante Externo) ficavam praticamente vazios pelo resto da sessão,
  // mesmo com a tabela "locais" cheia no banco. Buscando de novo aqui -
  // toda vez que a tela de Nova Solicitação é aberta, já com o usuário
  // autenticado - corrige isso sem depender de mudar a ordem de
  // inicialização em app.js (que outras telas também usam).
  try {
    const [locais, unidades, condutores] = await Promise.all([
      listarLocais(),
      listarUnidades(),
      listarCondutores()
    ]);
    cacheLocais = locais || [];
    cacheUnidades = unidades || [];
    cacheCondutores = condutores || [];
    preencherDropdownLocais(document.getElementById('sol-origem'));
    preencherDropdownLocais(document.getElementById('sol-destino'));
    preencherDropdownUnidades(document.getElementById('sol-unidade'), true);
  } catch (e) {
    console.warn('Erro ao carregar locais/unidades/condutores:', e);
  }

  // Item 7: "acrescente listagem dos últimos agendamentos registrados pelo
  // admin" - só faz sentido no modo Gestor (o Solicitante comum já tem a
  // tela "Minhas Solicitações" pra isso).
  document.getElementById('bloco-ultimos-agendamentos-admin')?.classList.toggle('hidden', !modoExterno);
  if (modoExterno) carregarUltimosAgendamentosAdmin();
}

// Mostra os últimos agendamentos que o próprio Gestor logado registrou
// (email_solicitante = e-mail do gestor - é o que enviarSolicitacao() grava
// quando ele cria uma solicitação em nome de alguém sem e-mail próprio, ou
// quando o "E-mail de contato" fica em branco), como conferência rápida
// sem precisar abrir a Agenda/Dashboard só pra isso.
async function carregarUltimosAgendamentosAdmin() {
  const container = document.getElementById('lista-ultimos-agendamentos-admin');
  if (!container || !usuarioAtual) return;
  container.innerHTML = '<p class="text-sm text-slate-500">Carregando...</p>';

  try {
    const dados = await buscarSolicitacoesPorEmail(usuarioAtual.email);
    const ultimos = (dados || [])
      .slice()
      .sort((a, b) => (b.data_solicitacao || '').localeCompare(a.data_solicitacao || ''))
      .slice(0, 8);

    if (!ultimos.length) {
      container.innerHTML = '<p class="text-sm text-slate-500">Nenhum agendamento registrado por você ainda.</p>';
      return;
    }

    container.innerHTML = ultimos.map(s => `
      <div class="flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-3 py-2 text-sm">
        <div class="min-w-0">
          <p class="font-medium text-slate-900 truncate">${s.nome_ext || s.email_solicitante} <span class="text-slate-400 font-normal">· ${formatarDataBR(s.data_viagem)} ${formatarHoraBR(s.hora_saida)}</span></p>
          <p class="text-slate-500 truncate">${s.origem || '—'} → ${s.destino || '—'}</p>
        </div>
        <span class="badge ${classeStatus(s.status)} shrink-0">${s.status || 'Pendente'}</span>
      </div>
    `).join('');
  } catch (e) {
    console.warn('Erro ao carregar últimos agendamentos do admin:', e);
    container.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar.</p>';
  }
}

// Mostra/esconde a caixa de texto livre quando "Outro local" é escolhido no
// dropdown de Origem/Destino. Antes esse toggle não existia (o campo de
// texto ficava sempre escondido e nunca era lido de qualquer forma - ver
// correção em enviarSolicitacao abaixo).
function alternarCampoOutroLocal(idSelect, idBox) {
  const select = document.getElementById(idSelect);
  const box = document.getElementById(idBox);
  if (!select || !box) return;
  box.classList.toggle('hidden', select.value !== 'Outro');
}

// Cascata Unidade -> Setor do bloco "Solicitante Externo" (gestor solicitando
// em nome de outra pessoa). Espelha carregarSetoresCadastro() da tela de
// Cadastro, só que usando os IDs sol-unidade/sol-setor. Antes o <select> de
// Unidade desse bloco ficava com o atributo "disabled" fixo no HTML e sem
// nenhum onchange - ou seja, o gestor nunca conseguia de fato escolher uma
// unidade pra quem não tem conta no sistema.
async function carregarSetoresSolicitacaoExterna() {
  const unidade = document.getElementById('sol-unidade').value;
  const selSetor = document.getElementById('sol-setor');

  if (!unidade) {
    selSetor.innerHTML = '<option value="">Selecione a Unidade primeiro</option>';
    document.getElementById('box-outro-setor-externo')?.classList.add('hidden');
    return;
  }

  // "Outra Unidade" (nome novo, digitado na caixa de texto) não existe na
  // tabela de apoio pra consultar setores - não faz sentido nem tentar; o
  // único setor possível também é "digite o nome" (Outro Setor), já
  // selecionado sozinho (não obriga o gestor a abrir o dropdown de novo só
  // pra escolher a única opção).
  if (unidade === 'Outro') {
    selSetor.innerHTML = '<option value="Outro" selected>Outro Setor</option>';
    alternarCampoOutroLocal('sol-setor', 'box-outro-setor-externo');
    return;
  }

  try {
    const dados = await listarSetoresPorUnidade(unidade);
    selSetor.innerHTML = '<option value="">Selecione o Setor...</option>';
    (dados || []).forEach(s => {
      selSetor.innerHTML += `<option value="${s.setor}">${s.setor}</option>`;
    });
    selSetor.innerHTML += '<option value="Outro">Outro Setor</option>';
  } catch (e) {
    console.error('Erro ao carregar setores:', e);
    selSetor.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

function alternarBlocoRecorrencia() {
  const marcado = document.getElementById('sol-recorrente-check').checked;
  document.getElementById('bloco-recorrencia').classList.toggle('hidden', !marcado);
}

// Gera a lista de datas (YYYY-MM-DD) entre dataInicio e dataFim (ambas
// incluídas) cujo dia da semana está em diasSemana (0=Dom...6=Sáb).
function gerarDatasRecorrencia(dataInicio, dataFim, diasSemana) {
  const datas = [];
  let atual = new Date(dataInicio + 'T00:00:00');
  const fim = new Date(dataFim + 'T00:00:00');
  while (atual <= fim) {
    if (diasSemana.includes(atual.getDay())) {
      datas.push(atual.toISOString().split('T')[0]);
    }
    atual.setDate(atual.getDate() + 1);
  }
  return datas;
}

async function enviarSolicitacao() {
  if (!usuarioAtual) return Components.Toast.error('Faça login');

  // Quando o valor escolhido é "Outro", usa o texto digitado na caixa livre
  // em vez de enviar a string literal "Outro" pro banco.
  const selOrigem = document.getElementById('sol-origem').value;
  const origem = selOrigem === 'Outro'
    ? (document.getElementById('sol-origem-outro').value || '').trim()
    : selOrigem;

  const selDestino = document.getElementById('sol-destino').value;
  const destino = selDestino === 'Outro'
    ? (document.getElementById('sol-destino-outro').value || '').trim()
    : selDestino;

  // Quando o bloco "Solicitante Externo" está visível, é o Gestor criando a
  // solicitação em nome de outra pessoa (sem conta no sistema, ou presente
  // fisicamente na secretaria) - usa os campos daquele bloco em vez do
  // perfil de quem está logado. Antes esses campos existiam no HTML mas
  // nunca eram lidos: a solicitação sempre saía em nome do próprio gestor,
  // sem nome_ext/unidade/setor da pessoa real.
  const modoExterno = !document.getElementById('bloco-solicitante-externo').classList.contains('hidden');

  let dados;
  if (modoExterno) {
    const nomeExterno = (document.getElementById('sol-nome-externo').value || '').trim();
    const emailExterno = (document.getElementById('sol-email-externo').value || '').trim();
    const telefoneExterno = (document.getElementById('sol-telefone-externo').value || '').trim();
    // "Outro" (Outra Unidade / Outro Setor) usa o texto digitado na caixa
    // livre em vez da string literal "Outro" - mesmo critério de
    // Origem/Destino logo abaixo.
    const selUnidadeExterna = document.getElementById('sol-unidade').value;
    const unidadeExterna = selUnidadeExterna === 'Outro'
      ? (document.getElementById('sol-unidade-outro').value || '').trim()
      : selUnidadeExterna;

    const selSetorExterno = document.getElementById('sol-setor').value;
    const setorExterno = selSetorExterno === 'Outro'
      ? (document.getElementById('sol-setor-outro').value || '').trim()
      : selSetorExterno;

    if (!nomeExterno || !unidadeExterna || !setorExterno) {
      return Components.Toast.error('Preencha nome, unidade e setor do solicitante');
    }

    dados = {
      // Sem e-mail informado, usa o e-mail do próprio gestor só pra
      // satisfazer a coluna obrigatória - quem identifica a pessoa de
      // verdade nas listagens é nome_ext, não email_solicitante.
      email_solicitante: emailExterno || usuarioAtual.email,
      nome_ext: nomeExterno,
      telefone_ext: telefoneExterno || null,
      unidade: unidadeExterna,
      setor: setorExterno
    };
  } else {
    dados = {
      email_solicitante: usuarioAtual.email,
      nome_ext: null,
      telefone_ext: null,
      unidade: usuarioAtual.unidade || '',
      setor: usuarioAtual.setor || ''
    };
  }

  Object.assign(dados, {
    data_viagem: document.getElementById('sol-data-viagem').value,
    hora_saida: document.getElementById('sol-hora-saida').value,
    hora_retorno: document.getElementById('sol-hora-retorno').value,
    origem: origem,
    destino: destino,
    justificativa: document.getElementById('sol-justificativa').value,
    tipo_viagem: document.getElementById('sol-tipo-viagem').value,
    qtd_pessoas: parseInt(document.getElementById('sol-qtd').value) || 1
  });

  if (!dados.data_viagem || !dados.hora_saida || !origem || !destino || !dados.justificativa) {
    return Components.Toast.error('Preencha todos os campos obrigatórios');
  }

  // Agendamento recorrente (só faz sentido no modo Gestor/Admin, mesmo
  // bloco visual do "Solicitante Externo") - em vez de 1 solicitação,
  // cria 1 pra cada dia marcado, entre a Data da Viagem e a data final.
  const recorrenteMarcado = modoExterno && document.getElementById('sol-recorrente-check')?.checked;
  let datasParaCriar = [dados.data_viagem];

  if (recorrenteMarcado) {
    const diasSemana = Array.from(document.querySelectorAll('.recorrencia-dia:checked')).map(cb => parseInt(cb.value, 10));
    const dataFim = document.getElementById('sol-recorrencia-ate')?.value;

    if (!diasSemana.length) return Components.Toast.error('Marque pelo menos um dia da semana para repetir');
    if (!dataFim) return Components.Toast.error('Informe a data final da repetição');
    if (dataFim < dados.data_viagem) return Components.Toast.error('A data final da repetição não pode ser antes da Data da Viagem');

    datasParaCriar = gerarDatasRecorrencia(dados.data_viagem, dataFim, diasSemana);
    if (!datasParaCriar.length) return Components.Toast.error('Nenhuma data cai nos dias da semana marcados dentro do período');
  }

  const btn = document.querySelector('#form-solicitacao button[type="submit"]');
  const textoOriginal = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    let sucesso = 0, falhas = 0;
    for (const data of datasParaCriar) {
      try {
        await criarSolicitacao({ ...dados, data_viagem: data });
        sucesso++;
      } catch (e) {
        console.error('Erro ao criar solicitação recorrente para', data, e);
        falhas++;
      }
    }

    if (datasParaCriar.length > 1) {
      if (falhas === 0) Components.Toast.success(`${sucesso} solicitações criadas (agendamento recorrente).`);
      else Components.Toast.warning(`${sucesso} solicitações criadas, ${falhas} falharam.`);
    } else if (sucesso) {
      Components.Toast.success('Solicitação enviada!');
    } else {
      Components.Toast.error('Erro ao enviar solicitação');
    }

    // CORREÇÃO (bug relatado pelo usuário: "acabei de registrar uma
    // solicitação e não carregou" - a solicitação nunca existiu de
    // verdade no banco, rejeitada pela RLS ao tentar salvar em nome de
    // outra pessoa, ver supabase_rls_admin_cria_solicitacao_externa.sql
    // - mas o app limpava o formulário IGUAL, como se tivesse dado certo).
    // Só limpa o formulário quando pelo menos 1 realmente foi salva - numa
    // falha total, o usuário fica na própria tela, com os dados ainda
    // preenchidos (não perde o que digitou) e o toast de erro já mostrado
    // acima explica o que houve.
    //
    // PEDIDO DO USUÁRIO (perfil admin): ao gravar, a tela pulava sozinha
    // pra Gerenciar Solicitações (ou Minhas Solicitações) - o usuário
    // pediu pra permanecer em Nova Solicitação depois de salvar, em vez de
    // trocar de tela automaticamente. Ver também a mesma remoção de
    // navegação automática em outras telas (busca por "PEDIDO DO USUÁRIO:
    // não navegar" no restante do app).
    if (sucesso > 0) {
      prepararFormSolicitacao();
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
  }
}

window.prepararFormSolicitacao = prepararFormSolicitacao;
window.alternarCampoOutroLocal = alternarCampoOutroLocal;
window.carregarSetoresSolicitacaoExterna = carregarSetoresSolicitacaoExterna;
window.carregarUltimosAgendamentosAdmin = carregarUltimosAgendamentosAdmin;
window.enviarSolicitacao = enviarSolicitacao;
window.alternarBlocoRecorrencia = alternarBlocoRecorrencia;
