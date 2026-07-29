const debugMode = new URLSearchParams(window.location.search).get('debug') === 'true';

if (debugMode) {
  document.querySelectorAll<HTMLElement>('[data-debug-only]').forEach((element) => {
    element.hidden = false;
  });
}
