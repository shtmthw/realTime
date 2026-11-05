// Applies the saved theme before first paint to avoid a flash.
// Kept as a same-origin file (not inline) so the strict Content-Security-Policy can stay on.
(function () {
  try {
    var t = localStorage.getItem('theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
