/**
 * MARKCARRO - Criar usuários no Supabase Auth via Admin API
 * 
 * Pré-requisitos:
 * 1. Node.js instalado
 * 2. Service Role Key do Supabase (Settings > API > service_role)
 * 3. Execute: npm install @supabase/supabase-js
 * 
 * Uso:
 * node create-auth-users.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xzltbjinzlrzfrwdqtxm.supabase.co';
// IMPORTANTE: Use a SERVICE_ROLE_KEY (não a anon key)
// Obtenha em: Settings > API > service_role (secret)
const SERVICE_ROLE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const usuarios = [
  // GESTOR / ADMIN
  { email: 'neildalan@gmail.com', password: 'trocar-123', data: { tipo: 'admin', nome: 'NEIL MARQUES' } },

  // CONDUTORES
  { email: 'valeriorrocha2@gmail.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'VALÉRIO RIBEIRO ROCHA' } },
  { email: 'rafaelsacramento584@yahoo.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'RAFAEL LUCAS SACRAMENTO' } },
  { email: 'divinorosa3@yahoo.com.br', password: 'trocar-123', data: { tipo: 'condutor', nome: 'DIVINO ROSA' } },
  { email: 'herbert.nicholls@hotmail.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'HERBERT MARTINS NICHOLLS' } },
  { email: 'lula@gmail.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'LUIZ CARLOS OLIVEIRA' } },
  { email: 'sergin09@yahoo.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'SÉRGIO ANTÔNIO DE SOUZA' } },
  { email: 'evandronicholls2@gmail.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'EVANDRO CAMBA NICHOLLS' } },
  { email: 'palitin@gmail.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'GERALDO GOMES DA SILVA' } },
  { email: 'paulopsantos62@gmail.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'PAULO PEREIRA DOS SANTOS' } },
  { email: 'jeidsonsilvavan@gmail.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'JEIDSON SANTOS SILVA' } },
  { email: 'ailtoncarlosrita@gmail.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'AILTON CARLOS SANTA RITA' } },
  { email: 'helderhsborges@gmail.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'HELDER HENRIQUE SILVA BORGES' } },
  { email: 'jorgesantos@gmail.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'JORGE EVANGELISTA SANTOS' } },
  { email: 'gilbertojoga6@gmail.com', password: 'trocar-123', data: { tipo: 'condutor', nome: 'GILBERTO RAIMUNDO SANTOS' } },

  // SOLICITANTES
  { email: 'inclusao.semed@pnl.mg.gov.br', password: 'trocar-123', data: { tipo: 'solicitante', nome: 'MÁRCIA SERÁPIA' } },
  { email: 'renildamg@gmail.com', password: 'trocar-123', data: { tipo: 'solicitante', nome: 'RENILDA GONÇALVES' } },
  { email: 'erikabritoeducacao@gmail.com', password: 'trocar-123', data: { tipo: 'solicitante', nome: 'ÉRIKA CRISTINA DE BRITO BERNARDINO' } },
  { email: 'janainalopes@prof.educacao.novalima.mg.gov.br', password: 'trocar-123', data: { tipo: 'solicitante', nome: 'Janaína Lopes de Jesus' } },
  { email: 'elaine.braganca@educacao.mg.gov.br', password: 'trocar-123', data: { tipo: 'solicitante', nome: 'Elaine Bragança' } },
  { email: 'etnicoracial.semed@pnl.mg.gov.br', password: 'trocar-123', data: { tipo: 'solicitante', nome: 'Silvânia Valentim' } },
  { email: 'danielleolicarsouza@yahoo.com.br', password: 'trocar-123', data: { tipo: 'solicitante', nome: 'Danielle Cristina de Oliveira Carvalho Souza' } },
  { email: 'escrituracao.semed@pnl.mg.gov.br', password: 'trocar-123', data: { tipo: 'solicitante', nome: 'Karla Sousa' } },
];

async function criarUsuarios() {
  console.log('Criando usuários no Supabase Auth...\n');
  
  for (const user of usuarios) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Confirma email automaticamente
        user_metadata: user.data
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          console.log(`⏭  ${user.email} - Já existe`);
        } else {
          console.error(`❌ ${user.email} - Erro:`, error.message);
        }
      } else {
        console.log(`✅ ${user.email} - Criado (ID: ${data.user.id})`);
      }
    } catch (err) {
      console.error(`❌ ${user.email} - Erro inesperado:`, err.message);
    }
  }

  console.log('\n✅ Processo finalizado!');
  console.log('Agora rode o script supabase-migracao-corrigida.sql no SQL Editor.');
}

criarUsuarios();