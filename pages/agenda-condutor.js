// ============================================================
// MARKCARRO - Página Combinada: Agenda do Condutor + Gerenciar Condutores
// ============================================================
// - Agenda do Condutor (topo): visualização de corridas com edição
// - Gerenciar Condutores (baixo): cadastro/edição de condutores
// Sem gráficos.
// ============================================================

// ============================================================
// 1. ESTILO VISUAL MODERNO - Injeção automática
// ============================================================
(function aplicarEstiloAgendaCondutor() {
  if (document.getElementById('style-agenda-condutor-moderno')) return;
  const style = document.createElement('style');
  style.id = 'style-agenda-condutor-moderno';
  style.textContent = `
    /* ========================================================
       ÁREA PRINCIPAL
       ======================================================== */
    #agenda-condutor-container {
      color: #1e293b;
    }

    /* ========================================================
       CABEÇALHO DA AGENDA
       ======================================================== */
    .agenda-header-moderno {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
      padding: 24px 28px;
      border-radius: 18px;
      background:
        linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #2563eb 100%);
      color: white;
      box-shadow: 0 10px 30px rgba(15, 23, 42, .15);
    }

    .agenda-header-esquerda {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .agenda-header-icone {
      width: 54px;
      height: 54px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 15px;
      background: rgba(255,255,255,.13);
      font-size: 27px;
      backdrop-filter: blur(8px);
    }

    .agenda-header-titulo {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -.4px;
    }

    .agenda-header-subtitulo {
      margin: 4px 0 0;
      font-size: 13px;
      color: rgba(255,255,255,.75);
    }

    .agenda-badge-geral-moderno {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.2);
      color: white;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    /* ========================================================
       FILTROS
       ======================================================== */
    .agenda-filtros-moderno {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 18px 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 16px rgba(15,23,42,.05);
    }

    .agenda-filtros-titulo {
      font-size: 13px;
      font-weight: 800;
      color: #334155;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .agenda-filtros-linha {
      display: flex;
      align-items: end;
      gap: 12px;
      flex-wrap: wrap;
    }

    .agenda-campo {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .agenda-campo label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: .3px;
    }

    .agenda-campo input {
      height: 40px;
      min-width: 155px;
      padding: 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      background: #f8fafc;
      color: #0f172a;
      outline: none;
      transition: all .2s ease;
    }

    .agenda-campo input:focus {
      border-color: #2563eb;
      background: white;
      box-shadow: 0 0 0 3px rgba(37,99,235,.1);
    }

    .agenda-btn {
      height: 40px;
      padding: 0 18px;
      border-radius: 9px;
      border: none;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all .2s ease;
    }

    .agenda-btn-filtrar {
      background: #2563eb;
      color: white;
      box-shadow: 0 4px 10px rgba(37,99,235,.22);
    }

    .agenda-btn-filtrar:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }

    .agenda-btn-limpar {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .agenda-btn-limpar:hover {
      background: #e2e8f0;
    }

    /* ========================================================
       CARDS DE RESUMO
       ======================================================== */
    .agenda-resumo {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }

    .agenda-resumo-card {
      position: relative;
      overflow: hidden;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 15px;
      padding: 17px 18px;
      box-shadow: 0 4px 15px rgba(15,23,42,.045);
    }

    .agenda-resumo-card::after {
      content: "";
      position: absolute;
      right: -18px;
      bottom: -25px;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: rgba(37,99,235,.05);
    }

    .agenda-resumo-topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 9px;
    }

    .agenda-resumo-icone {
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: #eff6ff;
      font-size: 17px;
    }

    .agenda-resumo-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .3px;
    }

    .agenda-resumo-numero {
      font-size: 25px;
      font-weight: 800;
      line-height: 1;
      color: #0f172a;
    }

    /* ========================================================
       TABELA
       ======================================================== */
    .agenda-tabela-container {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 17px;
      overflow: hidden;
      box-shadow: 0 5px 20px rgba(15,23,42,.055);
    }

    .agenda-tabela-cabecalho {
      padding: 18px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .agenda-tabela-titulo {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }

    .agenda-tabela-subtitulo {
      margin: 3px 0 0;
      color: #64748b;
      font-size: 11px;
    }

    .agenda-tabela-scroll {
      overflow-x: auto;
    }

    #tb-agenda-condutor {
      width: 100%;
      border-collapse: collapse;
    }

    #tb-agenda-condutor th {
      background: #f8fafc;
      color: #64748b;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .45px;
      padding: 13px 14px;
      text-align: left;
      white-space: nowrap;
      border-bottom: 1px solid #e2e8f0;
    }

    #tb-agenda-condutor td {
      padding: 14px;
      font-size: 12px;
      color: #334155;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    #tb-agenda-condutor tr:last-child td {
      border-bottom: none;
    }

    #tb-agenda-condutor tbody tr {
      transition: background .15s ease;
    }

    #tb-agenda-condutor tbody tr:hover {
      background: #f8fafc;
    }

    .agenda-data {
      font-weight: 800;
      color: #0f172a;
      white-space: nowrap;
    }

    .agenda-horario {
      white-space: nowrap;
      font-weight: 700;
      color: #334155;
    }

    .agenda-rota {
      min-width: 210px;
    }

    .agenda-rota-origem {
      font-weight: 700;
      color: #0f172a;
    }

    .agenda-rota-destino {
      color: #2563eb;
      font-weight: 700;
    }

    .agenda-seta {
      color: #94a3b8;
      padding: 0 5px;
    }

    .agenda-solicitante {
      min-width: 170px;
    }

    .agenda-solicitante-nome {
      font-weight: 700;
      color: #334155;
    }

    .agenda-solicitante-contato {
      display: block;
      margin-top: 3px;
      color: #94a3b8;
      font-size: 10px;
    }

    .agenda-condutor {
      min-width: 170px;
      font-size: 11px;
      line-height: 1.55;
    }

    .agenda-papel {
      display: inline-flex;
      padding: 5px 8px;
      border-radius: 7px;
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
      font-size: 10px;
    }

    .agenda-justificativa {
      max-width: 190px;
      color: #64748b;
      font-size: 11px;
      line-height: 1.4;
    }

    /* ========================================================
       STATUS
       ======================================================== */
    .agenda-status {
      display: inline-flex !important;
      align-items: center;
      gap: 5px;
      padding: 5px 9px !important;
      border-radius: 999px !important;
      font-size: 10px !important;
      font-weight: 800 !important;
      white-space: nowrap;
    }

    /* ========================================================
       MOBILE
       ======================================================== */
    .agenda-card-mobile {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 15px;
      padding: 15px;
      margin-bottom: 10px;
      box-shadow: 0 3px 12px rgba(15,23,42,.05);
    }

    .agenda-card-mobile-topo {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 12px;
    }

    .agenda-card-mobile-data {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }

    .agenda-card-mobile-hora {
      margin-top: 3px;
      color: #64748b;
      font-size: 11px;
    }

    .agenda-card-mobile-rota {
      padding: 12px;
      background: #f8fafc;
      border-radius: 10px;
      margin-bottom: 10px;
    }

    .agenda-card-mobile-rota-label {
      font-size: 9px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    .agenda-card-mobile-rota-texto {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      line-height: 1.4;
    }

    .agenda-card-mobile-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
    }

    .agenda-card-info-item {
      padding: 9px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .agenda-card-info-label {
      display: block;
      font-size: 9px;
      color: #94a3b8;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .agenda-card-info-value {
      display: block;
      font-size: 11px;
      color: #334155;
      font-weight: 700;
      word-break: break-word;
    }

    /* ========================================================
       RESPONSIVIDADE
       ======================================================== */
    @media (max-width: 900px) {
      .agenda-resumo {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .agenda-header-moderno {
        padding: 20px;
      }
      .agenda-header-titulo {
        font-size: 19px;
      }
    }

    @media (max-width: 640px) {
      .agenda-header-moderno {
        align-items: flex-start;
      }
      .agenda-header-esquerda {
        gap: 11px;
      }
      .agenda-header-icone {
        width: 44px;
        height: 44px;
        font-size: 22px;
      }
      .agenda-header-titulo {
        font-size: 17px;
      }
      .agenda-header-subtitulo {
        font-size: 11px;
      }
      .agenda-badge-geral-moderno {
        font-size: 9px;
        padding: 7px 9px;
      }
      .agenda-filtros-linha {
        flex-direction: column;
        align-items: stretch;
      }
      .agenda-campo,
      .agenda-campo input {
        width: 100%;
      }
      .agenda-btn {
        width: 100%;
      }
      .agenda-resumo {
        grid-template-columns: 1fr 1fr;
        gap: 9px;
      }
      .agenda-resumo-card {
        padding: 13px;
      }
      .agenda-resumo-numero {
        font-size: 21px;
      }
      .agenda-tabela-container {
        border-radius: 13px;
      }
    }
  `;
  document.head.appendChild(style);
})();

// ============================================================
// 2. CABEÇALHO VISUAL
// ============================================================
function prepararCabecalhoAgendaCondutor() {
  const alvo =
    document.querySelector('#agenda-condutor-container') ||
    document.querySelector('[data-page="agenda-condutor"]') ||
    document.querySelector('#agenda-condutor-data-inicio')?.closest('main');

  if (!alvo) return;
  if (document.getElementById('agenda-header-moderno')) return;

  const header = document.createElement('div');
  header.id = 'agenda-header-moderno';
  header.className = 'agenda-header-moderno';

  header.innerHTML = `
    <div class="agenda-header-esquerda">
      <div class="agenda-header-icone">
        🚗
      </div>
      <div>
        <h1 class="agenda-header-titulo">
          AGENDA DO CONDUTOR
        </h1>
        <p class="agenda-header-subtitulo">
          Consulte suas viagens, horários e compromissos
        </p>
      </div>
    </div>
    <div
      id="agenda-condutor-badge-geral"
      class="agenda-badge-geral-moderno hidden"
    >
      👁️ Agenda Geral
    </div>
  `;

  alvo.insertBefore(header, alvo.firstChild);
}

// ============================================================
// 3. MELHORIA VISUAL DOS FILTROS
// ============================================================
function prepararFiltrosAgendaCondutor() {
  const inicio = document.getElementById('agenda-condutor-data-inicio');
  const fim = document.getElementById('agenda-condutor-data-fim');

  if (!inicio || !fim) return;

  const container =
    inicio.closest('.grid') ||
    inicio.closest('.flex') ||
    inicio.parentElement?.parentElement;

  if (container) {
    container.classList.add('agenda-filtros-moderno');
  }

  const labels = document.querySelectorAll(
    'label[for="agenda-condutor-data-inicio"],' +
    'label[for="agenda-condutor-data-fim"]'
  );

  labels.forEach(label => {
    label.classList.add('agenda-campo');
  });
}

// ============================================================
// 4. LOCALIZAR TELEFONE DO SOLICITANTE
// ============================================================
function telefoneSolicitante(s) {
  if (!s) return '';
  const possiveisCampos = [
    'telefone_solicitante',
    'telefone',
    'celular_solicitante',
    'celular',
    'fone',
    'telefone_contato',
    'contato'
  ];

  for (const campo of possiveisCampos) {
    if (
      s[campo] !== undefined &&
      s[campo] !== null &&
      String(s[campo]).trim() !== ''
    ) {
      return String(s[campo]).trim();
    }
  }
  return '';
}

// ============================================================
// 5. NOME DO CONDUTOR
// ============================================================
function papelDoCondutor(s) {
  return s.condutor_ida === usuarioAtual.email &&
         s.condutor_volta === usuarioAtual.email
    ? 'Ida e Volta'
    : s.condutor_ida === usuarioAtual.email
      ? 'Ida'
      : 'Volta';
}

// ============================================================
// 6. NOME DO CONDUTOR NA AGENDA GERAL
// ============================================================
function _nomeCondutor(email) {
  if (!email) return '';
  const c =
    (typeof cacheCondutores !== 'undefined'
      ? cacheCondutores
      : []
    ).find(x => x.email === email);
  return c?.nome || email;
}

// ============================================================
// 7. PAPEL / ESCALAÇÃO
// ============================================================
function papelOuEscalacao(s, verTudo) {
  if (!verTudo) {
    return papelDoCondutor(s);
  }
  const partes = [];
  if (s.condutor_ida) {
    partes.push(
      `<strong>Ida:</strong> ${_nomeCondutor(s.condutor_ida)}`
    );
  }
  if (s.condutor_volta) {
    partes.push(
      `<strong>Volta:</strong> ${_nomeCondutor(s.condutor_volta)}`
    );
  }
  return partes.join('<br>') || '—';
}

// ============================================================
// 8. FORMATAÇÃO DO STATUS
// ============================================================
function statusVisual(status) {
  const valor = String(status || '').toLowerCase();
  let icone = '●';
  if (
    valor.includes('confirm') ||
    valor.includes('aprov') ||
    valor.includes('realiz')
  ) {
    icone = '✓';
  }
  if (
    valor.includes('pend') ||
    valor.includes('aguard')
  ) {
    icone = '◷';
  }
  if (
    valor.includes('cancel') ||
    valor.includes('neg') ||
    valor.includes('recus')
  ) {
    icone = '×';
  }
  return `
    <span class="agenda-status badge ${classeStatus(status)}">
      ${icone} ${status || '—'}
    </span>
  `;
}

// ============================================================
// 9. DATA LOCAL
// ============================================================
function dataHojeAgenda() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// ============================================================
// 10. CRIAÇÃO DOS CARDS DE RESUMO
// ============================================================
function criarResumoAgenda(dados) {
  let resumo = document.getElementById('agenda-condutor-resumo');
  if (!resumo) {
    const tabela = document.getElementById('tb-agenda-condutor');
    if (!tabela) return;
    const tabelaContainer =
      tabela.closest('.agenda-tabela-container') ||
      tabela.closest('.card') ||
      tabela.parentElement;
    resumo = document.createElement('div');
    resumo.id = 'agenda-condutor-resumo';
    resumo.className = 'agenda-resumo';
    tabelaContainer.parentElement.insertBefore(
      resumo,
      tabelaContainer
    );
  }

  const total = dados.length;
  const hoje = dados.filter(s =>
    String(s.data_viagem || '') === dataHojeAgenda()
  ).length;
  const confirmadas = dados.filter(s => {
    const status = String(s.status || '').toLowerCase();
    return (
      status.includes('confirm') ||
      status.includes('aprov') ||
      status.includes('realiz')
    );
  }).length;
  const pendentes = dados.filter(s => {
    const status = String(s.status || '').toLowerCase();
    return (
      status.includes('pend') ||
      status.includes('aguard')
    );
  }).length;

  resumo.innerHTML = `
    <div class="agenda-resumo-card">
      <div class="agenda-resumo-topo">
        <span class="agenda-resumo-label">
          Total de viagens
        </span>
        <span class="agenda-resumo-icone">
          🚗
        </span>
      </div>
      <div class="agenda-resumo-numero">
        ${total}
      </div>
    </div>

    <div class="agenda-resumo-card">
      <div class="agenda-resumo-topo">
        <span class="agenda-resumo-label">
          Hoje
        </span>
        <span class="agenda-resumo-icone">
          📅
        </span>
      </div>
      <div class="agenda-resumo-numero">
        ${hoje}
      </div>
    </div>

    <div class="agenda-resumo-card">
      <div class="agenda-resumo-topo">
        <span class="agenda-resumo-label">
          Confirmadas
        </span>
        <span class="agenda-resumo-icone">
          ✓
        </span>
      </div>
      <div class="agenda-resumo-numero">
        ${confirmadas}
      </div>
    </div>

    <div class="agenda-resumo-card">
      <div class="agenda-resumo-topo">
        <span class="agenda-resumo-label">
          Pendentes
        </span>
        <span class="agenda-resumo-icone">
          ◷
        </span>
      </div>
      <div class="agenda-resumo-numero">
        ${pendentes}
      </div>
    </div>
  `;
}

// ============================================================
// 11. CACHE E ESTADO
// ============================================================
let cacheCondutores = [];
let cacheCooperativasCondutor = [];
let cacheLocais = [];
let solicitacaoEditandoId = null;

// ============================================================
// 12. INICIALIZAÇÃO DA PÁGINA COMBINADA
// ============================================================
async function carregarPaginaAgendaCondutor() {
  if (!usuarioAtual) return;

  // Carrega caches compartilhados
  try {
    const [condutores, cooperativas, locais] = await Promise.all([
      listarCondutores(),
      listarCooperativasAtivas().catch(() => []),
      listarLocais().catch(() => [])
    ]);
    cacheCondutores = condutores || [];
    cacheCooperativasCondutor = cooperativas || [];
    cacheLocais = locais || [];
    preencherSelectCooperativas();
    preencherSelectCondutoresKm();
  } catch (e) {
    console.error('Erro ao carregar caches:', e);
  }

  // Carrega as duas seções
  await Promise.all([
    carregarAgendaCondutor(),
    carregarGerenciarCondutores()
  ]);
}

// ============================================================
// 13. SEÇÃO 1: AGENDA DO CONDUTOR
// ============================================================
async function carregarAgendaCondutor() {
  const inicio = document.getElementById('agenda-condutor-data-inicio').value;
  const fim = document.getElementById('agenda-condutor-data-fim').value;
  const verTudo = !!usuarioAtual.ver_agenda_geral;

  prepararCabecalhoAgendaCondutor();
  prepararFiltrosAgendaCondutor();

  const badge = document.getElementById('agenda-condutor-badge-geral');
  if (badge) {
    badge.classList.toggle('hidden', !verTudo);
  }

  const thPapel = document.getElementById('th-agenda-condutor-papel');
  if (thPapel) {
    thPapel.textContent = verTudo ? 'Condutor(es)' : 'Papel';
  }

  const tbody = document.getElementById('tb-agenda-condutor');
  const cards = document.getElementById('cards-agenda-condutor');

  if (!tbody) return;

  Components.Loading.show(tbody);
  if (cards) {
    cards.innerHTML = `
      <div class="p-8 text-center text-slate-500 text-sm">
        <div style="font-size:25px;margin-bottom:8px">🚗</div>
        Carregando agenda...
      </div>
    `;
  }

  try {
    if (verTudo && (!cacheCondutores || !cacheCondutores.length)) {
      try { cacheCondutores = await listarCondutores(); } catch (e) { /* mostra e-mail se falhar */ }
    }

    let dados;
    if (inicio && fim) {
      dados = await buscarSolicitacoesPorData(inicio, fim);
      if (!verTudo) {
        dados = (dados || []).filter(s =>
          s.condutor_ida === usuarioAtual.email || s.condutor_volta === usuarioAtual.email
        );
      }
    } else if (verTudo) {
      dados = await buscarTodasSolicitacoes();
    } else {
      dados = await buscarSolicitacoesPorCondutor(usuarioAtual.email);
    }
    renderizarAgendaCondutor(dados || [], verTudo);
  } catch (e) {
    console.error('Erro ao carregar agenda do condutor:', e);
    tbody.innerHTML = `
      <tr>
        <td
          colspan="10"
          style="
            text-align:center;
            padding:40px;
            color:#dc2626;
          "
        >
          <div style="font-size:28px;margin-bottom:8px">⚠️</div>
          <strong>Erro ao carregar agenda</strong>
          <br>
          <button
            class="agenda-btn agenda-btn-filtrar"
            style="margin-top:12px"
            onclick="carregarAgendaCondutor()"
          >
            Tentar novamente
          </button>
        </td>
      </tr>
    `;
    if (cards) {
      cards.innerHTML = `
        <div
          style="
            text-align:center;
            color:#dc2626;
            padding:35px;
          "
        >
          ⚠️<br>Erro ao carregar agenda.
        </div>
      `;
    }
    if (typeof Components !== 'undefined' && Components.Toast) {
      Components.Toast.error('Erro ao carregar agenda');
    }
  }
}

// ============================================================
// 14. RENDERIZAÇÃO DA AGENDA - VISUAL MODERNO
// ============================================================
function _tipoCurto(categoria) {
  return categoria === 'Motoboy' ? 'Doc' : 'Mot';
}

function _primeiroNome(nomeCompleto) {
  if (!nomeCompleto) return '';
  return nomeCompleto.split(' ')[0];
}

function _formatarDataHoraSolicitacao(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function renderizarAgendaCondutor(dados, verTudo) {
  const tbody = document.getElementById('tb-agenda-condutor');
  const cards = document.getElementById('cards-agenda-condutor');

  if (!tbody) return;

  // Resumo
  criarResumoAgenda(dados);

  // Sem resultados
  if (!dados.length) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="10"
          style="
            text-align:center;
            padding:55px 20px;
          "
        >
          <div style="font-size:42px;margin-bottom:10px;opacity:.7">🚗</div>
          <strong style="display:block;font-size:14px;color:#334155;">Nenhuma corrida encontrada</strong>
          <span style="display:block;margin-top:5px;font-size:11px;color:#94a3b8;">Tente alterar o período selecionado.</span>
        </td>
      </tr>
    `;
    if (cards) {
      cards.innerHTML = `
        <div style="text-align:center;padding:45px 20px;color:#64748b;">
          <div style="font-size:38px;margin-bottom:10px">🚗</div>
          <strong>Nenhuma corrida encontrada</strong>
          <div style="font-size:11px;margin-top:5px;">Tente alterar o período selecionado.</div>
        </div>
      `;
    }
    return;
  }

  // Tabela Desktop - Visual Moderno
  tbody.innerHTML = dados.map(s => {
    const telefone = telefoneSolicitante(s);
    const solicitante = s.nome_ext || s.email_solicitante || 'Não informado';

    return `
      <tr>
        <!-- DATA/HORA SOLICITAÇÃO -->
        <td>
          <div class="agenda-data">${_formatarDataHoraSolicitacao(s.data_solicitacao)}</div>
        </td>

        <!-- SOLICITANTE (PRIMEIRO NOME) -->
        <td class="agenda-solicitante">
          <span class="agenda-solicitante-nome">👤 ${_primeiroNome(solicitante)}</span>
          ${telefone ? `<span class="agenda-solicitante-contato">☎ ${telefone}</span>` : ''}
        </td>

        <!-- SETOR / UNIDADE -->
        <td class="agenda-condutor">
          ${s.setor || '—'}<br class="hidden sm:block">
          <span style="color:#64748b;font-size:10px;">${s.unidade || '—'}</span>
        </td>

        <!-- TIPO -->
        <td class="agenda-condutor" style="text-align:center;">
          <span class="agenda-papel">${_tipoCurto(s.tipo_viagem)}</span>
        </td>

        <!-- Nº PASS -->
        <td style="text-align:center; font-weight:700; color:#0f172a;">${s.qtd_pessoas || 1}</td>

        <!-- CONDUTOR IDA -->
        <td class="agenda-condutor">${_nomeCondutor(s.condutor_ida) || '—'}</td>

        <!-- CONDUTOR VOLTA -->
        <td class="agenda-condutor">${_nomeCondutor(s.condutor_volta) || '—'}</td>

        <!-- JUSTIFICATIVA -->
        <td>
          <div class="agenda-justificativa">${s.justificativa || '—'}</div>
        </td>

        <!-- STATUS -->
        <td>${statusVisual(s.status)}</td>

        <!-- AÇÃO -->
        <td style="text-align:center;">
          <button class="btn-outline text-xs py-1 px-2" onclick="abrirModalEditarAgenda('${s.id}')" title="Editar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
        </td>
      </tr>
    `}).join('');

  // Mobile: Cards Modernos
  if (cards) {
    cards.innerHTML = dados.map(s => {
      const telefone = telefoneSolicitante(s);
      const solicitante = s.nome_ext || s.email_solicitante || 'Não informado';

      return `
        <div class="agenda-card-mobile">
          <!-- TOPO -->
          <div class="agenda-card-mobile-topo">
            <div>
              <div class="agenda-card-mobile-data">📅 ${formatarDataBR(s.data_viagem)}</div>
              <div class="agenda-card-mobile-hora">🕐 ${formatarHoraBR(s.hora_saida)} → ${formatarHoraBR(s.hora_retorno)}</div>
            </div>
            <div>${statusVisual(s.status)}</div>
          </div>

          <!-- ROTA -->
          <div class="agenda-card-mobile-rota">
            <div class="agenda-card-mobile-rota-label">Rota</div>
            <div class="agenda-card-mobile-rota-texto">
              ${s.origem || '—'}
              <span style="color:#2563eb;padding:0 5px;">→</span>
              ${s.destino || '—'}
            </div>
          </div>

          <!-- INFORMAÇÕES -->
          <div class="agenda-card-mobile-info">
            <div class="agenda-card-info-item">
              <span class="agenda-card-info-label">Solicitante</span>
              <span class="agenda-card-info-value">👤 ${_primeiroNome(solicitante)}</span>
            </div>
            <div class="agenda-card-info-item">
              <span class="agenda-card-info-label">Tipo</span>
              <span class="agenda-card-info-value">${_tipoCurto(s.tipo_viagem)}</span>
            </div>
            ${telefone ? `
              <div class="agenda-card-info-item">
                <span class="agenda-card-info-label">Telefone</span>
                <span class="agenda-card-info-value">☎ ${telefone}</span>
              </div>
            ` : ''}
            ${verTudo ? `
              <div class="agenda-card-info-item">
                <span class="agenda-card-info-label">Condutor(es)</span>
                <span class="agenda-card-info-value">${papelOuEscalacao(s, true)}</span>
              </div>
            ` : ''}
            <div class="agenda-card-info-item">
              <span class="agenda-card-info-label">Passageiros</span>
              <span class="agenda-card-info-value">${s.qtd_pessoas || 1}</span>
            </div>
            <div class="agenda-card-info-item">
              <span class="agenda-card-info-label">Setor/Unidade</span>
              <span class="agenda-card-info-value">${s.setor || '—'} / ${s.unidade || '—'}</span>
            </div>
          </div>

          ${s.justificativa ? `
            <div style="margin-top:10px;padding:9px;background:#f8fafc;border-radius:8px;font-size:10px;color:#64748b;">
              <strong>Observação:</strong> ${s.justificativa}
            </div>
          ` : ''}

          <div class="mt-2 text-right">
            <button class="btn-outline text-xs py-1 px-2" onclick="abrirModalEditarAgenda('${s.id}')">
              <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Editar
            </button>
          </div>
        </div>
      `}).join('');
  }
}

function limparFiltroAgendaCondutor() {
  document.getElementById('agenda-condutor-data-inicio').value = '';
  document.getElementById('agenda-condutor-data-fim').value = '';
  carregarAgendaCondutor();
}

// ============================================================
// 15. MODAL EDIÇÃO DE AGENDA (SOLICITAÇÃO)
// ============================================================
function abrirModalEditarAgenda(id) {
  buscarSolicitacaoPorId(id).then(solicitacao => {
    if (!solicitacao) return Components.Toast.error('Não foi possível carregar a solicitação');
    preencherModalEditarAgenda(solicitacao);
  }).catch(() => Components.Toast.error('Erro ao carregar dados para edição'));
}

function preencherModalEditarAgenda(s) {
  solicitacaoEditandoId = s.id;

  // Preenche selects de locais
  const optionsLocais = cacheLocais.map(l => `<option value="${l.nome}">${l.nome}</option>`).join('');
  const outroOption = '<option value="__OUTRO__">Outro (digitar)</option>';

  document.getElementById('edit-agenda-id').value = s.id;
  document.getElementById('edit-agenda-data-viagem').value = s.data_viagem || '';
  document.getElementById('edit-agenda-hora-saida').value = s.hora_saida || '';
  document.getElementById('edit-agenda-hora-retorno').value = s.hora_retorno || '';

  const selOrigem = document.getElementById('edit-agenda-origem');
  selOrigem.innerHTML = `<option value="">Selecione...</option>${optionsLocais}${outroOption}`;
  selOrigem.value = s.origem || '';
  alternarCampoOutro('edit-agenda-origem', 'edit-agenda-origem-outro');

  const selDestino = document.getElementById('edit-agenda-destino');
  selDestino.innerHTML = `<option value="">Selecione...</option>${optionsLocais}${outroOption}`;
  selDestino.value = s.destino || '';
  alternarCampoOutro('edit-agenda-destino', 'edit-agenda-destino-outro');

  if (s.origem && !cacheLocais.some(l => l.nome === s.origem)) {
    document.getElementById('edit-agenda-origem-outro').value = s.origem;
    document.getElementById('edit-agenda-origem-outro').classList.remove('hidden');
  }
  if (s.destino && !cacheLocais.some(l => l.nome === s.destino)) {
    document.getElementById('edit-agenda-destino-outro').value = s.destino;
    document.getElementById('edit-agenda-destino-outro').classList.remove('hidden');
  }

  document.getElementById('edit-agenda-justificativa').value = s.justificativa || '';
  document.getElementById('edit-agenda-tipo').value = s.tipo_viagem || 'Comum';
  document.getElementById('edit-agenda-qtd-pessoas').value = s.qtd_pessoas || 1;

  // Condutores
  const optionsCondutores = cacheCondutores.map(c => `<option value="${c.email}">${c.nome} (${_tipoCurto(c.categoria)})</option>`).join('');
  document.getElementById('edit-agenda-condutor-ida').innerHTML = `<option value="">Nenhum</option>${optionsCondutores}`;
  document.getElementById('edit-agenda-condutor-ida').value = s.condutor_ida || '';
  document.getElementById('edit-agenda-condutor-volta').innerHTML = `<option value="">Nenhum</option>${optionsCondutores}`;
  document.getElementById('edit-agenda-condutor-volta').value = s.condutor_volta || '';

  document.getElementById('modal-editar-agenda').classList.remove('hidden');
  document.getElementById('modal-editar-agenda-backdrop').classList.remove('hidden');
}

function fecharModalEditarAgenda() {
  document.getElementById('modal-editar-agenda').classList.add('hidden');
  document.getElementById('modal-editar-agenda-backdrop').classList.add('hidden');
  solicitacaoEditandoId = null;
}

function alternarCampoOutro(selectId, inputOutroId) {
  const sel = document.getElementById(selectId);
  const inp = document.getElementById(inputOutroId);
  if (sel.value === '__OUTRO__') {
    inp.classList.remove('hidden');
    inp.required = true;
  } else {
    inp.classList.add('hidden');
    inp.required = false;
    inp.value = '';
  }
}

async function salvarEdicaoAgenda() {
  const id = document.getElementById('edit-agenda-id').value;
  if (!id) return;

  const origemSel = document.getElementById('edit-agenda-origem').value;
  const destinoSel = document.getElementById('edit-agenda-destino').value;

  const dados = {
    data_viagem: document.getElementById('edit-agenda-data-viagem').value || null,
    hora_saida: document.getElementById('edit-agenda-hora-saida').value || null,
    hora_retorno: document.getElementById('edit-agenda-hora-retorno').value || null,
    origem: origemSel === '__OUTRO__' ? document.getElementById('edit-agenda-origem-outro').value.trim() : origemSel,
    destino: destinoSel === '__OUTRO__' ? document.getElementById('edit-agenda-destino-outro').value.trim() : destinoSel,
    justificativa: document.getElementById('edit-agenda-justificativa').value.trim() || null,
    tipo_viagem: document.getElementById('edit-agenda-tipo').value || 'Comum',
    qtd_pessoas: parseInt(document.getElementById('edit-agenda-qtd-pessoas').value) || 1,
    condutor_ida: document.getElementById('edit-agenda-condutor-ida').value || null,
    condutor_volta: document.getElementById('edit-agenda-condutor-volta').value || null
  };

  if (!dados.origem || !dados.destino) return Components.Toast.error('Origem e Destino são obrigatórios');
  if (!dados.data_viagem) return Components.Toast.error('Data da viagem é obrigatória');
  if (!dados.hora_saida) return Components.Toast.error('Hora de saída é obrigatória');

  try {
    await atualizarSolicitacao(id, dados);
    Components.Toast.success('Corrida atualizada!');
    fecharModalEditarAgenda();
    carregarAgendaCondutor();
  } catch (e) {
    Components.Toast.error('Erro ao salvar: ' + e.message);
  }
}

// ============================================================
// 16. SEÇÃO 2: GERENCIAR CONDUTORES
// ============================================================
function preencherSelectCooperativas() {
  const select = document.getElementById('cond-cooperativa');
  if (!select) return;
  const valorAtual = select.value;
  select.innerHTML = '<option value="">Nenhuma / Selecione...</option>';
  cacheCooperativasCondutor.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
  });
  select.value = valorAtual;
}

function descreverCooperativa(cooperativaId) {
  if (!cooperativaId) return '';
  const c = cacheCooperativasCondutor.find(x => String(x.id) === String(cooperativaId));
  return c ? c.nome : '';
}

async function carregarGerenciarCondutores() {
  const tbody = document.getElementById('tb-condutores');
  Components.Loading.show(tbody);
  try {
    const condutores = await listarCondutores();
    cacheCondutores = condutores || [];
    renderizarTabelaCondutores(cacheCondutores);
    renderizarAvisoCnh('aviso-cnh-condutores', cacheCondutores);
    preencherSelectCondutoresKm();
  } catch (e) {
    console.error('Erro ao carregar condutores:', e);
    tbody.innerHTML = `<tr><td colspan="13" class="text-center text-red-500 py-8">Erro ao carregar condutores. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarGerenciarCondutores()">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar condutores');
  }
}

function renderizarTabelaCondutores(condutores) {
  const tbody = document.getElementById('tb-condutores');
  if (!condutores.length) {
    tbody.innerHTML = '<tr><td colspan="13" class="text-center text-slate-500">Nenhum condutor</td></tr>';
    return;
  }

  tbody.innerHTML = condutores.map(c => `
    <tr>
      <td>${c.nome}</td>
      <td>${c.email}</td>
      <td>${c.telefone || ''}</td>
      <td>${c.categoria || ''}</td>
      <td>${descreverCooperativa(c.cooperativa_id)}</td>
      <td>${c.placa || ''}</td>
      <td>${c.modelo || ''}</td>
      <td>${c.capacidade || ''}</td>
      <td>${c.cnh || ''}</td>
      <td>${formatarDataBR(c.validade_cnh) || ''}</td>
      <td><span class="badge ${c.ativo ? 'badge-confirmada' : 'badge-cancelada'}">${c.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <input type="checkbox" class="w-5 h-5 accent-mc-azul cursor-pointer" ${c.ver_agenda_geral ? 'checked' : ''} onchange="alternarAgendaGeral('${c.email}', this.checked)" aria-label="Ver Agenda Geral">
      </td>
      <td>
        <div class="flex gap-2">
          <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarCondutor('${c.email}')">Editar</button>
          <button class="${c.ativo ? 'btn-danger' : 'btn-success'} text-xs py-1.5 px-2.5" onclick="alternarAtivoCondutor('${c.email}', ${!c.ativo})">${c.ativo ? 'Bloquear' : 'Ativar'}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function preencherSelectCondutoresKm() {
  const select = document.getElementById('km-gestor-condutor');
  if (!select) return;
  select.innerHTML = '<option value="">Selecione...</option>';
  cacheCondutores.forEach(c => {
    select.innerHTML += `<option value="${c.email}">${c.nome} (${c.capacidade || ''})</option>`;
  });
}

function limparFormCondutor() {
  document.getElementById('form-condutor').reset();
  document.getElementById('cond-email-original').value = '';
  document.getElementById('titulo-form-condutor').textContent = 'Novo Condutor';
  document.getElementById('btn-cancelar-edicao-condutor').classList.add('hidden');
}

async function salvarCondutorGestor() {
  const emailOriginal = document.getElementById('cond-email-original').value;
  const dados = {
    nome: document.getElementById('cond-nome').value,
    email: document.getElementById('cond-email').value,
    senha: document.getElementById('cond-senha').value,
    telefone: document.getElementById('cond-telefone').value,
    categoria: document.getElementById('cond-categoria').value,
    cooperativaId: document.getElementById('cond-cooperativa').value,
    placa: document.getElementById('cond-placa').value,
    modelo: document.getElementById('cond-modelo').value,
    capacidade: document.getElementById('cond-capacidade').value,
    cnh: document.getElementById('cond-cnh').value,
    validadeCnh: document.getElementById('cond-validade-cnh').value
  };

  if (!dados.nome || !dados.email) return Components.Toast.error('Nome e e-mail são obrigatórios');
  if (!emailOriginal && !dados.senha) return Components.Toast.error('Defina uma senha para novo condutor');

  try {
    const perfil = {
      nome: dados.nome,
      telefone: dados.telefone,
      placa: dados.placa,
      modelo: dados.modelo,
      capacidade: dados.capacidade ? parseInt(dados.capacidade) : null,
      categoria: dados.categoria,
      cooperativa_id: dados.cooperativaId ? parseInt(dados.cooperativaId) : null,
      cnh: dados.cnh,
      validade_cnh: dados.validadeCnh
    };

    if (emailOriginal) {
      await atualizarPerfilPorEmail(emailOriginal, perfil);
      if (dados.email !== emailOriginal) {
        Components.Toast.warning('Mudança de e-mail não suportada diretamente');
      }
    } else {
      await criarUsuarioComoAdmin(dados.email, dados.senha, { tipo: 'condutor', nome: dados.nome });
      await atualizarPerfilPorEmail(dados.email, perfil);
    }

    Components.Toast.success(emailOriginal ? 'Condutor atualizado!' : 'Condutor cadastrado!');
    limparFormCondutor();
    carregarGerenciarCondutores();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

function editarCondutor(email) {
  const c = cacheCondutores.find(x => x.email === email);
  if (!c) return;

  document.getElementById('cond-email-original').value = c.email;
  document.getElementById('cond-nome').value = c.nome;
  document.getElementById('cond-email').value = c.email;
  document.getElementById('cond-senha').value = '';
  document.getElementById('cond-telefone').value = c.telefone || '';
  document.getElementById('cond-categoria').value = c.categoria || 'Motorista';
  document.getElementById('cond-cooperativa').value = c.cooperativa_id || '';
  document.getElementById('cond-placa').value = c.placa || '';
  document.getElementById('cond-modelo').value = c.modelo || '';
  document.getElementById('cond-capacidade').value = c.capacidade || '';
  document.getElementById('cond-cnh').value = c.cnh || '';
  document.getElementById('cond-validade-cnh').value = c.validade_cnh || '';

  document.getElementById('titulo-form-condutor').textContent = 'Editar Condutor';
  document.getElementById('btn-cancelar-edicao-condutor').classList.remove('hidden');
}

async function alternarAgendaGeral(email, permitir) {
  try {
    await atualizarPerfilPorEmail(email, { ver_agenda_geral: permitir });
    Components.Toast.success(permitir ? 'Agenda Geral liberada!' : 'Agenda Geral bloqueada!');
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

async function alternarAtivoCondutor(email, ativar) {
  try {
    await atualizarPerfilPorEmail(email, { ativo: ativar });
    Components.Toast.success(ativar ? 'Acesso liberado!' : 'Acesso bloqueado!');
    carregarGerenciarCondutores();
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

function exportarCondutoresXlsxUI() {
  if (typeof XLSX === 'undefined') return Components.Toast.error('Biblioteca de exportação não carregada');
  if (!cacheCondutores.length) return Components.Toast.warning('Não há condutores para exportar');

  const linhas = cacheCondutores.map(c => ({
    'Nome': c.nome,
    'E-mail': c.email,
    'Telefone': c.telefone || '',
    'Categoria': c.categoria || '',
    'Cooperativa': descreverCooperativa(c.cooperativa_id),
    'Placa': c.placa || '',
    'Modelo': c.modelo || '',
    'Capacidade': c.capacidade || '',
    'CNH': c.cnh || '',
    'Validade CNH': formatarDataBR(c.validade_cnh) || '',
    'Status': c.ativo ? 'Ativo' : 'Inativo'
  }));

  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Condutores');
  XLSX.writeFile(livro, 'MarkCarro_Condutores.xlsx');
}

// ============================================================
// 17. EXPORTAÇÕES GLOBAIS
// ============================================================
window.carregarPaginaAgendaCondutor = carregarPaginaAgendaCondutor;
window.carregarAgendaCondutor = carregarAgendaCondutor;
window.limparFiltroAgendaCondutor = limparFiltroAgendaCondutor;
window.abrirModalEditarAgenda = abrirModalEditarAgenda;
window.fecharModalEditarAgenda = fecharModalEditarAgenda;
window.alternarCampoOutro = alternarCampoOutro;
window.salvarEdicaoAgenda = salvarEdicaoAgenda;
window.carregarGerenciarCondutores = carregarGerenciarCondutores;
window.exportarCondutoresXlsxUI = exportarCondutoresXlsxUI;
window.salvarCondutorGestor = salvarCondutorGestor;
window.limparFormCondutor = limparFormCondutor;
window.editarCondutor = editarCondutor;
window.alternarAgendaGeral = alternarAgendaGeral;
window.alternarAtivoCondutor = alternarAtivoCondutor;

// ============================================================
// 18. INICIALIZAÇÃO AUTOMÁTICA VISUAL
// ============================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    prepararCabecalhoAgendaCondutor();
    prepararFiltrosAgendaCondutor();
  });
} else {
  prepararCabecalhoAgendaCondutor();
  prepararFiltrosAgendaCondutor();
}
