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

  const dados = {
    email_solicitante: usuarioAtual.email,
    data_viagem: document.getElementById('sol-data-viagem').value,
    hora_saida: document.getElementById('sol-hora-saida').value,
    hora_retorno: document.getElementById('sol-hora-retorno').value,
    origem: origem,
    destino: destino,
    unidade: usuarioAtual.unidade || '',
    setor: usuarioAtual.setor || '',
    justificativa: document.getElementById('sol-justificativa').value,
    tipo_viagem: document.getElementById('sol-tipo-viagem').value,
    qtd_pessoas: parseInt(document.getElementById('sol-qtd').value) || 1
  };

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
window.enviarSolicitacao = enviarSolicitacao;
