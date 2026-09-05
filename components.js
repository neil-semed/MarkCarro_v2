// ============================================================
// MARKCARRO - COMPONENTES REUTILIZÁVEIS
// ============================================================

// ==================== TOASTS ====================

const ToastContainer = {
  container: null,
  
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2';
      document.body.appendChild(this.container);
    }
  },
  
  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.init();
    
    const types = {
      success: 'toast-success',
      error: 'toast-error',
      warning: 'toast-warning',
      info: 'toast-info'
    };
    
    const icons = {
      success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/></svg>',
      error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-2 2l2-2"/></svg>',
      warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
      info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${types[type] || types.info} animate-slide-up flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-md`;
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

// ==================== MODAL ====================

const Modal = {
  currentModal: null,
  
  open(content, options = {}) {
    this.close();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content ${options.fullscreen ? 'max-w-full mx-4 my-4' : ''}" style="${options.fullscreen ? 'height: 90vh;' : 'max-height: 90vh;'}">
        ${options.title ? `
          <div class="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl z-10">
            <h3 class="text-lg font-semibold text-slate-900">${options.title}</h3>
            <button onclick="Components.Modal.close()" class="p-1 rounded-lg hover:bg-slate-100 transition-colors" aria-label="Fechar">
              <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        ` : ''}
        <div class="p-4 ${options.fullscreen ? 'h-[calc(100%-60px)] overflow-y-auto' : 'max-h-[70vh] overflow-y-auto'}">
          ${content}
        </div>
        ${options.footer ? `<div class="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-2">${options.footer}</div>` : ''}
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.currentModal = overlay;
    
    // Fecha ao clicar no overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
    
    // Fecha com ESC
    const handleEsc = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', handleEsc);
    this.currentModal._handleEsc = handleEsc;
    
    // Foco no primeiro elemento focável
    setTimeout(() => {
      const focusable = overlay.querySelector('input, select, textarea, button:not([disabled])');
      if (focusable) focusable.focus();
    }, 100);
    
    return overlay;
  },
  
  close() {
    if (this.currentModal) {
      if (this.currentModal._handleEsc) {
        document.removeEventListener('keydown', this.currentModal._handleEsc);
      }
      this.currentModal.style.animation = 'fadeIn 0.2s ease-in reverse';
      setTimeout(() => {
        if (this.currentModal && this.currentModal.parentElement) {
          this.currentModal.remove();
        }
        this.currentModal = null;
      }, 200);
    }
  }
};

// ==================== CONFIRM DIALOG ====================

const ConfirmDialog = {
  show(message, options = {}) {
    return new Promise((resolve) => {
      const { title = 'Confirmar', confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' } = options;
      
      const colors = {
        warning: 'bg-mc-laranja text-white hover:bg-mc-laranja-escuro',
        danger: 'bg-mc-vermelho text-white hover:bg-mc-vermelho-escuro',
        primary: 'bg-mc-azul text-white hover:bg-mc-azul-escuro',
        success: 'bg-mc-verde text-white hover:bg-mc-verde-escuro'
      };
      
      const modal = Modal.open(`
        <div class="text-center py-2">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-mc-laranja/10 flex items-center justify-center">
            <svg class="w-8 h-8 text-mc-laranja" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 mb-2">${options.title || 'Confirmar'}</h3>
          <p class="text-slate-600">${message}</p>
        </div>
      `, {
        title: false,
        footer: `
          <button onclick="Components.ConfirmDialog.resolve(false)" class="btn-secondary">
            ${cancelText || 'Cancelar'}
          </button>
          <button onclick="Components.ConfirmDialog.resolve(true)" class="${colors.warning || 'btn-warning'}">
            ${confirmText || 'Confirmar'}
          </button>
        `
      });
      
      // Store resolve function
      this._resolve = (value) => {
        Modal.close();
        resolve(value);
      };
    });
  },

  resolve(value) {
    if (this._resolve) {
      this._resolve(value);
      this._resolve = null;
    }
  },

  // Método de conveniência para uso direto
  async confirm(message, options = {}) {
    return this.show(message, options);
  }
};

// ==================== LOADING ====================

const Loading = {
  overlay: null,
  
  show(message = 'Carregando...') {
    if (this.overlay) return;
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm z-[100]';
    this.overlay.innerHTML = `
      <div class="bg-white rounded-xl p-6 flex flex-col items-center gap-3 shadow-xl max-w-sm">
        <div class="w-10 h-10 border-3 border-mc-azul/20 border-t-mc-azul rounded-full animate-spin"></div>
        <p class="text-slate-600 text-sm">${message}</p>
      </div>
    `;
    document.body.appendChild(this.overlay);
  },
  
  hide() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
};

// ==================== DROPDOWN ====================

const Dropdown = {
  init() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-dropdown-toggle]') && !e.target.closest('[data-dropdown-menu]')) {
        document.querySelectorAll('[data-dropdown-menu]').forEach(menu => {
          menu.classList.add('hidden');
        });
      }
    });
  },
  
  toggle(button) {
    const menuId = button.getAttribute('data-dropdown-toggle');
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    const isOpen = !menu.classList.contains('hidden');
    
    // Fecha todos os outros
    document.querySelectorAll('[data-dropdown-menu]').forEach(m => {
      if (m !== menu) m.classList.add('hidden');
    });
    
    if (isOpen) {
      menu.classList.add('hidden');
    } else {
      menu.classList.remove('hidden');
      // Posiciona
      const rect = button.getBoundingClientRect();
      menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
      menu.style.left = `${rect.left + window.scrollX}px`;
    }
  },
  
  closeAll() {
    document.querySelectorAll('[data-dropdown-menu]').forEach(m => m.classList.add('hidden'));
  }
};

// ==================== TABS ====================

const Tabs = {
  init(container) {
    const tabs = container.querySelectorAll('[data-tab-trigger]');
    const panels = container.querySelectorAll('[data-tab-panel]');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tabTrigger;
        
        tabs.forEach(t => {
          t.classList.remove('border-mc-azul', 'text-mc-azul');
          t.classList.add('border-transparent', 'text-slate-500');
        });
        tab.classList.add('border-mc-azul', 'text-mc-azul');
        tab.classList.remove('border-transparent', 'text-slate-500');
        
        panels.forEach(panel => {
          panel.classList.toggle('hidden', panel.dataset.tabPanel !== target);
        });
      });
    });
  }
};

// ==================== TABLE SORT ====================

const TableSort = {
  init(table) {
    const headers = table.querySelectorAll('th[data-sort]');
    headers.forEach(th => {
      th.style.cursor = 'pointer';
      th.classList.add('select-none');
      th.innerHTML += ' <svg class="w-4 h-4 inline-block ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m4 4l4 4m-4-4v12"/></svg>';
      
      th.addEventListener('click', () => {
        const column = th.dataset.sort;
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const isAsc = th.classList.contains('sort-asc');
        
        // Remove classes de outros headers
        table.querySelectorAll('th[data-sort]').forEach(h => {
          h.classList.remove('sort-asc', 'sort-desc');
          h.querySelector('svg').classList.add('opacity-50');
        });
        
        // Toggle
        if (isAsc) {
          th.classList.remove('sort-asc');
          th.classList.add('sort-desc');
        } else {
          th.classList.remove('sort-desc');
          th.classList.add('sort-asc');
        }
        th.querySelector('svg').classList.remove('opacity-50');
        
        // Sort
        rows.sort((a, b) => {
          const aVal = a.cells[th.cellIndex].textContent.trim();
          const bVal = b.cells[th.cellIndex].textContent.trim();
          
          // Tenta converter para número
          const aNum = parseFloat(aVal.replace(/[^\d.-]/g, ''));
          const bNum = parseFloat(bVal.replace(/[^\d.-]/g, ''));
          
          let comparison = 0;
          if (!isNaN(aNum) && !isNaN(bNum)) {
            comparison = aNum - bNum;
          } else {
            comparison = aVal.localeCompare(bVal, 'pt-BR', { numeric: true });
          }
          
          return th.classList.contains('sort-asc') ? comparison : -comparison;
        });
        
        // Reinsere
        rows.forEach(row => tbody.appendChild(row));
        
        // Atualiza ícone
        const svg = th.querySelector('svg');
        if (th.classList.contains('sort-asc')) {
          svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>';
        } else {
          svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>';
        }
      });
    });
  }
};

// ==================== SELECT SEARCH ====================

const SelectSearch = {
  init(select) {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-field';
    input.placeholder = 'Buscar...';
    input.style.display = 'none';
    wrapper.appendChild(input);
    
    const options = Array.from(select.options).map(opt => ({
      value: opt.value,
      text: opt.text,
      selected: opt.selected
    }));
    
    const dropdown = document.createElement('div');
    dropdown.className = 'absolute z-10 w-full mt-1 bg-white rounded-lg border border-slate-300 shadow-lg hidden max-h-60 overflow-y-auto';
    wrapper.appendChild(dropdown);
    
    function render() {
      const filter = input.value.toLowerCase();
      dropdown.innerHTML = options
        .filter(o => o.text.toLowerCase().includes(filter) || o.value.toLowerCase().includes(filter))
        .map(o => `<div class="px-3 py-2 hover:bg-slate-100 cursor-pointer ${o.selected ? 'bg-mc-azul/10 text-mc-azul' : ''}" data-value="${o.value}">${o.text}</div>`)
        .join('');
    }
    
    select.addEventListener('focus', () => {
      input.style.display = 'block';
      dropdown.classList.remove('hidden');
      render();
    });
    
    input.addEventListener('input', render);
    
    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('[data-value]');
      if (item) {
        select.value = item.dataset.value;
        select.dispatchEvent(new Event('change'));
        input.value = '';
        dropdown.classList.add('hidden');
        input.style.display = 'none';
      }
    });
    
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
        input.style.display = 'none';
      }
    });
    
    select.style.display = 'none';
    select.style.position = 'absolute';
    select.style.opacity = '0';
    select.style.pointerEvents = 'none';
  }
};

// ==================== TOOLTIP ====================

const Tooltip = {
  init() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (!target) return;
      
      const tooltip = document.createElement('div');
      tooltip.className = 'fixed z-50 px-2 py-1 text-xs text-white bg-slate-900 rounded shadow-lg whitespace-nowrap pointer-events-none';
      tooltip.textContent = target.dataset.tooltip;
      tooltip.id = 'tooltip-active';
      document.body.appendChild(tooltip);
      
      const rect = target.getBoundingClientRect();
      tooltip.style.left = `${rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2}px`;
      tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 8}px`;
    });
    
    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (!target) return;
      const tooltip = document.getElementById('tooltip-active');
      if (tooltip) tooltip.remove();
    });
  }
};

// ==================== EXPORT ====================

window.Components = {
  Toast: ToastContainer,
  Modal,
  ConfirmDialog,
  Loading,
  Dropdown,
  Tabs,
  TableSort,
  SelectSearch,
  Tooltip
};

// Inicializa componentes globais
document.addEventListener('DOMContentLoaded', () => {
  Dropdown.init();
  Tooltip.init();
  // Tabs e TableSort precisam ser inicializados por container
});
