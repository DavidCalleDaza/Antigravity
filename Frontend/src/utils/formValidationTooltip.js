// Reemplaza el globo de validación nativo del navegador ("Rellena este campo")
// por un toast propio, centrado en la parte superior de la pantalla (justo
// debajo del header), con tema claro/oscuro. Funciona capturando el evento
// `invalid` a nivel de documento (los eventos `invalid` no burbujean, pero
// sí se capturan).

const TOAST_ID = 'field-validation-toast';
const AUTO_HIDE_MS = 6000;

let toastEl = null;
let messageEl = null;
let activeField = null;
let hideTimeoutId = null;

function buildMessage(field) {
  const custom = field.dataset.errorMessage;
  if (custom) return custom;

  const validity = field.validity;

  if (validity.valueMissing) return 'Este campo es obligatorio.';
  if (validity.typeMismatch) {
    if (field.type === 'email') return 'Ingresa un correo electrónico válido.';
    if (field.type === 'url') return 'Ingresa una URL válida.';
    return 'El formato ingresado no es válido.';
  }
  if (validity.patternMismatch) return 'El formato ingresado no es válido.';
  if (validity.tooShort) return `Debe tener al menos ${field.minLength} caracteres.`;
  if (validity.tooLong) return `No puede superar ${field.maxLength} caracteres.`;
  if (validity.rangeUnderflow) return `El valor mínimo permitido es ${field.min}.`;
  if (validity.rangeOverflow) return `El valor máximo permitido es ${field.max}.`;
  if (validity.stepMismatch) return 'El valor ingresado no es válido.';
  if (validity.badInput) return 'El valor ingresado no es válido.';
  return 'Este campo no es válido.';
}

function ensureToast() {
  if (toastEl) return toastEl;

  toastEl = document.createElement('div');
  toastEl.id = TOAST_ID;
  toastEl.className = 'field-validation-toast';
  toastEl.setAttribute('role', 'alert');

  const icon = document.createElement('span');
  icon.className = 'field-validation-toast-icon';
  icon.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 9v4M12 16.5h.01M10.29 3.86l-8.18 14.18A1.5 1.5 0 0 0 3.5 20.4h17a1.5 1.5 0 0 0 1.39-2.36L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  messageEl = document.createElement('span');
  messageEl.className = 'field-validation-toast-message';

  toastEl.appendChild(icon);
  toastEl.appendChild(messageEl);
  document.body.appendChild(toastEl);

  return toastEl;
}

function showToast(field) {
  ensureToast();
  messageEl.textContent = buildMessage(field);

  // Fuerza un reflow para que, si el toast ya estaba visible por un envío
  // anterior, la animación de reingreso se vea igual que la primera vez.
  toastEl.classList.remove('is-visible');
  void toastEl.offsetWidth;
  toastEl.classList.add('is-visible');
  activeField = field;

  clearTimeout(hideTimeoutId);
  hideTimeoutId = setTimeout(hideToast, AUTO_HIDE_MS);
}

function hideToast() {
  if (!toastEl) return;
  toastEl.classList.remove('is-visible');
  clearTimeout(hideTimeoutId);

  if (activeField) {
    activeField.removeEventListener('input', handleFieldFixed);
    activeField.removeEventListener('blur', handleFieldBlur);
  }
  activeField = null;
}

function handleFieldFixed(event) {
  if (event.target === activeField && event.target.checkValidity()) {
    hideToast();
  }
}

function handleFieldBlur(event) {
  if (event.target === activeField) {
    hideToast();
  }
}

// El navegador dispara un evento `invalid` por CADA campo inválido, de forma
// síncrona, en el mismo tick. Solo mostramos el toast para el PRIMER campo
// (igual que el comportamiento nativo), usando un pequeño "lote" por tick.
let batchScheduled = false;
let firstInvalidShown = false;

function handleInvalid(event) {
  const field = event.target;
  if (!(field instanceof HTMLElement)) return;

  // Evita que el navegador muestre su propio globo de validación
  event.preventDefault();

  if (!batchScheduled) {
    batchScheduled = true;
    firstInvalidShown = false;
    setTimeout(() => {
      batchScheduled = false;
    }, 0);
  }

  if (firstInvalidShown) return;
  firstInvalidShown = true;

  field.focus();
  showToast(field);

  field.addEventListener('input', handleFieldFixed);
  field.addEventListener('blur', handleFieldBlur);
}

document.addEventListener('invalid', handleInvalid, true);
