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

  try {
    cacheCondutores = await listarCondutores();
  } catch (e) {
    console.warn('Erro ao carregar condutores:', e);
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
    const unidadeExterna = document.getElementById('sol-unidade').value;
    const selSetorExterno = document.getElementById('sol-setor').value;

    if (!nomeExterno || !unidadeExterna || !selSetorExterno) {
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
      setor: selSetorExterno
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

  const btn = document.querySelector('#form-solicitacao button[type="submit"]');
  const textoOriginal = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    await criarSolicitacao(dados);
    Components.Toast.success('Solicitação enviada!');
    prepararFormSolicitacao();
    abrirMinhasSolicitacoes();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
  }
}

window.prepararFormSolicitacao = prepararFormSolicitacao;
window.alternarCampoOutroLocal = alternarCampoOutroLocal;
window.carregarSetoresSolicitacaoExterna = carregarSetoresSolicitacaoExterna;
window.enviarSolicitacao = enviarSolicitacao;
