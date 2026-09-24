// ============================================================
// MARKCARRO - Avisos automáticos em tempo real (Solicitante)
// ============================================================
// Pedido do usuário: avisar "sua viagem parte em 10 minutos", "horário
// de retorno em 10 minutos" e "sua viagem de HH:MMh foi aprovada/
// rejeitada" (só pra agendamento feito hoje pra viagem de hoje).
//
// LIMITAÇÃO CONHECIDA (decisão do usuário, ver conversa): isto roda só
// no navegador, checando o relógio a cada 60s enquanto o solicitante
// está logado com o app aberto - se a pessoa fechar a aba ou o celular
// bloquear antes do horário, o aviso não dispara. Uma versão que avisa
// de verdade mesmo com o app fechado precisaria de um job rodando no
// servidor (Supabase Edge Function + pg_cron), que foi a opção
// descartada por ora.
// ============================================================

let _intervaloAvisosTempoReal = null;
let _statusVistoAvisos = {};       // id da solicitação -> último status visto nesta sessão
let _avisoSaidaDisparado = new Set();   // ids que já dispararam o aviso de saída
let _avisoRetornoDisparado = new Set(); // ids que já dispararam o aviso de retorno

async function verificarAvisosTempoReal() {
  // Mesmo bug do Registro de KM (comparação com case sensível) - corrigido
  // aqui também, senão o solicitante nunca recebe os avisos automáticos
  // sempre que perfil.tipo não estiver gravado só em minúsculas.
  if (!usuarioAtual || usuarioAtual.tipo?.toLowerCase() !== 'solicitante') return;

  try {
    const hojeISO = new Date().toISOString().split('T')[0];
    const todas = await buscarSolicitacoesPorEmail(usuarioAtual.email);
    const agora = new Date();

    (todas || []).forEach(s => {
      if (s.data_viagem !== hojeISO) return; // só viagens de HOJE

      // ---- 10 min antes da saída ----
      if (s.status === 'Confirmada' && s.hora_saida && !_avisoSaidaDisparado.has(s.id)) {
        const saida = new Date(`${s.data_viagem}T${s.hora_saida}`);
        const diffMin = (saida - agora) / 60000;
        if (diffMin > 0 && diffMin <= 10) {
          mostrarToast('Sua viagem parte em 10 minutos!', 'info');
          _avisoSaidaDisparado.add(s.id);
        }
      }

      // ---- 10 min antes do retorno ----
      if (s.status === 'Confirmada' && s.hora_retorno && !_avisoRetornoDisparado.has(s.id)) {
        const retorno = new Date(`${s.data_viagem}T${s.hora_retorno}`);
        const diffMin = (retorno - agora) / 60000;
        if (diffMin > 0 && diffMin <= 10) {
          mostrarToast('Horário em 10 minutos!', 'info');
          _avisoRetornoDisparado.add(s.id);
        }
      }

      // ---- aprovada/rejeitada, só pra agendamento feito HOJE pra HOJE ----
      const solicitadaHoje = (s.data_solicitacao || '').slice(0, 10) === hojeISO;
      const statusAnterior = _statusVistoAvisos[s.id];
      if (solicitadaHoje && statusAnterior && statusAnterior !== s.status) {
        if (s.status === 'Confirmada') {
          mostrarToast(`Sua viagem de ${formatarHoraBR(s.hora_saida)}h foi aprovada.`, 'success');
        } else if (s.status === 'Cancelada') {
          mostrarToast(`Sua viagem de ${formatarHoraBR(s.hora_saida)}h foi rejeitada.`, 'error');
        }
      }
      _statusVistoAvisos[s.id] = s.status;
    });
  } catch (e) {
    // Falha silenciosa - isso roda em segundo plano, não deve interromper
    // nem poluir a interface do solicitante com erro de rede.
    console.warn('Erro ao verificar avisos em tempo real:', e);
  }
}

function iniciarAvisosTempoReal() {
  pararAvisosTempoReal();
  verificarAvisosTempoReal();
  _intervaloAvisosTempoReal = setInterval(verificarAvisosTempoReal, 60000);
}

function pararAvisosTempoReal() {
  if (_intervaloAvisosTempoReal) {
    clearInterval(_intervaloAvisosTempoReal);
    _intervaloAvisosTempoReal = null;
  }
  _statusVistoAvisos = {};
  _avisoSaidaDisparado = new Set();
  _avisoRetornoDisparado = new Set();
}

window.iniciarAvisosTempoReal = iniciarAvisosTempoReal;
window.pararAvisosTempoReal = pararAvisosTempoReal;
