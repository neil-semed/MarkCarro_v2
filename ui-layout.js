// ============================================================
// MARKCARRO - Layout compacto (Admin + Solicitante)
// ============================================================
// 1) Título da tela aberta no topo, ao lado do nome do sistema.
// 2) Marcação de linha nas tabelas (só visual, uma por tabela).
// Só atua quando document.body tem a classe "ui-compacta" (ligada em
// carregarPainelPorPerfil, pages/login.js, apenas para Admin e Solicitante).
// Condutor/Motoboy nunca recebem a classe - nada muda para eles.
(function () {
  'use strict';

  // ---------- Título no topo ----------
  function telaVisivel() {
    const telas = document.querySelectorAll('#main-content > div[id^="tela-"]');
    for (const el of telas) if (!el.classList.contains('hidden')) return el;
    return null;
  }

  function atualizarTituloTopo() {
    document.querySelectorAll('h2.titulo-movido-topo').forEach(h => {
      h.classList.remove('titulo-movido-topo');
      h.parentElement?.classList.remove('pai-titulo-movido');
    });
    const body = document.body;
    if (!body.classList.contains('ui-compacta')) {
      body.classList.remove('ui-titulo-topo');
      return;
    }
    const tela = telaVisivel();
    let h2 = null;
    if (tela) {
      h2 = Array.from(tela.querySelectorAll('h2')).find(h => !h.closest('.hidden, .modal-overlay, [role="dialog"]')) || null;
    }
    const texto = h2 ? h2.textContent.replace(/\s+/g, ' ').trim() : '';
    const elAdmin = document.getElementById('header-titulo-pagina');
    const elSol = document.getElementById('header-titulo-pagina-sol');
    if (elAdmin) elAdmin.textContent = texto;
    if (elSol) elSol.textContent = texto;
    body.classList.toggle('ui-titulo-topo', !!texto);
    if (h2 && texto) {
      h2.classList.add('titulo-movido-topo');
      h2.parentElement?.classList.add('pai-titulo-movido');
    }
  }

  let agendado = false;
  function agendarTitulo() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => { agendado = false; atualizarTituloTopo(); });
  }
  window.atualizarTituloTopo = atualizarTituloTopo;

  // ---------- Marcação de linha (só visual) ----------
  const CLASSE_SEL = 'linha-selecionada';
  const marcadas = new Map(); // chave da tabela -> data-id da linha

  function chaveTbody(tbody) {
    return tbody.id || tbody.closest('[id]')?.id || '';
  }

  function aoClicar(e) {
    if (!document.body.classList.contains('ui-compacta')) return;
    const alvo = e.target;
    if (!alvo || !alvo.closest) return;
    const tr = alvo.closest('.table-container tbody tr');
    if (!tr || tr.children.length < 2) return;
    // Nunca interfere em campos, botões, links etc. da linha.
    if (alvo.closest('input, select, textarea, button, a, label, option, summary, [contenteditable="true"], [role="button"]')) return;
    // Usuário selecionando texto para copiar: não marca.
    const sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length > 0) return;

    const tbody = tr.parentElement;
    const chave = chaveTbody(tbody);
    const anterior = tbody.querySelector('tr.' + CLASSE_SEL);
    if (anterior) anterior.classList.remove(CLASSE_SEL);
    if (anterior === tr) {
      marcadas.delete(chave);
    } else {
      tr.classList.add(CLASSE_SEL);
      if (tr.dataset.id) marcadas.set(chave, tr.dataset.id); else marcadas.delete(chave);
    }
  }

  // Tabelas redesenhadas (filtro, ordenação, recarregar): reaplica a marcação
  // se a linha ainda existir.
  const tbodiesAlterados = new Set();
  let reaplicarAgendado = false;
  function reaplicarMarcacao() {
    reaplicarAgendado = false;
    tbodiesAlterados.forEach(tbody => {
      const id = marcadas.get(chaveTbody(tbody));
      if (!id) return;
      const linha = Array.from(tbody.children).find(tr => tr.dataset && tr.dataset.id === id);
      if (linha) linha.classList.add(CLASSE_SEL);
    });
    tbodiesAlterados.clear();
  }

  function iniciar() {
    document.addEventListener('click', aoClicar);

    const main = document.getElementById('main-content');
    if (main) {
      new MutationObserver(muts => {
        for (const m of muts) {
          if (m.target.parentElement === main && /^tela-/.test(m.target.id || '')) { agendarTitulo(); break; }
        }
      }).observe(main, { attributes: true, attributeFilter: ['class'], subtree: true });
    }

    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.target.tagName === 'TBODY') tbodiesAlterados.add(m.target);
      }
      if (tbodiesAlterados.size && !reaplicarAgendado) {
        reaplicarAgendado = true;
        requestAnimationFrame(reaplicarMarcacao);
      }
    }).observe(document.body, { childList: true, subtree: true });

    atualizarTituloTopo();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
