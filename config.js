// ============================================================
// MARKCARRO - CONFIGURAÇÃO
// ============================================================
const CONFIG = {
  // URLs do Supabase
  SUPABASE_URL: 'https://xzltbjinzlrzfrwdqtxm.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bHRiamluemxyemZyd2RxdHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjMxODYsImV4cCI6MjEwNDA5OTE4Nn0.sV9vPOqhyvsyxj9IfIbvpR4_JKYF784an3juELQnDOA',
  
  // Configurações da aplicação
  APP_NAME: 'MarkCarro',
  ORGAO: 'SEMED Nova Lima',
  
  // Configurações de UI
  ITEMS_PER_PAGE: 20,
  TOAST_DURATION: 4000,
  
  // Tipos de usuário
  USER_TYPES: {
    SOLICITANTE: 'solicitante',
    CONDUTOR: 'condutor',
    GESTOR: 'gestor',
    ADMIN: 'admin'
  },
  
  // Status das solicitações
  SOLICITACAO_STATUS: {
    PENDENTE: 'Pendente',
    EM_ANALISE: 'Em Análise',
    CONFIRMADA: 'Confirmada',
    OCUPADO: 'Ocupado',
    CANCELADA: 'Cancelada',
    DESPREZADO: 'Desprezado'
  },
  
  // Tipos de veículo
  VEICULO_CATEGORIA: {
    MOTORISTA: 'Motorista',
    MOTOBOY: 'Motoboy'
  },
  
  // Tipos de notificação
  NOTIFICACAO_TIPOS: {
    RECEBIMENTO: 'recebimento',
    CONFIRMACAO: 'confirmacao',
    CANCELAMENTO: 'cancelamento',
    AJUSTE: 'ajuste',
    OCUPADO: 'ocupado',
    CORRIDA_EXTRA: 'corrida_extra',
    AVISO_GESTOR: 'aviso_gestor',
    CORRIDA_ATRIBUIDA: 'corrida_atribuida',
    KM_PENDENTE: 'km_pendente',
    CNH_VENCENDO: 'cnh_vencendo'
  },
  
  // Cores por status
  STATUS_COLORS: {
    'Pendente': 'badge-pendente',
    'Em Análise': 'badge-em-analise',
    'Confirmada': 'badge-confirmada',
    'Ocupado': 'badge-ocupado',
    'Cancelada': 'badge-cancelada',
    'Desprezado': 'badge-desprezado'
  },
  
  // Perfis que são gestores
  GESTOR_TYPES: ['gestor', 'admin'],
  
  // Tempo limite para cancelamento (minutos)
  CANCELAMENTO_MINUTOS: 30,
  
  // Dias de alerta CNH
  DIAS_ALERTA_CNH: 30
};

// Exportar para uso global
window.CONFIG = CONFIG;