/**
 * Universal Custom Tooltip System
 * 
 * Intercepta de forma global todos los atributos `title` y `data-tooltip`
 * en cualquier elemento del sistema para evitar el tooltip nativo del navegador
 * y renderizar un tooltip flotante personalizado con fondo morado transparente y letra negra.
 */

const TOOLTIP_ID = 'app-custom-tooltip-portal';
let tooltipEl = null;
let activeTarget = null;
let showTimeout = null;

function ensureTooltipElement() {
  if (tooltipEl && document.body.contains(tooltipEl)) return tooltipEl;

  tooltipEl = document.createElement('div');
  tooltipEl.id = TOOLTIP_ID;
  tooltipEl.className = 'custom-global-tooltip';
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tooltipEl);

  return tooltipEl;
}

function getTooltipInfo(target) {
  if (!target || !(target instanceof HTMLElement)) return null;

  const el = target.closest('[title], [data-tooltip], [data-custom-tooltip]');
  if (!el) return null;

  // Si el elemento es una opción del menú lateral izquierdo y el menú NO está comprimido, ocultar tooltip
  const isSidebarNavItem = el.closest('.sidebar-nav .nav-item, #sidebar .nav-item, .sidebar .nav-item');
  if (isSidebarNavItem) {
    const isSidebarCollapsed = document.querySelector('.app.sidebar-collapsed, .sidebar-collapsed, aside.sidebar.collapsed, #sidebar.collapsed');
    if (!isSidebarCollapsed) {
      return null;
    }
  }

  // Si tiene un title nativo, lo guardamos en data-custom-tooltip y quitamos title para silenciar el del SO
  if (el.hasAttribute('title') && el.getAttribute('title')) {
    const rawTitle = el.getAttribute('title');
    el.setAttribute('data-custom-tooltip', rawTitle);
    el.removeAttribute('title');
  }

  const text = el.getAttribute('data-custom-tooltip') || el.getAttribute('data-tooltip');
  if (!text || !text.trim()) return null;

  return { element: el, text: text.trim() };
}

function positionTooltip(targetEl) {
  if (!tooltipEl || !targetEl || !document.body.contains(targetEl)) return;

  const rect = targetEl.getBoundingClientRect();
  const tooltipRect = tooltipEl.getBoundingClientRect();

  const gap = 8;
  const paddingScreen = 10;

  // Posición vertical: arriba por defecto
  let top = rect.top - tooltipRect.height - gap;
  let placement = 'top';

  // Si no cabe arriba, mostrarlo abajo
  if (top < paddingScreen) {
    top = rect.bottom + gap;
    placement = 'bottom';
  }

  // Posición horizontal: centrado
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

  // Evitar salirse de la pantalla
  if (left < paddingScreen) {
    left = paddingScreen;
  } else if (left + tooltipRect.width > window.innerWidth - paddingScreen) {
    left = window.innerWidth - paddingScreen - tooltipRect.width;
  }

  tooltipEl.style.top = `${Math.round(top)}px`;
  tooltipEl.style.left = `${Math.round(left)}px`;
  tooltipEl.setAttribute('data-placement', placement);
}

export function showCustomTooltip(target) {
  const data = getTooltipInfo(target);
  if (!data) {
    hideCustomTooltip();
    return;
  }

  const { element, text } = data;
  activeTarget = element;

  ensureTooltipElement();
  tooltipEl.textContent = text;
  tooltipEl.classList.remove('is-visible');

  // Calcular posición inicial
  positionTooltip(element);

  // Animar entrada suave
  requestAnimationFrame(() => {
    positionTooltip(element);
    tooltipEl.classList.add('is-visible');
    tooltipEl.setAttribute('aria-hidden', 'false');
  });
}

export function hideCustomTooltip() {
  clearTimeout(showTimeout);
  if (tooltipEl) {
    tooltipEl.classList.remove('is-visible');
    tooltipEl.setAttribute('aria-hidden', 'true');
  }
  activeTarget = null;
}

function initGlobalTooltips() {
  // Manejo de hover con mouse o puntero
  document.addEventListener('pointerover', (e) => {
    const data = getTooltipInfo(e.target);
    if (!data) return;

    clearTimeout(showTimeout);
    showTimeout = setTimeout(() => {
      showCustomTooltip(e.target);
    }, 100);
  }, true);

  document.addEventListener('pointerout', (e) => {
    const data = getTooltipInfo(e.target);
    if (data && (data.element === activeTarget || !e.relatedTarget)) {
      hideCustomTooltip();
    }
  }, true);

  // Ocultar de inmediato al hacer click o presionar una tecla
  document.addEventListener('pointerdown', () => {
    hideCustomTooltip();
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideCustomTooltip();
  }, true);

  // Soporte de accesibilidad por foco de teclado
  document.addEventListener('focusin', (e) => {
    const data = getTooltipInfo(e.target);
    if (data) {
      clearTimeout(showTimeout);
      showCustomTooltip(e.target);
    }
  }, true);

  document.addEventListener('focusout', () => {
    hideCustomTooltip();
  }, true);

  // Reposicionar al hacer scroll o resize
  window.addEventListener('scroll', () => {
    if (activeTarget) positionTooltip(activeTarget);
  }, { capture: true, passive: true });

  window.addEventListener('resize', () => {
    if (activeTarget) positionTooltip(activeTarget);
  }, { passive: true });
}

// Inicialización automática
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalTooltips);
  } else {
    initGlobalTooltips();
  }
}
