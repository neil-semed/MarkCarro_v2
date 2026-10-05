// ============================================================
// MARKCARRO - Página: Central de Relatórios (Admin/Gestor)
// ============================================================
// PEDIDO DO USUÁRIO: "tela para geração de relatórios diversos... use e
// cruze os dados possíveis de geração de relatórios, todos com filtros" -
// esboço aprovado (Opção B: abas no topo). Cada aba é um relatório que
// cruza dados já existentes no app (solicitações, condutores, KM,
// unidades, cooperativas) - nenhuma tabela/coluna nova no banco, tudo
// calculado aqui em cima dos mesmos dados que Dashboard/Gerenciar já usam.
//
// Um único conjunto de dados é carregado (carregarRelatorios) e cada aba
// só recalcula/filtra em cima dele - trocar de aba ou de filtro não
// busca nada de novo no Supabase.

let cacheSolicitacoesRel = [];
let cacheCondutoresRel = [];
let cacheKmRel = [];
let cacheUnidadesRel = [];
let cacheCooperativasRel = [];
let _relatorioAtivo = 'viagens';
let _relatorioAtual = { titulo: '', colunas: [], linhas: [] }; // usado pelos exports Excel/PDF
let _chartRelatorio = null;
let _relatoriosCarregados = false;

const _CORES_STATUS_REL = {
  'Pendente': '#F5A623',
  'Em Análise': '#044AAA',
  'Confirmada': '#46BE6B',
  'Cancelada': '#D85736',
  'Ocupado': '#94A3B8',
  'Desprezado': '#64748B'
};
const _ORDEM_STATUS_REL = ['Pendente', 'Em Análise', 'Confirmada', 'Ocupado', 'Cancelada', 'Desprezado'];
const _PALETA_REL = ['#044AAA', '#46BE6B', '#D85736', '#FF914D', '#1D5C63', '#FFDE59', '#B8452A', '#37A057'];

// ------------------------------------------------------------
// Carregamento
// ------------------------------------------------------------
async function carregarRelatorios(forcarAtualizacao = false) {
  if (!forcarAtualizacao && _relatoriosCarregados) return;
  try {
    const [solicitacoes, condutores, km, unidades, cooperativas] = await Promise.all([
      buscarTodasSolicitacoes(),
      listarCondutores(),
      listarTodosKM().catch(() => []),
      listarTodasUnidades().catch(() => []),
      listarTodasCooperativas().catch(() => [])
    ]);
    cacheSolicitacoesRel = solicitacoes || [];
    cacheCondutoresRel = condutores || [];
    // Registros de KM "não vinculados" (motorista do Bora Lá ainda sem
    // condutor do MarkCarro associado - ver pages/gerenciar-km.js) não têm
    // como ser cruzados com cooperativa/placa daqui, então ficam de fora
    // deste relatório (continuam aparecendo normalmente em Gerenciar KM).
    cacheKmRel = (km || []).filter(r => !r._nao_vinculado);
    cacheUnidadesRel = unidades || [];
    cacheCooperativasRel = cooperativas || [];
    _relatoriosCarregados = true;

    _preencherFiltrosRel();
    selecionarRelatorio(_relatorioAtivo);
  } catch (e) {
    console.error('Erro ao carregar Relatórios:', e);
    Components.Toast.error('Erro ao carregar dados para os relatórios');
  }
}

// ------------------------------------------------------------
// Helpers de dados
// ------------------------------------------------------------
function _dentroDoPeriodoRel(dataStr, dias) {
  if (dias === 0) return true;
  if (!dataStr) return false;
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const d = new Date(dataStr);
  const diffDias = (hoje - d) / (1000 * 60 * 60 * 24);
  return diffDias >= 0 && diffDias <= dias;
}

function _diasEntreRel(dataIni, dataFim) {
  const a = new Date(dataIni), b = new Date(dataFim);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return (b - a) / (1000 * 60 * 60 * 24);
}

function _pctRel(parte, total) {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

function _condutorPorEmailRel(email) {
  return cacheCondutoresRel.find(c => (c.email || '').toLowerCase() === (email || '').toLowerCase());
}

function _cooperativaPorIdRel(id) {
  if (id == null) return null;
  return cacheCooperativasRel.find(c => Number(c.id) === Number(id));
}

function _nomeCondutorRel(email) {
  return _condutorPorEmailRel(email)?.nome || email || '—';
}

function _situacaoCnhRel(validade) {
  if (!validade) return 'Não informada';
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const venc = new Date(validade + 'T00:00');
  const diasParaVencer = (venc - hoje) / (1000 * 60 * 60 * 24);
  if (diasParaVencer < 0) return 'Vencida';
  if (diasParaVencer <= 30) return 'Vence em breve';
  return 'OK';
}
const _CORES_SITUACAO_CNH_REL = { 'OK': '#46BE6B', 'Vence em breve': '#FF914D', 'Vencida': '#D85736', 'Não informada': '#94A3B8' };

// ------------------------------------------------------------
// Catálogo dos relatórios - cada um declara os campos de filtro que usa
// (ver _FILTROS_REL, abaixo, pra que existe cada um) e uma função que
// recebe os valores atuais dos filtros e devolve { kpis, colunas, linhas,
// grafico }.
// ------------------------------------------------------------
const _FILTROS_REL = ['periodo', 'unidade', 'setor', 'status', 'tipoViagem', 'condutor', 'veiculo', 'cooperativa', 'ajustado', 'categoria', 'situacaoCnh'];

const RELATORIOS_REL = {
  viagens: {
    label: 'Viagens', icone: '🚌',
    titulo: 'Viagens / Solicitações',
    subtitulo: 'Cruza data da viagem, status, unidade, setor, tipo de viagem e condutor.',
    filtros: ['periodo', 'status', 'unidade', 'setor', 'tipoViagem', 'condutor'],
    calcular: _calcularRelViagens
  },
  funil: {
    label: 'Funil de Status', icone: '🔻',
    titulo: 'Funil de Status',
    subtitulo: 'Distribuição das solicitações por status e tempo médio até a decisão (aprovação/cancelamento), por período/unidade/setor.',
    filtros: ['periodo', 'unidade', 'setor'],
    calcular: _calcularRelFunil
  },
  km: {
    label: 'KM Rodado', icone: '🛣️',
    titulo: 'KM Rodado',
    subtitulo: 'Registros de KM (Bora Lá + legado) por condutor, veículo, cooperativa e período.',
    filtros: ['periodo', 'condutor', 'veiculo', 'cooperativa', 'ajustado'],
    calcular: _calcularRelKm
  },
  condutores: {
    label: 'Condutores / CNH', icone: '🪪',
    titulo: 'Condutores / CNH',
    subtitulo: 'Condutores ativos por cooperativa e categoria, com situação da CNH (mostra apenas condutores ativos).',
    filtros: ['cooperativa', 'categoria', 'situacaoCnh'],
    calcular: _calcularRelCondutores
  },
  unidades: {
    label: 'Unidades / Setores', icone: '🏫',
    titulo: 'Unidades / Setores',
    subtitulo: 'Viagens solicitadas, pessoas atendidas e cancelamentos por unidade e setor, no período.',
    filtros: ['periodo', 'unidade', 'setor'],
    calcular: _calcularRelUnidades
  },
  cooperativas: {
    label: 'Cooperativas', icone: '🤝',
    titulo: 'Cooperativas',
    subtitulo: 'Condutores, KM rodado e viagens atendidas por cooperativa, no período.',
    filtros: ['periodo', 'cooperativa'],
    calcular: _calcularRelCooperativas
  },
  motoboy: {
    label: 'Motoboy', icone: '🏍️',
    titulo: 'Motoboy - Documentos',
    subtitulo: 'Entregas de Motoboy (documentos), por período, unidade, setor e status.',
    filtros: ['periodo', 'status', 'unidade', 'setor'],
    calcular: _calcularRelMotoboy
  },
};

// ------------------------------------------------------------
// Filtros (preenchimento dos <select>)
// ------------------------------------------------------------
function _preencherFiltrosRel() {
  const selUnidade = document.getElementById('rel-filtro-unidade');
  if (selUnidade) {
    const unidades = (cacheUnidadesRel && cacheUnidadesRel.length)
      ? cacheUnidadesRel.map(u => u.nome).sort()
      : [...new Set(cacheSolicitacoesRel.map(s => s.unidade).filter(Boolean))].sort();
    selUnidade.innerHTML = '<option value="">Todas</option>' + unidades.map(u => `<option value="${u}">${u}</option>`).join('');
  }

  const selSetor = document.getElementById('rel-filtro-setor');
  if (selSetor) {
    const setores = [...new Set(cacheSolicitacoesRel.map(s => s.setor).filter(Boolean))].sort();
    selSetor.innerHTML = '<option value="">Todos</option>' + setores.map(s => `<option value="${s}">${s}</option>`).join('');
  }

  const selTipo = document.getElementById('rel-filtro-tipo-viagem');
  if (selTipo) {
    const tipos = [...new Set(cacheSolicitacoesRel.map(s => s.tipo_viagem || 'Comum'))].sort();
    selTipo.innerHTML = '<option value="">Todos</option>' + tipos.map(t => `<option value="${t}">${t}</option>`).join('');
  }

  const selCondutor = document.getElementById('rel-filtro-condutor');
  if (selCondutor) {
    const ordenados = cacheCondutoresRel.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    selCondutor.innerHTML = '<option value="">Todos</option>' + ordenados.map(c => `<option value="${c.email}">${c.nome}</option>`).join('');
  }

  const selVeiculo = document.getElementById('rel-filtro-veiculo');
  if (selVeiculo) {
    const placas = [...new Set(cacheCondutoresRel.map(c => c.placa).filter(Boolean))].sort();
    selVeiculo.innerHTML = '<option value="">Todos</option>' + placas.map(p => `<option value="${p}">${p}</option>`).join('');
  }

  const selCoop = document.getElementById('rel-filtro-cooperativa');
  if (selCoop) {
    const ordenadas = cacheCooperativasRel.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    selCoop.innerHTML = '<option value="">Todas</option>' + ordenadas.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  }
}

function _lerFiltrosRel() {
  return {
    periodoDias: Number(document.getElementById('rel-filtro-periodo')?.value ?? 0),
    unidade: document.getElementById('rel-filtro-unidade')?.value || '',
    setor: document.getElementById('rel-filtro-setor')?.value || '',
    status: document.getElementById('rel-filtro-status')?.value || '',
    tipoViagem: document.getElementById('rel-filtro-tipo-viagem')?.value || '',
    condutorEmail: document.getElementById('rel-filtro-condutor')?.value || '',
    placa: document.getElementById('rel-filtro-veiculo')?.value || '',
    cooperativaId: document.getElementById('rel-filtro-cooperativa')?.value || '',
    ajustado: document.getElementById('rel-filtro-ajustado')?.value || '',
    categoria: document.getElementById('rel-filtro-categoria')?.value || '',
    situacaoCnh: document.getElementById('rel-filtro-situacao-cnh')?.value || '',
  };
}

// ------------------------------------------------------------
// Troca de aba
// ------------------------------------------------------------
function selecionarRelatorio(chave) {
  if (!RELATORIOS_REL[chave]) return;
  _relatorioAtivo = chave;

  document.querySelectorAll('#rel-tabs .rel-tab').forEach(btn => {
    btn.classList.toggle('ativa', btn.dataset.relatorio === chave);
  });

  _FILTROS_REL.forEach(f => {
    const wrap = document.getElementById(`rel-filtro-wrap-${f}`);
    if (wrap) wrap.classList.toggle('hidden', !RELATORIOS_REL[chave].filtros.includes(f));
  });

  document.getElementById('rel-titulo').textContent = RELATORIOS_REL[chave].titulo;
  document.getElementById('rel-subtitulo').textContent = RELATORIOS_REL[chave].subtitulo;

  aplicarFiltrosRelatorio();
}

function aplicarFiltrosRelatorio() {
  const filtros = _lerFiltrosRel();
  const resultado = RELATORIOS_REL[_relatorioAtivo].calcular(filtros);
  _renderizarRelatorio(resultado);
}

function limparFiltrosRelatorio() {
  ['rel-filtro-periodo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = '0'; });
  ['rel-filtro-unidade', 'rel-filtro-setor', 'rel-filtro-status', 'rel-filtro-tipo-viagem', 'rel-filtro-condutor', 'rel-filtro-veiculo', 'rel-filtro-cooperativa', 'rel-filtro-ajustado', 'rel-filtro-categoria', 'rel-filtro-situacao-cnh']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  aplicarFiltrosRelatorio();
}

// ------------------------------------------------------------
// Cálculo de cada relatório
// ------------------------------------------------------------
function _calcularRelViagens(f) {
  let dados = cacheSolicitacoesRel.filter(s => _dentroDoPeriodoRel(s.data_viagem, f.periodoDias));
  if (f.status) dados = dados.filter(s => (s.status || 'Pendente') === f.status);
  if (f.unidade) dados = dados.filter(s => s.unidade === f.unidade);
  if (f.setor) dados = dados.filter(s => s.setor === f.setor);
  if (f.tipoViagem) dados = dados.filter(s => (s.tipo_viagem || 'Comum') === f.tipoViagem);
  if (f.condutorEmail) dados = dados.filter(s => s.condutor_ida === f.condutorEmail || s.condutor_volta === f.condutorEmail);

  const total = dados.length;
  const pessoas = dados.reduce((soma, s) => soma + (Number(s.qtd_pessoas) || 0), 0);
  const canceladas = dados.filter(s => ['Cancelada', 'Desprezado'].includes(s.status)).length;
  const diffs = dados.map(s => _diasEntreRel(s.data_solicitacao, s.data_viagem)).filter(d => d != null && d >= 0);
  const mediaAntecedencia = diffs.length ? (diffs.reduce((a, b) => a + b, 0) / diffs.length) : null;

  const contagemStatus = {};
  dados.forEach(s => { const st = s.status || 'Pendente'; contagemStatus[st] = (contagemStatus[st] || 0) + 1; });
  const statusPresentes = _ORDEM_STATUS_REL.filter(st => contagemStatus[st]);

  const linhas = dados
    .slice()
    .sort((a, b) => (b.data_viagem || '').localeCompare(a.data_viagem || ''))
    .map(s => [
      formatarDataBR(s.data_viagem),
      s.unidade || '—',
      s.setor || '—',
      s.destino || '—',
      _nomeCondutorRel(s.condutor_ida) || '—',
      s.status || 'Pendente',
    ]);

  return {
    kpis: [
      [String(total), 'Viagens no período'],
      [String(pessoas), 'Pessoas transportadas'],
      [`${_pctRel(canceladas, total)}%`, 'Taxa de cancelamento'],
      [mediaAntecedencia != null ? `${mediaAntecedencia.toFixed(1)} dias` : '—', 'Antecedência média da solicitação'],
    ],
    colunas: ['Data viagem', 'Unidade', 'Setor', 'Destino', 'Condutor', 'Status'],
    linhas,
    linhaClasseStatusCol: 5,
    grafico: {
      tipo: 'bar',
      labels: statusPresentes,
      valores: statusPresentes.map(st => contagemStatus[st]),
      cores: statusPresentes.map(st => _CORES_STATUS_REL[st] || '#94A3B8'),
      titulo: 'Viagens por status'
    }
  };
}

function _calcularRelFunil(f) {
  let dados = cacheSolicitacoesRel.filter(s => _dentroDoPeriodoRel(s.data_viagem, f.periodoDias));
  if (f.unidade) dados = dados.filter(s => s.unidade === f.unidade);
  if (f.setor) dados = dados.filter(s => s.setor === f.setor);

  const total = dados.length;
  const aprovadas = dados.filter(s => ['Confirmada', 'Ocupado'].includes(s.status)).length;
  const canceladas = dados.filter(s => s.status === 'Cancelada').length;
  const desprezadas = dados.filter(s => s.status === 'Desprezado').length;

  const diffsDecisao = dados
    .filter(s => s.data_solicitacao && s.data_cancel_confirm)
    .map(s => _diasEntreRel(s.data_solicitacao, s.data_cancel_confirm))
    .filter(d => d != null && d >= 0);
  const mediaDecisao = diffsDecisao.length ? (diffsDecisao.reduce((a, b) => a + b, 0) / diffsDecisao.length) : null;

  const contagemStatus = {};
  dados.forEach(s => { const st = s.status || 'Pendente'; contagemStatus[st] = (contagemStatus[st] || 0) + 1; });
  const statusPresentes = _ORDEM_STATUS_REL.filter(st => contagemStatus[st]);

  const linhas = statusPresentes.map(st => [st, String(contagemStatus[st]), `${_pctRel(contagemStatus[st], total)}%`]);

  return {
    kpis: [
      [String(total), 'Total no período'],
      [`${_pctRel(aprovadas, total)}%`, 'Confirmada / Ocupado'],
      [`${_pctRel(canceladas, total)}%`, 'Cancelada'],
      [mediaDecisao != null ? `${mediaDecisao.toFixed(1)} dias` : '—', 'Tempo médio até a decisão'],
    ],
    colunas: ['Status', 'Quantidade', '% do total'],
    linhas,
    grafico: {
      tipo: 'bar',
      labels: statusPresentes,
      valores: statusPresentes.map(st => contagemStatus[st]),
      cores: statusPresentes.map(st => _CORES_STATUS_REL[st] || '#94A3B8'),
      titulo: 'Solicitações por status'
    }
  };
}

function _calcularRelKm(f) {
  let dados = cacheKmRel.filter(r => _dentroDoPeriodoRel(r.data, f.periodoDias));
  if (f.condutorEmail) dados = dados.filter(r => (r.email_condutor || '').toLowerCase() === f.condutorEmail.toLowerCase());
  if (f.placa) dados = dados.filter(r => _condutorPorEmailRel(r.email_condutor)?.placa === f.placa);
  if (f.cooperativaId) dados = dados.filter(r => Number(_condutorPorEmailRel(r.email_condutor)?.cooperativa_id) === Number(f.cooperativaId));
  if (f.ajustado === 'sim') dados = dados.filter(r => !!r.ajustado);
  if (f.ajustado === 'nao') dados = dados.filter(r => !r.ajustado);

  const completos = dados.filter(r => r.km_final != null && r.km_final !== '' && r.km_inicial != null);
  const porCondutor = {};
  completos.forEach(r => {
    const km = Number(r.km_final) - Number(r.km_inicial);
    if (!porCondutor[r.email_condutor]) porCondutor[r.email_condutor] = { km: 0, registros: 0 };
    porCondutor[r.email_condutor].km += km;
    porCondutor[r.email_condutor].registros += 1;
  });

  const entradas = Object.entries(porCondutor).sort((a, b) => b[1].km - a[1].km);
  const totalKm = entradas.reduce((s, [, v]) => s + v.km, 0);
  const mediaPorCondutor = entradas.length ? totalKm / entradas.length : 0;
  const ajustados = dados.filter(r => r.ajustado).length;

  const linhas = entradas.map(([email, v]) => {
    const c = _condutorPorEmailRel(email);
    const coop = c ? _cooperativaPorIdRel(c.cooperativa_id) : null;
    return [c?.nome || email, coop?.nome || '—', c?.placa || '—', `${Math.round(v.km).toLocaleString('pt-BR')} km`, String(v.registros)];
  });

  const top10 = entradas.slice(0, 10);

  return {
    kpis: [
      [`${Math.round(totalKm).toLocaleString('pt-BR')} km`, 'Total rodado'],
      [`${Math.round(mediaPorCondutor).toLocaleString('pt-BR')} km`, 'Média por condutor'],
      [entradas[0] ? _nomeCondutorRel(entradas[0][0]) : '—', 'Maior KM no período'],
      [String(ajustados), 'Registros ajustados manualmente'],
    ],
    colunas: ['Condutor', 'Cooperativa', 'Veículo', 'KM rodado', 'Registros'],
    linhas,
    grafico: {
      tipo: 'bar',
      labels: top10.map(([email]) => _nomeCondutorRel(email)),
      valores: top10.map(([, v]) => Math.round(v.km)),
      cores: top10.map((_, i) => _PALETA_REL[i % _PALETA_REL.length]),
      titulo: 'KM por condutor (top 10)',
      formatoValor: 'km'
    }
  };
}

function _calcularRelCondutores(f) {
  let dados = cacheCondutoresRel.slice();
  if (f.cooperativaId) dados = dados.filter(c => Number(c.cooperativa_id) === Number(f.cooperativaId));
  if (f.categoria) dados = dados.filter(c => (c.categoria || 'Não informada') === f.categoria);
  if (f.situacaoCnh) dados = dados.filter(c => _situacaoCnhRel(c.validade_cnh) === f.situacaoCnh);

  const vencendo = dados.filter(c => _situacaoCnhRel(c.validade_cnh) === 'Vence em breve').length;
  const vencidas = dados.filter(c => _situacaoCnhRel(c.validade_cnh) === 'Vencida').length;
  const cooperativasRepresentadas = new Set(dados.map(c => c.cooperativa_id).filter(id => id != null)).size;

  const linhas = dados
    .slice()
    .sort((a, b) => (a.validade_cnh || '9999-99-99').localeCompare(b.validade_cnh || '9999-99-99'))
    .map(c => {
      const coop = _cooperativaPorIdRel(c.cooperativa_id);
      const situacao = _situacaoCnhRel(c.validade_cnh);
      return [c.nome, coop?.nome || '—', c.categoria || '—', c.validade_cnh ? formatarDataBR(c.validade_cnh) : '—', situacao];
    });

  const contagemSituacao = {};
  dados.forEach(c => { const s = _situacaoCnhRel(c.validade_cnh); contagemSituacao[s] = (contagemSituacao[s] || 0) + 1; });
  const situacoesPresentes = Object.keys(contagemSituacao);

  return {
    kpis: [
      [String(dados.length), 'Condutores ativos'],
      [String(vencendo), 'CNH vencendo em 30 dias'],
      [String(vencidas), 'CNH vencida'],
      [String(cooperativasRepresentadas), 'Cooperativas representadas'],
    ],
    colunas: ['Condutor', 'Cooperativa', 'Categoria', 'Validade CNH', 'Situação'],
    linhas,
    linhaClasseStatusCol: 4,
    grafico: {
      tipo: 'doughnut',
      labels: situacoesPresentes,
      valores: situacoesPresentes.map(s => contagemSituacao[s]),
      cores: situacoesPresentes.map(s => _CORES_SITUACAO_CNH_REL[s] || '#94A3B8'),
      titulo: 'CNHs por situação'
    }
  };
}

function _calcularRelUnidades(f) {
  let dados = cacheSolicitacoesRel.filter(s => _dentroDoPeriodoRel(s.data_viagem, f.periodoDias));
  if (f.unidade) dados = dados.filter(s => s.unidade === f.unidade);
  if (f.setor) dados = dados.filter(s => s.setor === f.setor);

  const grupos = {};
  dados.forEach(s => {
    const chave = `${s.unidade || 'Sem unidade'}||${s.setor || 'Sem setor'}`;
    if (!grupos[chave]) grupos[chave] = { unidade: s.unidade || 'Sem unidade', setor: s.setor || 'Sem setor', viagens: 0, pessoas: 0, cancelamentos: 0 };
    grupos[chave].viagens += 1;
    grupos[chave].pessoas += Number(s.qtd_pessoas) || 0;
    if (['Cancelada', 'Desprezado'].includes(s.status)) grupos[chave].cancelamentos += 1;
  });

  const entradas = Object.values(grupos).sort((a, b) => b.viagens - a.viagens);
  const totalViagens = dados.length;
  const totalCancelamentos = entradas.reduce((s, g) => s + g.cancelamentos, 0);
  const unidadesDistintas = new Set(dados.map(s => s.unidade).filter(Boolean)).size;

  const linhas = entradas.map(g => [g.unidade, g.setor, String(g.viagens), String(g.pessoas), String(g.cancelamentos)]);

  // Gráfico por UNIDADE (padrão) - agrupamento à parte da tabela acima, que
  // continua detalhada por unidade+setor. EXCEÇÃO (pedido do usuário:
  // "apresente o nome do setor se for semed nesse gráfico"): quando a
  // unidade é a própria "SEMED" (sede/secretaria, sem escola vinculada), o
  // nome sozinho não diferencia as viagens - várias barras apareciam
  // idênticas como "SEMED" sem dizer de qual setor da secretaria era cada
  // uma. Só nesse caso o rótulo usa o nome do SETOR em vez do nome da
  // unidade; as demais unidades (escolas) continuam identificadas pelo
  // próprio nome, como sempre.
  const porUnidade = {};
  dados.forEach(s => {
    const unidade = s.unidade || 'Sem unidade';
    const ehSemed = unidade.trim().toLowerCase() === 'semed';
    const rotulo = ehSemed ? (s.setor || 'Sem setor') : unidade;
    porUnidade[rotulo] = (porUnidade[rotulo] || 0) + 1;
  });
  const top10Unidades = Object.entries(porUnidade).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return {
    kpis: [
      [String(unidadesDistintas), 'Unidades com viagem no período'],
      [String(totalViagens), 'Total de viagens'],
      [entradas[0]?.unidade || '—', 'Unidade com mais viagens'],
      [`${_pctRel(totalCancelamentos, totalViagens)}%`, 'Cancelamento médio'],
    ],
    colunas: ['Unidade', 'Setor', 'Viagens', 'Pessoas', 'Cancelamentos'],
    linhas,
    grafico: {
      tipo: 'bar',
      labels: top10Unidades.map(([rotulo]) => rotulo),
      valores: top10Unidades.map(([, v]) => v),
      cores: top10Unidades.map((_, i) => _PALETA_REL[i % _PALETA_REL.length]),
      titulo: 'Viagens por unidade (top 10)'
    }
  };
}

// PEDIDO DO USUÁRIO ("incorporar os registros desse artigo na tela de
// relatórios"): aba própria pra Motoboy/Documentos, mesmo padrão das outras
// abas (KPIs + tabela + gráfico com rótulos) - cruza os mesmos dados de
// cacheSolicitacoesRel, só filtrados por Tipo = Motoboy. qtd_pessoas
// representa "documentos" pra esse tipo (mesma coluna reaproveitada da
// Nova Solicitação - ver pages/nova-solicitacao.js).
function _calcularRelMotoboy(f) {
  let dados = cacheSolicitacoesRel.filter(s => s.tipo_viagem === 'Motoboy' && _dentroDoPeriodoRel(s.data_viagem, f.periodoDias));
  if (f.status) dados = dados.filter(s => (s.status || 'Pendente') === f.status);
  if (f.unidade) dados = dados.filter(s => s.unidade === f.unidade);
  if (f.setor) dados = dados.filter(s => s.setor === f.setor);

  const total = dados.length;
  const documentos = dados.reduce((soma, s) => soma + (Number(s.qtd_pessoas) || 0), 0);
  const confirmadas = dados.filter(s => s.status === 'Confirmada').length;

  const contagemUnidade = {};
  dados.forEach(s => { const u = s.unidade || 'Sem unidade'; contagemUnidade[u] = (contagemUnidade[u] || 0) + 1; });
  const unidadeMaisFrequente = Object.entries(contagemUnidade).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const linhas = dados
    .slice()
    .sort((a, b) => (b.data_viagem || '').localeCompare(a.data_viagem || ''))
    .map(s => [
      formatarDataBR(s.data_viagem),
      s.origem || '—',
      s.destino || '—',
      s.nome_ext || s.email_solicitante || '—',
      String(s.qtd_pessoas || 0),
      s.status || 'Pendente',
      _nomeCondutorRel(s.condutor_ida) || '—',
    ]);

  // Gráfico por UNIDADE (mesmo critério de _calcularRelUnidades, incluindo
  // a mesma exceção pra SEMED - ver comentário lá).
  const porUnidade = {};
  dados.forEach(s => {
    const unidade = s.unidade || 'Sem unidade';
    const ehSemed = unidade.trim().toLowerCase() === 'semed';
    const rotulo = ehSemed ? (s.setor || 'Sem setor') : unidade;
    porUnidade[rotulo] = (porUnidade[rotulo] || 0) + 1;
  });
  const top10Unidades = Object.entries(porUnidade).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return {
    kpis: [
      [String(total), 'Entregas no período'],
      [String(documentos), 'Documentos transportados'],
      [`${_pctRel(confirmadas, total)}%`, 'Taxa de confirmação'],
      [unidadeMaisFrequente, 'Origem mais frequente'],
    ],
    colunas: ['Data', 'Origem', 'Destino', 'Solicitante', 'Documentos', 'Status', 'Motoboy'],
    linhas,
    linhaClasseStatusCol: 5,
    grafico: {
      tipo: 'bar',
      labels: top10Unidades.map(([rotulo]) => rotulo),
      valores: top10Unidades.map(([, v]) => v),
      cores: top10Unidades.map((_, i) => _PALETA_REL[i % _PALETA_REL.length]),
      titulo: 'Entregas de Motoboy por unidade (top 10)'
    }
  };
}

function _calcularRelCooperativas(f) {
  let cooperativas = cacheCooperativasRel.slice();
  if (f.cooperativaId) cooperativas = cooperativas.filter(c => Number(c.id) === Number(f.cooperativaId));

  const linhasCalc = cooperativas.map(coop => {
    const condutoresDaCoop = cacheCondutoresRel.filter(c => Number(c.cooperativa_id) === Number(coop.id));
    const emailsDaCoop = new Set(condutoresDaCoop.map(c => (c.email || '').toLowerCase()));

    const kmDaCoop = cacheKmRel.filter(r => _dentroDoPeriodoRel(r.data, f.periodoDias) && emailsDaCoop.has((r.email_condutor || '').toLowerCase()) && r.km_final != null && r.km_inicial != null);
    const totalKm = kmDaCoop.reduce((s, r) => s + (Number(r.km_final) - Number(r.km_inicial)), 0);

    const idsViagens = new Set();
    cacheSolicitacoesRel.forEach(s => {
      if (!_dentroDoPeriodoRel(s.data_viagem, f.periodoDias)) return;
      if (emailsDaCoop.has((s.condutor_ida || '').toLowerCase()) || emailsDaCoop.has((s.condutor_volta || '').toLowerCase())) idsViagens.add(s.id);
    });

    return { nome: coop.nome, condutores: condutoresDaCoop.length, km: totalKm, viagens: idsViagens.size };
  }).sort((a, b) => b.km - a.km);

  const totalKmGeral = linhasCalc.reduce((s, c) => s + c.km, 0);
  const totalCondutores = cacheCondutoresRel.length;
  const cooperativasAtivas = cacheCooperativasRel.filter(c => c.ativo !== false).length;

  const linhas = linhasCalc.map(c => [c.nome, String(c.condutores), `${Math.round(c.km).toLocaleString('pt-BR')} km`, String(c.viagens)]);
  const top10 = linhasCalc.slice(0, 10);

  return {
    kpis: [
      [String(cooperativasAtivas), 'Cooperativas ativas'],
      [String(totalCondutores), 'Condutores no total'],
      [linhasCalc[0]?.nome || '—', 'Maior KM no período'],
      [`${Math.round(totalKmGeral).toLocaleString('pt-BR')} km`, 'KM total (todas)'],
    ],
    colunas: ['Cooperativa', 'Condutores', 'KM rodado', 'Viagens atendidas'],
    linhas,
    grafico: {
      tipo: 'bar',
      labels: top10.map(c => c.nome),
      valores: top10.map(c => Math.round(c.km)),
      cores: top10.map((_, i) => _PALETA_REL[i % _PALETA_REL.length]),
      titulo: 'KM por cooperativa',
      formatoValor: 'km'
    }
  };
}

// ------------------------------------------------------------
// Renderização (KPIs + tabela + gráfico)
// ------------------------------------------------------------
function _renderizarRelatorio(res) {
  _relatorioAtual = { titulo: RELATORIOS_REL[_relatorioAtivo].titulo, colunas: res.colunas, linhas: res.linhas };

  const kpisEl = document.getElementById('rel-kpis');
  if (kpisEl) {
    kpisEl.innerHTML = res.kpis.map(([valor, rotulo], i) => `
      <div class="kpi-exec-card">
        <div class="flex items-center gap-3">
          <div class="kpi-exec-icon" style="background:${_PALETA_REL[i % _PALETA_REL.length]}1A; color:${_PALETA_REL[i % _PALETA_REL.length]};">
            <span style="font-size:18px;">${RELATORIOS_REL[_relatorioAtivo].icone}</span>
          </div>
          <div class="min-w-0">
            <p class="text-xl font-bold leading-tight truncate" style="color:${_PALETA_REL[i % _PALETA_REL.length]};">${valor}</p>
            <p class="text-xs text-slate-500">${rotulo}</p>
          </div>
        </div>
      </div>`).join('');
  }

  const thead = document.getElementById('rel-tabela-thead');
  const tbody = document.getElementById('rel-tabela-tbody');
  if (thead) thead.innerHTML = `<tr>${res.colunas.map(c => `<th class="table-th">${c}</th>`).join('')}</tr>`;
  if (tbody) {
    if (!res.linhas.length) {
      tbody.innerHTML = `<tr><td colspan="${res.colunas.length}" class="text-center text-slate-500 py-8">Nenhum dado no período/filtro selecionado.</td></tr>`;
    } else {
      tbody.innerHTML = res.linhas.map(linha => `
        <tr>${linha.map((valor, i) => {
          if (i === res.linhaClasseStatusCol) {
            return `<td class="table-td"><span class="badge ${classeStatus(valor)}">${valor}</span></td>`;
          }
          return `<td class="table-td">${valor}</td>`;
        }).join('')}</tr>`).join('');
    }
  }

  const contadorEl = document.getElementById('rel-contador-linhas');
  if (contadorEl) contadorEl.textContent = `${res.linhas.length} registro(s)`;

  _renderizarGraficoRel(res.grafico);
}

// Rótulo (valor) mostrado em cima de cada barra/fatia dos gráficos da
// Central de Relatórios - "km" pros relatórios que somam KM rodado
// (KM Rodado e Cooperativas), número simples (com separador de milhar)
// nos demais.
function _formatarRotuloGraficoRel(valor, formato) {
  const numero = Math.round(Number(valor) || 0).toLocaleString('pt-BR');
  return formato === 'km' ? `${numero} km` : numero;
}

function _renderizarGraficoRel(g) {
  const canvas = document.getElementById('rel-chart-canvas');
  const legendaEl = document.getElementById('rel-chart-titulo');
  if (legendaEl) legendaEl.textContent = g.titulo;
  if (!canvas) return;

  if (_chartRelatorio) { _chartRelatorio.destroy(); _chartRelatorio = null; }
  if (!g.labels.length) return;

  const horizontal = g.tipo === 'bar' && g.labels.length > 6;
  // Plugin de rótulos é aplicado só nesta instância de gráfico (não é
  // registrado globalmente via Chart.register), então não afeta nenhum
  // outro gráfico do app (ex. Painel do Gestor).
  const pluginsDoGrafico = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];

  _chartRelatorio = new Chart(canvas.getContext('2d'), {
    type: g.tipo,
    plugins: pluginsDoGrafico,
    data: {
      labels: g.labels,
      datasets: [{ label: g.titulo, data: g.valores, backgroundColor: g.cores, borderRadius: g.tipo === 'bar' ? 4 : 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      layout: { padding: horizontal ? { right: 36 } : { top: 22 } },
      plugins: {
        legend: { display: g.tipo === 'doughnut', position: 'bottom' },
        datalabels: {
          display: pluginsDoGrafico.length > 0,
          color: g.tipo === 'doughnut' ? '#ffffff' : '#334155',
          font: { weight: '600', size: 11 },
          clip: false,
          formatter: (valor) => _formatarRotuloGraficoRel(valor, g.formatoValor),
          anchor: g.tipo === 'doughnut' ? 'center' : 'end',
          align: g.tipo === 'doughnut' ? 'center' : 'end',
          offset: g.tipo === 'doughnut' ? 0 : 4,
        }
      },
      scales: g.tipo === 'doughnut' ? {} : { [horizontal ? 'x' : 'y']: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

// ------------------------------------------------------------
// Exportação (reaproveita XLSX/jsPDF já carregados no index.html - mesmo
// padrão de exportarAgendaXlsxUI/exportarAgendaPDF em pages/agenda.js)
// ------------------------------------------------------------
function exportarRelatorioXlsxUI() {
  if (typeof XLSX === 'undefined') return Components.Toast.error('Biblioteca de exportação não carregada');
  if (!_relatorioAtual.linhas.length) return Components.Toast.warning('Não há dados para exportar');

  const linhasObj = _relatorioAtual.linhas.map(linha => {
    const obj = {};
    _relatorioAtual.colunas.forEach((col, i) => { obj[col] = linha[i]; });
    return obj;
  });

  const planilha = XLSX.utils.json_to_sheet(linhasObj);
  const livro = XLSX.utils.book_new();
  // Nomes de aba do Excel não podem ter : \ / ? * [ ] (o título do relatório
  // tem "/", ex. "Viagens / Solicitações" - sem isso o SheetJS lança erro).
  const nomeAba = _relatorioAtual.titulo.replace(/[:\\/?*\[\]]/g, '-').slice(0, 30);
  XLSX.utils.book_append_sheet(livro, planilha, nomeAba);
  XLSX.writeFile(livro, `MarkCarro_Relatorio_${_relatorioAtivo}.xlsx`);
}

function exportarRelatorioPDF() {
  if (typeof window.jspdf === 'undefined') return Components.Toast.error('Biblioteca de geração de PDF não carregada');
  if (!_relatorioAtual.linhas.length) return Components.Toast.warning('Não há dados para gerar o relatório');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const LP = doc.internal.pageSize.getWidth();
  if (typeof LOGO_PDF_B64 !== 'undefined') doc.addImage(LOGO_PDF_B64, 'PNG', 10, 4, 9, 9);
  doc.setTextColor(15, 23, 42); doc.setFontSize(12.5); doc.setFont('helvetica', 'bold');
  doc.text(`MarkCarro | ${_relatorioAtual.titulo}`, 22, 9);
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text(CONFIG.ORGAO || 'SEMED Nova Lima', 22, 13.5);
  doc.setFontSize(9); doc.text('Relatório', LP - 10, 9, { align: 'right' });
  doc.setFillColor(250, 204, 21); doc.rect(10, 16, LP - 20, 0.8, 'F');
  doc.setTextColor(0, 0, 0);

  doc.autoTable({
    startY: 20, margin: { left: 10, right: 10 },
    body: [['GERADO EM', new Date().toLocaleString('pt-BR'), 'REGISTROS', String(_relatorioAtual.linhas.length)]],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
    columnStyles: {
      0: { fillColor: [191, 219, 254], fontStyle: 'bold', cellWidth: 30 },
      1: { cellWidth: 90 },
      2: { fillColor: [191, 219, 254], fontStyle: 'bold', cellWidth: 30 },
      3: { cellWidth: 20 },
    },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 5, margin: { left: 10, right: 10 },
    head: [_relatorioAtual.colunas.map(c => c.toUpperCase())],
    body: _relatorioAtual.linhas,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, valign: 'middle', lineColor: [148, 163, 184], lineWidth: 0.15, overflow: 'linebreak' },
    headStyles: { fillColor: [250, 204, 21], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const paginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} - Página ${i} de ${paginas}`, 10, doc.internal.pageSize.getHeight() - 8);
  }

  doc.save(`markcarro-relatorio-${_relatorioAtivo}-${Date.now()}.pdf`);
}

// Expor globalmente
window.carregarRelatorios = carregarRelatorios;
window.selecionarRelatorio = selecionarRelatorio;
window.aplicarFiltrosRelatorio = aplicarFiltrosRelatorio;
window.limparFiltrosRelatorio = limparFiltrosRelatorio;
window.exportarRelatorioXlsxUI = exportarRelatorioXlsxUI;
window.exportarRelatorioPDF = exportarRelatorioPDF;
