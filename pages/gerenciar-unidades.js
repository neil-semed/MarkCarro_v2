// ============================================================
// MARKCARRO - Página: Gerenciar Unidades
// ============================================================
// Cadastro próprio de Unidade (nome, tipo, endereço, telefone, e-mail) -
// tabela "unidades", separada do sistema de Unidade/Setor em
// tabelas_apoio (que continua controlando os dropdowns de Cadastro/
// Nova Solicitação/Gerenciar Usuários exatamente como antes).
//
// Esta tela também gerencia agora os SETORES (tabelas_apoio: Unidade +
// Setor + E-mail) - antes só dava pra criar um Setor programaticamente
// (SQL/Supabase direto), sem nenhuma tela. O campo "tipo" da Unidade
// (Escola/Creche-CEI/Administrativo/Cooperativa/Outro) serve só pra
// permitir criar um Setor em VÁRIAS Unidades do mesmo tipo de uma vez
// (ex: "ADM ESCOLAR" em todas as Escolas), sem precisar repetir uma por
// uma - pedido do usuário ("criar um setor para a unidade ou para todas
// ou para o grupo - criar subdivisão de tipos de unidade").

let cacheUnidadesGerenciar = [];
let cacheSetoresGerenciar = [];

async function carregarGerenciarUnidades() {
  const tbodyUnidades = document.getElementById('tb-unidades');
  const tbodySetores = document.getElementById('tb-setores');
  Components.Loading.show(tbodyUnidades);
  Components.Loading.show(tbodySetores);
  try {
    const [unidades, setores] = await Promise.all([
      listarTodasUnidades(),
      listarTabelasApoio()
    ]);
    cacheUnidadesGerenciar = unidades || [];
    cacheSetoresGerenciar = setores || [];
    preencherFiltroUnidades();
    aplicarFiltroUnidades();
    preencherDropdownsSetor();
    renderizarTabelaSetores(cacheSetoresGerenciar);
  } catch (e) {
    // Sem isso, um erro aqui deixava as duas tabelas travadas no spinner
    // de "Carregando..." pra sempre (nada reescrevia o tbody depois do
    // catch).
    console.error('Erro ao carregar unidades/setores:', e);
    tbodyUnidades.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-8">Erro ao carregar unidades. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarGerenciarUnidades()">Tentar de novo</button></td></tr>`;
    tbodySetores.innerHTML = '<tr><td colspan="4" class="text-center text-red-500 py-8">Erro ao carregar setores.</td></tr>';
    Components.Toast.error('Erro ao carregar unidades');
  }
}

function renderizarTabelaUnidades(unidades) {
  const tbody = document.getElementById('tb-unidades');
  if (!unidades.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-slate-500 py-8">Nenhuma unidade cadastrada</td></tr>';
    return;
  }

  tbody.innerHTML = unidades.map(u => `
    <tr>
      <td class="table-td">${u.nome}</td>
      <td class="table-td">${u.tipo || '—'}</td>
      <td class="table-td">${u.endereco || ''}</td>
      <td class="table-td">${u.telefone || ''}</td>
      <td class="table-td">${u.email || ''}</td>
      <td class="table-td"><span class="badge ${u.ativo ? 'badge-confirmada' : 'badge-cancelada'}">${u.ativo ? 'Ativa' : 'Inativa'}</span></td>
      <td class="table-td">
        <div class="flex gap-2">
          <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarUnidade(${u.id})">Editar</button>
          <button class="${u.ativo ? 'btn-danger' : 'btn-success'} text-xs py-1.5 px-2.5" onclick="alternarAtivoUnidade(${u.id}, ${!u.ativo})">${u.ativo ? 'Bloquear' : 'Ativar'}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// CORREÇÃO (item 2 do lote do admin): "unidades - colocar filtro para
// unidade" - antes a lista de Unidades cadastradas não tinha nenhum
// filtro (só a de Setores, mais abaixo, já tinha). Dropdown simples (em
// vez de busca livre) porque a lista de Unidades tende a ser curta e
// fixa - mais rápido escolher do que digitar.
function preencherFiltroUnidades() {
  const sel = document.getElementById('filtro-unidades');
  if (!sel) return;
  const atual = sel.value;
  const nomes = cacheUnidadesGerenciar.map(u => u.nome).sort();
  sel.innerHTML = '<option value="">Todas as Unidades</option>' +
    nomes.map(n => `<option value="${n}">${n}</option>`).join('');
  if (nomes.includes(atual)) sel.value = atual;
}

function aplicarFiltroUnidades() {
  const unidade = document.getElementById('filtro-unidades')?.value || '';
  const filtradas = unidade
    ? cacheUnidadesGerenciar.filter(u => u.nome === unidade)
    : cacheUnidadesGerenciar;
  renderizarTabelaUnidades(filtradas);
}

function limparFormUnidade() {
  document.getElementById('form-unidade').reset();
  document.getElementById('unidade-id-edicao').value = '';
  document.getElementById('titulo-form-unidade').textContent = 'Nova Unidade';
  // Era "d-none" (classe do Bootstrap, que este app não usa) - nunca escondia
  // de verdade o botão "Cancelar edição" (ficava sempre visível, mesmo antes
  // de editar qualquer unidade). Trocado pela classe real do Tailwind.
  document.getElementById('btn-cancelar-edicao-unidade').classList.add('hidden');
}

function editarUnidade(id) {
  const u = cacheUnidadesGerenciar.find(x => String(x.id) === String(id));
  if (!u) return;

  document.getElementById('unidade-id-edicao').value = u.id;
  document.getElementById('unidade-nome').value = u.nome;
  document.getElementById('unidade-tipo').value = u.tipo || '';
  document.getElementById('unidade-endereco').value = u.endereco || '';
  document.getElementById('unidade-telefone').value = u.telefone || '';
  document.getElementById('unidade-email').value = u.email || '';

  document.getElementById('titulo-form-unidade').textContent = 'Editar Unidade';
  document.getElementById('btn-cancelar-edicao-unidade').classList.remove('hidden');
  document.getElementById('form-unidade').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function salvarUnidade() {
  const idEdicao = document.getElementById('unidade-id-edicao').value;
  const dados = {
    nome: document.getElementById('unidade-nome').value.trim(),
    tipo: document.getElementById('unidade-tipo').value || null,
    endereco: document.getElementById('unidade-endereco').value.trim() || null,
    telefone: document.getElementById('unidade-telefone').value.trim() || null,
    email: document.getElementById('unidade-email').value.trim() || null
  };

  if (!dados.nome) return Components.Toast.error('Informe o nome da Unidade');

  try {
    if (idEdicao) {
      await atualizarUnidade(idEdicao, dados);
      Components.Toast.success('Unidade atualizada!');
    } else {
      await criarUnidade(dados);
      Components.Toast.success('Unidade cadastrada!');
    }
    limparFormUnidade();
    carregarGerenciarUnidades();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

async function alternarAtivoUnidade(id, ativar) {
  try {
    await atualizarUnidade(id, { ativo: ativar });
    Components.Toast.success(ativar ? 'Unidade ativada!' : 'Unidade bloqueada!');
    carregarGerenciarUnidades();
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

// ============================================================
// SETORES (tabelas_apoio: Unidade + Setor + E-mail)
// ============================================================

function preencherDropdownsSetor() {
  const selUnidade = document.getElementById('setor-unidade');
  const selTipo = document.getElementById('setor-tipo');
  if (selUnidade) {
    const atual = selUnidade.value;
    selUnidade.innerHTML = '<option value="">Selecione...</option>' +
      cacheUnidadesGerenciar.map(u => `<option value="${u.nome}">${u.nome}</option>`).join('');
    if (atual) selUnidade.value = atual;
  }
  if (selTipo) {
    const atual = selTipo.value;
    const tipos = [...new Set(cacheUnidadesGerenciar.map(u => u.tipo).filter(Boolean))].sort();
    selTipo.innerHTML = '<option value="">Selecione...</option>' +
      tipos.map(t => `<option value="${t}">${t}</option>`).join('');
    if (atual) selTipo.value = atual;
  }
}

// Alterna qual campo aparece (Unidade específica / Tipo / nenhum, quando
// "Todas") conforme o que foi escolhido em "Aplicar em".
function alternarCampoAplicarEmSetor() {
  const modo = document.getElementById('setor-aplicar-em').value;
  document.getElementById('bloco-setor-unidade').classList.toggle('hidden', modo !== 'unidade');
  document.getElementById('bloco-setor-tipo').classList.toggle('hidden', modo !== 'tipo');
}

function limparFormSetor() {
  document.getElementById('form-setor').reset();
  document.getElementById('setor-id-edicao').value = '';
  document.getElementById('titulo-form-setor').textContent = 'Novo Setor';
  document.getElementById('btn-cancelar-edicao-setor').classList.add('hidden');
  document.getElementById('bloco-setor-aplicar-em').classList.remove('hidden');
  document.getElementById('setor-aplicar-em').value = 'unidade';
  // editarSetor() troca o <select> de Unidade por uma única opção fixa -
  // repõe a lista completa ao cancelar/limpar.
  preencherDropdownsSetor();
  alternarCampoAplicarEmSetor();
}

function editarSetor(id) {
  const s = cacheSetoresGerenciar.find(x => String(x.id) === String(id));
  if (!s) return;

  document.getElementById('setor-id-edicao').value = s.id;
  document.getElementById('setor-nome').value = s.setor;
  document.getElementById('setor-email').value = s.email || '';

  // Editando uma linha já existente, o "Aplicar em" não faz sentido (é
  // só essa Unidade+Setor específicos) - some com o seletor e mostra só
  // a Unidade (fixa, não editável) pra dar contexto.
  document.getElementById('bloco-setor-aplicar-em').classList.add('hidden');
  document.getElementById('bloco-setor-tipo').classList.add('hidden');
  document.getElementById('bloco-setor-unidade').classList.remove('hidden');
  const selUnidade = document.getElementById('setor-unidade');
  selUnidade.innerHTML = `<option value="${s.unidade}">${s.unidade}</option>`;
  selUnidade.value = s.unidade;

  document.getElementById('titulo-form-setor').textContent = 'Editar Setor';
  document.getElementById('btn-cancelar-edicao-setor').classList.remove('hidden');
  document.getElementById('form-setor').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function salvarSetor() {
  const idEdicao = document.getElementById('setor-id-edicao').value;
  const setor = document.getElementById('setor-nome').value.trim();
  const email = document.getElementById('setor-email').value.trim() || null;

  if (!setor) return Components.Toast.error('Informe o nome do Setor');

  try {
    if (idEdicao) {
      // Edição: só essa linha (Unidade não muda).
      await atualizarTabelaApoio(idEdicao, { setor, email });
      Components.Toast.success('Setor atualizado!');
    } else {
      const modo = document.getElementById('setor-aplicar-em').value;
      let unidadesAlvo = [];
      if (modo === 'unidade') {
        const unidade = document.getElementById('setor-unidade').value;
        if (!unidade) return Components.Toast.error('Selecione a Unidade');
        unidadesAlvo = [unidade];
      } else if (modo === 'tipo') {
        const tipo = document.getElementById('setor-tipo').value;
        if (!tipo) return Components.Toast.error('Selecione o Tipo');
        unidadesAlvo = cacheUnidadesGerenciar.filter(u => u.tipo === tipo).map(u => u.nome);
        if (!unidadesAlvo.length) return Components.Toast.error('Nenhuma Unidade cadastrada com esse Tipo');
      } else {
        // "todas": todas as Unidades ativas cadastradas.
        unidadesAlvo = cacheUnidadesGerenciar.filter(u => u.ativo !== false).map(u => u.nome);
        if (!unidadesAlvo.length) return Components.Toast.error('Nenhuma Unidade ativa cadastrada');
      }

      const linhas = unidadesAlvo.map(unidade => ({ unidade, setor, email }));
      if (linhas.length === 1) {
        await adicionarTabelaApoio(linhas[0]);
      } else {
        await adicionarTabelasApoioEmLote(linhas);
      }
      Components.Toast.success(
        linhas.length === 1 ? 'Setor cadastrado!' : `Setor cadastrado em ${linhas.length} unidades!`
      );
    }
    limparFormSetor();
    carregarGerenciarUnidades();
  } catch (e) {
    // Erro típico aqui: Setor repetido pra mesma Unidade (índice único
    // unidade+setor, ver supabase_setores_unidades.sql) - Postgres
    // devolve "duplicate key value" nesse caso.
    Components.Toast.error('Erro: ' + (e.message || 'não foi possível salvar'));
  }
}

async function excluirSetor(id) {
  if (!confirm('Tem certeza que deseja excluir este Setor? Isso pode afetar solicitações/cadastros que já usam essa combinação de Unidade/Setor.')) return;
  try {
    await excluirTabelaApoio(id);
    Components.Toast.success('Setor excluído!');
    carregarGerenciarUnidades();
  } catch (e) {
    Components.Toast.error('Erro ao excluir: ' + (e.message || ''));
  }
}

function renderizarTabelaSetores(lista) {
  const tbody = document.getElementById('tb-setores');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-slate-500 py-8">Nenhum setor cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(s => `
    <tr>
      <td class="table-td">${s.unidade}</td>
      <td class="table-td">${s.setor}</td>
      <td class="table-td">${s.email || ''}</td>
      <td class="table-td">
        <div class="flex gap-2">
          <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarSetor(${s.id})">Editar</button>
          <button class="btn-danger text-xs py-1.5 px-2.5" onclick="excluirSetor(${s.id})">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function aplicarFiltroSetores() {
  const termo = (document.getElementById('filtro-setores').value || '').trim().toLowerCase();
  if (!termo) return renderizarTabelaSetores(cacheSetoresGerenciar);
  const filtrados = cacheSetoresGerenciar.filter(s =>
    (s.unidade || '').toLowerCase().includes(termo) || (s.setor || '').toLowerCase().includes(termo)
  );
  renderizarTabelaSetores(filtrados);
}

// Expor globalmente
window.carregarGerenciarUnidades = carregarGerenciarUnidades;
window.preencherFiltroUnidades = preencherFiltroUnidades;
window.aplicarFiltroUnidades = aplicarFiltroUnidades;
window.salvarUnidade = salvarUnidade;
window.limparFormUnidade = limparFormUnidade;
window.editarUnidade = editarUnidade;
window.alternarAtivoUnidade = alternarAtivoUnidade;
window.alternarCampoAplicarEmSetor = alternarCampoAplicarEmSetor;
window.limparFormSetor = limparFormSetor;
window.editarSetor = editarSetor;
window.salvarSetor = salvarSetor;
window.excluirSetor = excluirSetor;
window.aplicarFiltroSetores = aplicarFiltroSetores;
