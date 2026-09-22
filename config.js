// ============================================================
// MARKCARRO - Configuração
// ============================================================

const CONFIG = {
  SUPABASE_URL: 'https://gvtgtdhfciqegnjqcqlf.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dGd0ZGhmY2lxZWduanFjcWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTMyNDcsImV4cCI6MjEwNDEyOTI0N30.9E3-rFSagbTmz5cUcCBER0RMvlwi0oLSy6LwxWazWcs',
  APP_NAME: 'MarkCarro',
  ORGAO: 'SEMED Nova Lima',
  // Agenda combinada (só LEITURA) com o Bora Lá - outro projeto Supabase,
  // usado pelas excursões escolares. As mesmas vans atendem os 2 sistemas,
  // então o Admin do MarkCarro pode conferir aqui quais placas o Bora Lá já
  // tem reservado num dia, pra não bater com uma corrida do MarkCarro.
  // A chamada vai pra uma Edge Function do projeto Bora Lá (não lê a tabela
  // direto - lá tem RLS e um projeto Supabase não enxerga sessão/tabela do
  // outro). BORA_LA_ANON_KEY é a chave pública (anon) do Bora Lá - mesma
  // natureza da SUPABASE_ANON_KEY acima, feita pra ficar no código do site.
  BORA_LA_AGENDA_URL: 'https://rjuzhscynuleypaewgak.supabase.co/functions/v1/agenda-veiculos',
  BORA_LA_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdXpoc2N5bnVsZXlwYWV3Z2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NTQwNDAsImV4cCI6MjEwNDIzMDA0MH0.enT2gJB4dy2xz_Z91tPY4ysoJ-GEEn2dpo_RHiy5jAs',
  // Registros de KM (odômetro) agora ficam salvos direto no banco do Bora
  // Lá (driver_km_logs) - pedido do usuário: mesmo motorista roda pelos 2
  // sistemas, então o registro do dia precisa ser UM só, não duas tabelas
  // separadas. As 6 funções de KM em api.js chamam essa Edge Function em
  // vez de ler/gravar direto numa tabela local.
  BORA_LA_KM_BRIDGE_URL: 'https://rjuzhscynuleypaewgak.supabase.co/functions/v1/km-bridge'
};

window.CONFIG = CONFIG;