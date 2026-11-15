// ============================================================
// MARKCARRO - Aviso de nova versão do APK (só no app instalado)
// ============================================================
// A versão embutida no APK é a do próprio app.js?v=... deste index.html.
// A versão publicada é lida da release "apk-latest" (campo "Versão do app:"
// escrito pelo workflow que compila o APK). Se a publicada for mais nova,
// mostra uma janela com o botão de baixar; "Agora não" só esconde até a
// próxima abertura do app.
(function () {
  'use strict';
  var API = 'https://api.github.com/repos/neil-semed/MarkCarro_v2/releases/tags/apk-latest';
  var APK = 'https://github.com/neil-semed/MarkCarro_v2/releases/download/apk-latest/markcarro-debug.apk';
  var escondido = false, ultimaChecagem = 0;

  function ehApp() {
    try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; }
  }
  function versaoLocal() {
    var s = document.querySelector('script[src*="app.js?v="]');
    var m = s && /[?&]v=([0-9a-z]+)/i.exec(s.getAttribute('src'));
    return m ? m[1] : '';
  }
  function mostrar() {
    var o = document.getElementById('apk-update-overlay');
    if (o) o.style.display = 'flex';
  }
  function esconder() {
    escondido = true;
    var o = document.getElementById('apk-update-overlay');
    if (o) o.style.display = 'none';
  }
  function baixar() { window.location.href = APK; }

  function checar() {
    if (escondido || !ehApp()) return;
    var agora = Date.now();
    if (agora - ultimaChecagem < 10 * 60 * 1000) return;
    ultimaChecagem = agora;
    var local = versaoLocal();
    if (!local || typeof fetch !== 'function') return;
    fetch(API, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rel) {
        var m = rel && /Vers[aã]o do app:\s*([0-9a-z]+)/i.exec(rel.body || '');
        if (m && m[1] > local) mostrar();
      })
      .catch(function () { /* sem internet: não faz nada */ });
  }

  window.checarAtualizacaoApk = checar;
  window.baixarAtualizacaoApk = baixar;
  window.dispensarAtualizacaoApk = esconder;
  document.addEventListener('DOMContentLoaded', function () { setTimeout(checar, 2500); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checar(); });
})();
