// ============================================================
// MARKCARRO - Utilitários
// ============================================================

function formatarDataBR(valor) {
  if (!valor) return "";
  if (valor instanceof Date) {
    return valor.toLocaleDateString('pt-BR');
  }
  const partes = valor.split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return valor;
}

function formatarHoraBR(valor) {
  if (!valor) return "";
  if (valor instanceof Date) {
    return valor.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return valor.substring(0, 5);
}

function formatarDataHoraBR(valor) {
  if (!valor) return "";
  if (valor instanceof Date) {
    return valor.toLocaleString('pt-BR');
  }
  return `${formatarDataBR(valor.split(" ")[0])} ${formatarHoraBR(valor.split(" ")[1])}`;
}

function dataBRparaISO(dataBR) {
  if (!dataBR) return "";
  const partes = dataBR.split("/");
  if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
  return dataBR;
}

function dataISOparaBR(dataISO) {
  return formatarDataBR(dataISO);
}

function aplicarMascaraTelefone(input) {
  let v = input.value.replace(/\D/g, "");
  if (v.length > 11) v = v.substring(0, 11);
  if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
  else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
  input.value = v;
}

function classeStatus(status) {
  if (status === 'Confirmada') return 'badge-confirmada';
  if (status === 'Cancelada') return 'badge-cancelada';
  if (status === 'Em Análise') return 'badge-em-analise';
  if (status === 'Ocupado') return 'badge-ocupado';
  if (status === 'Desprezado') return 'badge-desprezado';
  return 'badge-pendente';
}

// Cor da faixa lateral do ".trip-card" (Minha Agenda do Condutor, Minhas
// Solicitações do Solicitante) - mesma lógica de classeStatus(), só que
// devolvendo a classe de borda em vez da de badge (ver index.html).
function classeCorBordaViagem(status) {
  if (status === 'Confirmada') return 'trip-card-confirmada';
  if (status === 'Cancelada') return 'trip-card-cancelada';
  if (status === 'Em Análise') return 'trip-card-em-analise';
  if (status === 'Ocupado') return 'trip-card-ocupado';
  if (status === 'Desprezado') return 'trip-card-desprezado';
  return 'trip-card-pendente';
}

// Ícones pequenos (SVG embutido, sem depender de nenhuma biblioteca externa
// tipo Font Awesome) usados dentro dos ".trip-card" - mesmo estilo (outline,
// stroke=currentColor) dos ícones que Components.Toast já usa.
const IconesViagem = {
  usuario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
  carro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l1.5-4.5A2 2 0 018.4 7h7.2a2 2 0 011.9 1.5L19 13m-14 0v5a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-5m-14 0h14"/><circle cx="7.5" cy="16" r="1"/><circle cx="16.5" cy="16" r="1"/></svg>',
  passageiros: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m5-4a4 4 0 100-8 4 4 0 000 8zm7 4a3 3 0 100-6 3 3 0 000 6zM5 12a3 3 0 100-6 3 3 0 000 6z"/></svg>',
  calendario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>'
};

function obterIniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function mostrarToast(mensagem, tipo = 'info') {
  if (window.Components?.Toast) {
    window.Components.Toast.show(mensagem, tipo);
  } else {
    alert(mensagem);
  }
}

// Aviso de CNH vencida/a vencer (equivalente ao buscarAvisosCnh do sistema
// antigo em Apps Script): mostra um alerta amarelo listando condutores cuja
// CNH já venceu ou vence em até 30 dias. Usado em Gerenciar Condutores e no
// topo do Painel do Gestor.
function renderizarAvisoCnh(containerId, condutores) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const avisos = [];
  (condutores || []).forEach(c => {
    if (!c.validade_cnh) return;
    const validade = new Date(c.validade_cnh + 'T00:00:00');
    if (isNaN(validade.getTime())) return;
    const diffDias = Math.round((validade - hoje) / 86400000);
    if (diffDias < 0) {
      avisos.push(`<strong>${c.nome}</strong>: CNH vencida há ${Math.abs(diffDias)} dia(s)`);
    } else if (diffDias <= 30) {
      avisos.push(`<strong>${c.nome}</strong>: CNH vence em ${diffDias} dia(s)`);
    }
  });

  if (!avisos.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
      <p class="font-semibold mb-1 flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        Atenção: CNH de condutores vencendo
      </p>
      <ul class="list-disc list-inside space-y-0.5">${avisos.map(a => `<li>${a}</li>`).join('')}</ul>
    </div>
  `;
}

// Som curto de notificação (equivalente ao tocarSomNotificacao do sistema de
// referência): usa a Web Audio API diretamente, sem nenhum arquivo de áudio.
// Falha silenciosamente em navegadores sem suporte ou quando o usuário ainda
// não interagiu com a página (política de autoplay).
function tocarSomNotificacao() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    ganho.gain.setValueAtTime(0.15, ctx.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(ganho).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Sem suporte a Web Audio - segue sem som, não é crítico.
  }
}

window.formatarDataBR = formatarDataBR;
window.formatarHoraBR = formatarHoraBR;
window.formatarDataHoraBR = formatarDataHoraBR;
window.dataBRparaISO = dataBRparaISO;
window.dataISOparaBR = dataISOparaBR;
window.aplicarMascaraTelefone = aplicarMascaraTelefone;
window.classeStatus = classeStatus;
window.classeCorBordaViagem = classeCorBordaViagem;
window.IconesViagem = IconesViagem;
window.obterIniciais = obterIniciais;
window.debounce = debounce;
window.mostrarToast = mostrarToast;
window.renderizarAvisoCnh = renderizarAvisoCnh;
window.tocarSomNotificacao = tocarSomNotificacao;