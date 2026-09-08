// ============================================================
// MARKCARRO - Página: Alterar Senha
// ============================================================

function abrirAlterarSenha() {
  document.getElementById('tela-alterar-senha').classList.remove('hidden');
  document.getElementById('main-content').classList.add('hidden');
  document.getElementById('form-alterar-senha').reset();
}

function voltarDaAlterarSenha() {
  document.getElementById('tela-alterar-senha').classList.add('hidden');
  document.getElementById('main-content').classList.remove('hidden');
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