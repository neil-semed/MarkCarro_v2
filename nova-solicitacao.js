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
  alternarLabelTipoViagem();
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

  // PEDIDO DO USUÁRIO ("não carrega unidade criada hoje - dropdown dinâmico
  // em unidade"): as Unidades criadas em Gerenciar Unidades ficam na tabela
  // "unidades", mas este dropdown só lia as que já têm Setor cadastrado
  // (tabelas_apoio) - uma Unidade nova, ainda sem setor, nunca aparecia.
  // Agora a lista é a união das duas, buscada de novo a cada abertura da tela.
  await atualizarDropdownUnidadesSolicitacao();

  // Item 7: "acrescente listagem dos últimos agendamentos registrados pelo
  // admin" - só faz sentido no modo Gestor (o Solicitante comum já tem a
  // tela "Minhas Solicitações" pra isso).
  document.getElementById('bloco-ultimos-agendamentos-admin')?.classList.toggle('hidden', !modoExterno);
  if (modoExterno) carregarUltimosAgendamentosAdmin();
}

async function atualizarDropdownUnidadesSolicitacao() {
  const sel = document.getElementById('sol-unidade');
  if (!sel) return;
  const valorAtual = sel.value;
  let doCadastro = [];
  try {
    const todas = await listarTodasUnidades();
    doCadastro = (todas || []).filter(u => u && u.nome && u.ativo !== false).map(u => String(u.nome).trim());
  } catch (e) {
    console.warn('Erro ao carregar o cadastro de Unidades:', e);
  }
  const nomes = Array.from(new Set([...(cacheUnidades || []), ...doCadastro].filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  sel.innerHTML = '<option value="">Selecione a Unidade...</option>' +
    nomes.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('') +
    '<option value="Outro">Outra Unidade</option>';
  if (valorAtual && [...sel.options].some(o => o.value === valorAtual)) sel.value = valorAtual;
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
// PEDIDO DO USUÁRIO ("se no app for solicitado motoboy, deve aparecer Nº
// de Documentos"): reaproveita a mesma coluna do banco (qtd_pessoas) usada
// pra "Nº Passageiros" - só troca o rótulo/placeholder exibidos conforme o
// Tipo escolhido, sem precisar de uma coluna nova. Chamada no onchange do
// próprio <select> e ao abrir/limpar o formulário (prepararFormSolicitacao).
function alternarLabelTipoViagem() {
  const tipo = document.getElementById('sol-tipo-viagem')?.value;
  const ehMotoboy = tipo === 'Motoboy';
  const lbl = document.getElementById('lbl-qtd');
  const input = document.getElementById('sol-qtd');
  if (lbl) lbl.textContent = ehMotoboy ? 'Nº de Documentos *' : 'Nº Passageiros *';
  if (input) input.placeholder = ehMotoboy ? 'Número de documentos' : 'Número de passageiros';
}

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
      // PEDIDO DO USUÁRIO ("notificar o responsável quando alguém do setor
      // cria ou cancela uma solicitação"): até aqui criar uma solicitação
      // não avisava ninguém (só o cancelamento avisava os gestores) - agora
      // o responsável pelo setor (se houver um definido - ver
      // gerenciar-usuarios.js/notificarResponsavelSetor em api.js) recebe
      // um aviso tanto numa solicitação própria quanto numa criada pelo
      // Gestor em nome de um Solicitante Externo (dados.unidade/dados.setor
      // cobrem os dois casos, ver "dados" acima).
      if (dados.unidade && dados.setor) {
        const quemSolicitou = dados.nome_ext || usuarioAtual.nome;
        notificarResponsavelSetor(
          dados.unidade,
          dados.setor,
          `${quemSolicitou} criou uma nova solicitação de viagem (${dados.origem} → ${dados.destino}).`,
          'nova_solicitacao_setor'
        ).catch(e => console.warn('Erro ao notificar responsável do setor:', e));
      }
      prepararFormSolicitacao();
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
  }
}

window.prepararFormSolicitacao = prepararFormSolicitacao;
window.atualizarDropdownUnidadesSolicitacao = atualizarDropdownUnidadesSolicitacao;
window.alternarLabelTipoViagem = alternarLabelTipoViagem;
window.alternarCampoOutroLocal = alternarCampoOutroLocal;
window.carregarSetoresSolicitacaoExterna = carregarSetoresSolicitacaoExterna;
window.carregarUltimosAgendamentosAdmin = carregarUltimosAgendamentosAdmin;
window.enviarSolicitacao = enviarSolicitacao;
window.alternarBlocoRecorrencia = alternarBlocoRecorrencia;

// ============================================================
// Seletor em "folha inferior" para os dropdowns da Nova Solicitação
// (celular / app): linhas grandes, ✓ no item atual, busca nas listas
// longas e "+ Outro (digitar)" no fim. No PC (tela larga, fora do app)
// continua o dropdown nativo. Não altera o <select>: grava o valor nele e
// dispara "change", então todos os onchange existentes continuam valendo.
// ============================================================
(function iniciarSeletorFolha() {
  if (window.__mcSeletorFolha) return;
  window.__mcSeletorFolha = true;

  const css = document.createElement('style');
  css.textContent = `
    .mcp-fundo{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.45);display:flex;align-items:flex-end;justify-content:center;animation:mcpFade .15s ease-out}
    .mcp-folha{background:#fff;width:100%;max-width:520px;max-height:78vh;border-radius:18px 18px 0 0;display:flex;flex-direction:column;box-shadow:0 -8px 30px rgba(15,23,42,.25);animation:mcpSobe .2s ease-out;padding-bottom:env(safe-area-inset-bottom)}
    .mcp-grip{width:40px;height:4px;border-radius:2px;background:#cbd5e1;margin:8px auto 4px}
    .mcp-tit{font-size:15px;font-weight:700;color:#0f172a;padding:4px 18px 8px}
    .mcp-busca{margin:0 14px 8px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px;width:calc(100% - 28px);outline:none}
    .mcp-busca:focus{border-color:#1e40af;box-shadow:0 0 0 3px rgba(30,64,175,.15)}
    .mcp-lista{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 8px 10px}
    .mcp-op{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #f1f5f9;padding:14px 12px;font-size:15px;color:#1e293b;border-radius:8px}
    .mcp-op:active{background:#eff6ff}
    .mcp-op.sel{background:#eff6ff;color:#1e40af;font-weight:700}
    .mcp-op.outro{color:#1e40af;font-weight:700}
    .mcp-vazio{padding:18px;text-align:center;color:#94a3b8;font-size:14px}
    @keyframes mcpSobe{from{transform:translateY(100%)}to{transform:none}}
    @keyframes mcpFade{from{opacity:0}to{opacity:1}}
  `;
  document.head.appendChild(css);

  const ativo = () => document.documentElement.classList.contains('app-nativo') || window.matchMedia('(max-width: 1023px)').matches;
  const alvo = (el) => { const s = el && el.closest ? el.closest('select') : null; return s && s.closest('#form-solicitacao, #tela-agenda-condutor') && !s.disabled && !s.multiple ? s : null; };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function abrir(sel) {
    if (document.querySelector('.mcp-fundo')) return;
    const lbl = document.querySelector(`label[for="${sel.id}"]`);
    const titulo = (lbl ? lbl.textContent : 'Selecione').replace(/\*/g, '').trim();
    // Nos filtros da Agenda Geral a opção vazia ("Todos...") é uma escolha válida e fica no topo;
    // na Nova Solicitação ela é só o "Selecione..." e não aparece na lista.
    const ehFiltro = !!sel.closest('#tela-agenda-condutor');
    const ops = [...sel.options].filter((o) => (ehFiltro || o.value !== '') && !o.disabled);
    const ehOutro = (o) => !ehFiltro && /^outr[oa]\b/i.test(o.textContent.trim());
    const normais = ops.filter((o) => !ehOutro(o));
    const outros = ops.filter(ehOutro);
    const lista = [...normais, ...outros];

    const fundo = document.createElement('div');
    fundo.className = 'mcp-fundo';
    fundo.innerHTML = `<div class="mcp-folha" role="dialog" aria-label="${esc(titulo)}"><div class="mcp-grip"></div><div class="mcp-tit">${esc(titulo)}</div>${lista.length > 8 ? '<input type="search" class="mcp-busca" placeholder="🔍 Buscar..." autocomplete="off">' : ''}<div class="mcp-lista"></div></div>`;
    const ul = fundo.querySelector('.mcp-lista');
    const busca = fundo.querySelector('.mcp-busca');

    const fechar = () => { fundo.remove(); document.body.style.overflow = antes; document.removeEventListener('keydown', tecla); };
    const antes = document.body.style.overflow;
    const tecla = (e) => { if (e.key === 'Escape') fechar(); };

    function desenhar(q) {
      q = (q || '').trim().toLowerCase();
      const itens = lista.filter((o) => ehOutro(o) || !q || o.textContent.toLowerCase().includes(q));
      ul.innerHTML = itens.length ? '' : '<div class="mcp-vazio">Nada encontrado</div>';
      itens.forEach((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        const outro = ehOutro(o);
        b.className = 'mcp-op' + (o.value === sel.value ? ' sel' : '') + (outro ? ' outro' : '');
        const txt = o.textContent.trim();
        b.innerHTML = `<span>${outro ? '+ ' + esc(txt) + ' (digitar)' : esc(txt)}</span>${o.value === sel.value ? '<span>✓</span>' : ''}`;
        b.addEventListener('click', () => {
          const mudou = sel.value !== o.value;
          sel.value = o.value;
          fechar();
          if (mudou) sel.dispatchEvent(new Event('change', { bubbles: true }));
        });
        ul.appendChild(b);
      });
    }
    desenhar('');
    if (busca) busca.addEventListener('input', () => desenhar(busca.value));
    fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
    document.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(fundo);
    const s = ul.querySelector('.sel'); if (s) s.scrollIntoView({ block: 'center' });
  }

  let toque = null;
  document.addEventListener('touchstart', (e) => { const t = e.touches[0]; toque = { x: t.clientX, y: t.clientY }; }, { passive: true, capture: true });
  document.addEventListener('touchend', (e) => {
    if (!ativo() || !toque) return;
    const sel = alvo(e.target); const t = e.changedTouches[0];
    const moveu = Math.abs(t.clientX - toque.x) > 10 || Math.abs(t.clientY - toque.y) > 10;
    toque = null;
    if (!sel || moveu) return;
    e.preventDefault(); sel.blur(); abrir(sel);
  }, { passive: false, capture: true });
  document.addEventListener('mousedown', (e) => {
    if (!ativo()) return;
    const sel = alvo(e.target);
    if (!sel) return;
    e.preventDefault(); abrir(sel);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!ativo() || (e.key !== 'Enter' && e.key !== ' ')) return;
    const sel = alvo(e.target);
    if (!sel || document.activeElement !== sel) return;
    e.preventDefault(); abrir(sel);
  }, true);
})();
