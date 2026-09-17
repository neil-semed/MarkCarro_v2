// ============================================================
// MARKCARRO - Página: Alterar Senha
// ============================================================

// "tela-alterar-senha" é um <div> DENTRO de #main-content (como qualquer
// outra tela-*) - só que esta função escondia o #main-content inteiro (em
// vez de usar esconderTodasTelas(), como todo o resto do app) e mostrava a
// tela de senha por dentro dele. Como CSS "display:none" no pai esconde
// todos os filhos independente da classe de cada um, a tela de Alterar
// Senha nunca aparecia de verdade: a página ficava em branco (só o
// cabeçalho visível) até clicar em "Voltar".
function abrirAlterarSenha() {
  esconderTodasTelas();
  document.getElementById('tela-alterar-senha').classList.remove('hidden');
  document.getElementById('form-alterar-senha').reset();
  marcarAbaAtiva('alterar-senha');
}

// esconderTodasTelas() (chamada acima) esconde TODAS as telas, incluindo a
// que estava aberta antes - por isso "Voltar" precisa navegar de volta pra
// tela inicial de cada perfil explicitamente, e não só reexibir
// #main-content como fazia antes.
function voltarDaAlterarSenha() {
  const tipo = usuarioAtual?.tipo?.toLowerCase();
  if (tipo === 'admin') abrirPainelGestor();
  else if (tipo === 'condutor') abrirPainelDoDia();
  else abrirMinhasSolicitacoes();
}

async function salvarNovaSenha() {
  const atual = document.getElementById('senha-atual').value;
  const nova = document.getElementById('senha-nova').value;
  const confirm = document.getElementById('senha-nova-confirm').value;
  
  if (!atual || !nova || !confirm) return Components.Toast.error('Preencha todos os campos');
  if (nova !== confirm) return Components.Toast.error('As novas senhas não conferem');
  if (nova.length < 6) return Components.Toast.error('A nova senha deve ter pelo menos 6 caracteres');
  
  try {
    // Supabase não tem API direta de "change password with current password"
    // Opção 1: Usar updateUser com nova senha (requer sessão válida)
    const { data, error } = await supabase.auth.updateUser({ password: nova });
    
    if (error) throw error;
    
    Components.Toast.success('Senha alterada com sucesso!');
    voltarDaAlterarSenha();
  } catch (e) {
    console.error('Erro ao alterar senha:', e);
    Components.Toast.error('Erro ao alterar senha: ' + e.message);
  }
}

// Expor globalmente
window.abrirAlterarSenha = abrirAlterarSenha;
window.voltarDaAlterarSenha = voltarDaAlterarSenha;
window.salvarNovaSenha = salvarNovaSenha;