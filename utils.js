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

window.formatarDataBR = formatarDataBR;
window.formatarHoraBR = formatarHoraBR;
window.formatarDataHoraBR = formatarDataHoraBR;
window.dataBRparaISO = dataBRparaISO;
window.dataISOparaBR = dataISOparaBR;
window.aplicarMascaraTelefone = aplicarMascaraTelefone;
window.classeStatus = classeStatus;
window.obterIniciais = obterIniciais;
window.debounce = debounce;
window.mostrarToast = mostrarToast;