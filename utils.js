// ============================================================
// MARKCARRO - UTILITÁRIOS
// ============================================================

// ==================== FORMATAÇÃO ====================

function formatarDataBR(data) {
  if (!data) return '';
  if (data instanceof Date) {
    return data.toLocaleDateString('pt-BR');
  }
  if (typeof data === 'string') {
    // Se já está no formato BR
    if (data.includes('/')) return data;
    // Se está no formato ISO
    const partes = data.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    // Tenta parsear
    const d = new Date(data);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
  }
  return data;
}

function formatarDataISO(dataBR) {
  if (!dataBR) return '';
  if (dataBR instanceof Date) {
    return dataBR.toISOString().split('T')[0];
  }
  if (typeof dataBR === 'string') {
    if (dataBR.includes('-')) return dataBR.split('T')[0];
    const partes = dataBR.split('/');
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
  }
  return dataBR;
}

function formatarHoraBR(hora) {
  if (!hora) return '';
  if (hora instanceof Date) {
    return hora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (typeof hora === 'string') {
    if (hora.length <= 5) return hora; // HH:MM
    const partes = hora.split(':');
    if (partes.length >= 2) return `${partes[0]}:${partes[1]}`;
  }
  return hora;
}

function formatarDataHoraBR(dataHora) {
  if (!dataHora) return '';
  const d = new Date(dataHora);
  if (isNaN(d.getTime())) return dataHora;
  return d.toLocaleString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatarCPF(cpf) {
  if (!cpf) return '';
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11) return cpf;
  return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarTelefone(tel) {
  if (!tel) return '';
  const nums = tel.replace(/\D/g, '');
  if (nums.length === 11) {
    return nums.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (nums.length === 10) {
    return nums.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return tel;
}

function formatarPlaca(placa) {
  if (!placa) return '';
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function formatarCPFCNPJ(valor) {
  if (!valor) return '';
  const nums = valor.replace(/\D/g, '');
  if (nums.length === 11) return formatarCPF(nums);
  if (nums.length === 14) return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return valor;
}

// ==================== VALIDAÇÃO ====================

function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validarCPF(cpf) {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(nums)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(nums[9])) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(nums[10]);
}

function validarTelefone(tel) {
  const nums = tel.replace(/\D/g, '');
  return nums.length >= 10 && nums.length <= 11;
}

function validarPlaca(placa) {
  // Placa Mercosul: ABC1D23 ou Antiga: ABC1234
  const mercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/;
  const antiga = /^[A-Z]{3}\d{4}$/;
  const limpa = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return mercosul.test(limpa) || antiga.test(limpa);
}

// ==================== MÁSCARAS ====================

function aplicarMascaraTelefone(input) {
  let valor = input.value.replace(/\D/g, '');
  if (valor.length > 11) valor = valor.substring(0, 11);
  
  if (valor.length > 10) {
    valor = valor.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (valor.length > 6) {
    valor = valor.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
  } else if (valor.length > 2) {
    valor = valor.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
  }
  input.value = valor;
}

function aplicarMascaraCPF(input) {
  let valor = input.value.replace(/\D/g, '');
  if (valor.length > 11) valor = valor.substring(0, 11);
  valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
  valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
  valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  input.value = valor;
}

function aplicarMascaraCPFCNPJ(input) {
  let valor = input.value.replace(/\D/g, '');
  if (valor.length <= 11) {
    aplicarMascaraCPF(input);
  } else {
    if (valor.length > 14) valor = valor.substring(0, 14);
    valor = valor.replace(/(\d{2})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1/$2');
    valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    input.value = valor;
  }
}

function aplicarMascaraPlaca(input) {
  let valor = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (valor.length > 7) valor = valor.substring(0, 7);
  // Auto-formata Mercosul: ABC1D23
  if (valor.length === 7) {
    // Verifica se é padrão Mercosul (LLLNLNN)
    if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(valor)) {
      input.value = valor;
      return;
    }
    // Padrão antigo: ABC1234
    if (/^[A-Z]{3}\d{4}$/.test(valor)) {
      input.value = valor;
      return;
    }
  }
  input.value = valor;
}

// ==================== FORMATAÇÃO DE NÚMEROS ====================

function formatarNumero(numero, decimais = 0) {
  if (numero === null || numero === undefined || isNaN(numero)) return '0';
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais
  });
}

function formatarKm(km) {
  return formatarNumero(km) + ' km';
}

// ==================== DATAS ====================

function adicionarDias(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

function diferencaDias(data1, data2) {
  const d1 = new Date(data1);
  const d2 = new Date(data2);
  const diff = Math.abs(d2 - d1);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isHoje(data) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === hoje.getTime();
}

function isPassado(data) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d < hoje;
}

function isFuturo(data) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d > hoje;
}

// ==================== STRINGS ====================

function truncar(texto, max = 50) {
  if (!texto) return '';
  if (texto.length <= max) return texto;
  return texto.substring(0, max - 3) + '...';
}

function capitalizar(texto) {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

function tituloCase(texto) {
  if (!texto) return '';
  return texto.toLowerCase().split(' ').map(p => capitalizar(p)).join(' ');
}

function iniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ==================== ARRAYS/OBJETOS ====================

function agruparPor(array, chave) {
  return array.reduce((acc, item) => {
    const key = item[chave];
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function ordenarPor(array, chave, ordem = 'asc') {
  return [...array].sort((a, b) => {
    const aVal = a[chave];
    const bVal = b[chave];
    if (aVal < bVal) return ordem === 'asc' ? -1 : 1;
    if (aVal > bVal) return ordem === 'asc' ? 1 : -1;
    return 0;
  });
}

function agruparESomar(array, chaveGrupo, chaveSoma) {
  return array.reduce((acc, item) => {
    const key = item[chaveGrupo];
    acc[key] = (acc[key] || 0) + (Number(item[chaveSoma]) || 0);
    return acc;
  }, {});
}

function unico(array, chave) {
  const vistos = new Set();
  return array.filter(item => {
    const key = chave ? item[chave] : item;
    if (vistos.has(key)) return false;
    vistos.add(key);
    return true;
  });
}

// ==================== ARQUIVOS ====================

function downloadBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadBase64(base64, nomeArquivo, tipo = 'application/octet-stream') {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: tipo });
  downloadBlob(blob, nomeArquivo);
}

async function lerArquivo(arquivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(arquivo);
  });
}

async function lerArquivoBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(arquivo);
  });
}

// ==================== URL/PARAMS ====================

function getQueryParam(nome) {
  const params = new URLSearchParams(window.location.search);
  return params.get(nome);
}

function setQueryParam(nome, valor) {
  const url = new URL(window.location.href);
  if (valor) url.searchParams.set(nome, valor);
  else url.searchParams.delete(nome);
  window.history.replaceState({}, '', url);
}

function limparQueryParams() {
  window.history.replaceState({}, '', window.location.pathname);
}

// ==================== DEBOUNCE/THROTTLE ====================

function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, limit = 300) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ==================== CORES ====================

function corStatus(status) {
  const cores = {
    'Pendente': 'badge-pendente',
    'Em Análise': 'badge-em-analise',
    'Confirmada': 'badge-confirmada',
    'Ocupado': 'badge-ocupado',
    'Cancelada': 'badge-cancelada',
    'Desprezado': 'badge-desprezado'
  };
  return cores[status] || 'badge-pendente';
}

function corCategoria(categoria) {
  const cores = {
    'Motorista': 'bg-blue-100 text-blue-800',
    'Motoboy': 'bg-orange-100 text-orange-800'
  };
  return cores[categoria] || 'bg-gray-100 text-gray-800';
}

// ==================== EXPORT ====================

window.Utils = {
  // Formatação
  formatarDataBR,
  formatarDataISO,
  formatarHoraBR,
  formatarDataHoraBR,
  formatarCPF,
  formatarTelefone,
  formatarPlaca,
  formatarCPFCNPJ,
  formatarNumero,
  formatarKm,
  
  // Validação
  validarEmail,
  validarCPF,
  validarTelefone,
  validarPlaca,
  
  // Máscaras
  aplicarMascaraTelefone,
  aplicarMascaraCPF,
  aplicarMascaraCPFCNPJ,
  aplicarMascaraPlaca,
  
  // Datas
  adicionarDias,
  diferencaDias,
  isHoje,
  isPassado,
  isFuturo,
  formatarDataBR,
  formatarDataISO,
  
  // Strings
  truncar,
  capitalizar,
  tituloCase,
  iniciais,
  slugify,
  
  // Arrays/Objetos
  agruparPor,
  ordenarPor,
  agruparESomar,
  unico,
  
  // Arquivos
  downloadBlob,
  downloadBase64,
  lerArquivo,
  lerArquivoBase64,
  
  // URL
  getQueryParam,
  setQueryParam,
  limparQueryParams,
  
  // Debounce/Throttle
  debounce,
  throttle,
  
  // Cores
  corStatus,
  corCategoria,
  
  // Iniciais
  iniciais
};