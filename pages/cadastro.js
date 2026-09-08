// ============================================================
// MARKCARRO - Página: Cadastro
// ============================================================

function alternarCamposPerfil() {
  const tipo = document.getElementById('cad-tipo-perfil').value;
  const blocoSolicitante = document.getElementById('bloco-solicitante');
  const blocoCondutor = document.getElementById('bloco-condutor');
  
  if (tipo === 'solicitante') {
    blocoSolicitante.classList.remove('hidden');
    blocoCondutor.classList.add('hidden');
  } else {
    blocoSolicitante.classList.add('hidden');
    blocoCondutor.classList.remove('hidden');
  }
}

async function carregarSetoresCadastro() {
  const unidade = document.getElementById('cad-unidade').value;
  const selSetor = document.getElementById('cad-setor');
  
  if (!unidade) {
    selSetor.innerHTML = '<option value="">Selecione a unidade primeiro</option>';
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

async function salvarCadastro() {
  const tipo = document.getElementById('cad-tipo-perfil').value;
  const nome = document.getElementById('cad-nome').value;
  const email = document.getElementById('cad-email').value;
  const senha = document.getElementById('cad-senha').value;
  const telefone = document.getElementById('cad-telefone').value;
  
  if (!nome || !email || !senha || !telefone) {
    Components.Toast.error('Preencha todos os campos obrigatórios');
    return;
  }
  
  if (senha.length < 6) {
    Components.Toast.error('A senha deve ter pelo menos 6 caracteres');
    return;
  }
  
  const metaDados = {
    tipo,
    nome,
    telefone
  };
  
  if (tipo === 'solicitante') {
    metaDados.unidade = document.getElementById('cad-unidade').value;
    metaDados.setor = document.getElementById('cad-setor').value;
    if (!metaDados.unidade || !metaDados.setor) {
      Components.Toast.error('Selecione Unidade e Setor');
      return;
    }
  } else {
    metaDados.placa = document.getElementById('cad-placa').value;
    metaDados.modelo = document.getElementById('cad-modelo').value;
    metaDados.capacidade = document.getElementById('cad-capacidade').value;
    metaDados.categoria = document.getElementById('cad-categoria').value;
    metaDados.cnh = document.getElementById('cad-cnh').value;
    metaDados.validade_cnh = document.getElementById('cad-validade-cnh').value;
  }
  
  const btn = document.querySelector('#form-cadastro button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Cadastrando...';
  
  try {
    const resultado = await supabaseCadastro(email, senha, metaDados);
    
    if (resultado && resultado.user) {
      const dadosPerfil = {
        tipo,
        nome,
        email,
        telefone,
        unidade: metaDados.unidade || null,
        setor: metaDados.setor || null,
        placa: metaDados.placa || null,
        modelo: metaDados.modelo || null,
        capacidade: metaDados.capacidade ? parseInt(metaDados.capacidade) : null,
        categoria: metaDados.categoria || null,
        cnh: metaDados.cnh || null,
        validade_cnh: metaDados.validade_cnh || null
      };
      
      await atualizarPerfil(resultado.user.id, dadosPerfil);
      
      Components.Toast.success('Cadastro realizado! Verifique seu e-mail para confirmar.');
      document.getElementById('form-cadastro').reset();
      alternarCamposPerfil();
      voltarLogin();
    }
  } catch (erro) {
    console.error('Erro no cadastro:', erro);
    Components.Toast.error('Erro ao cadastrar: ' + (erro.message || 'Tente novamente.'));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar Cadastro';
  }
}

function voltarLogin() {
  document.getElementById('tela-cadastro').classList.add('hidden');
  document.getElementById('tela-login').classList.remove('hidden');
  document.getElementById('form-cadastro').reset();
  alternarCamposPerfil();
}

// Expor globalmente
window.alternarCamposPerfil = alternarCamposPerfil;
window.carregarSetoresCadastro = carregarSetoresCadastro;
window.salvarCadastro = salvarCadastro;
window.voltarLogin = voltarLogin;