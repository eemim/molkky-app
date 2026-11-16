// Only the jsdom (component) tests have a <dialog>; the plain logic tests run in node
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
}

// jsdom has no ResizeObserver; Svelte's bind:offsetHeight needs one (sizes stay 0 in tests)
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
