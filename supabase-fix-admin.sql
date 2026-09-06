-- Atualizar o usuário existente para admin
UPDATE profiles SET tipo = 'admin', nome = 'ADMIN TESTE', ativo = true
WHERE email = 'admin@teste.com';

-- Verificar
SELECT * FROM profiles WHERE email = 'admin@teste.com';
