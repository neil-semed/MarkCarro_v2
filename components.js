// ============================================================
// MARKCARRO - Componentes UI
// ============================================================

window.Components = window.Components || {};

window.Components.Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.getElementById('toast-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2';
        document.body.appendChild(this.container);
      }
    }
  },
  show(message, type = 'info', duration = 4000) {
    this.init();
    const colors = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      warning: 'bg-amber-600',
      info: 'bg-blue-600'
    };
    const icons = {
      success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/></svg>',
      error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-2 2l2-2"/></svg>',
      warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
      info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${colors[type] || colors.info} animate-slide-up flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-md`;
    toast.innerHTML = `
      ${icons[type] || icons.info}
      <span class="flex-1 text-sm">${message}</span>
      <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;
    this.container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideUp 0.3s ease-in reverse';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  },
  success(message, duration) { this.show(message, 'success', duration); },
  error(message, duration) { this.show(message, 'error', duration); },
  warning(message, duration) { this.show(message, 'warning', duration); },
  info(message, duration) { this.show(message, 'info', duration); }
};

window.Components.Modal = {
  show(content, options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content ${options.class || ''}" style="max-width: ${options.maxWidth || '32rem'}">
        ${options.title ? `<div class="p-4 border-b border-slate-200 flex items-center justify-between"><h3 class="font-semibold text-slate-900">${options.title}</h3><button onclick="this.closest('.modal-overlay').remove()" class="text-slate-500 hover:text-slate-700"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>` : ''}
        <div class="p-4">${content}</div>
        ${options.footer ? `<div class="p-4 border-t border-slate-200 flex justify-end gap-2">${options.footer}</div>` : ''}
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    return overlay;
  },
  close(overlay) { overlay?.remove(); }
};

window.Components.Loading = {
  show(container, message = 'Carregando...') {
    const el = document.createElement('div');
    el.className = 'flex items-center justify-center p-8';
    el.innerHTML = `<div class="flex flex-col items-center gap-2"><div class="w-8 h-8 border-3 border-mc-azul/20 border-t-mc-azul rounded-full animate-spin"></div><p class="text-slate-600 text-sm">${message}</p></div>`;
    container.innerHTML = '';
    container.appendChild(el);
    return el;
  }
};

function toggleSenhaVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const vaiMostrar = input.type === 'password';
  input.type = vaiMostrar ? 'text' : 'password';
  btn.innerHTML = vaiMostrar
    ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.964 9.964 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/></svg>'
    : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>';
}

window.toggleSenhaVisibility = toggleSenhaVisibility;