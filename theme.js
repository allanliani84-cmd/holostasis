(function () {
  'use strict';
  const root = document.documentElement;
  const key = 'holostasis-theme';
  try {
    if (localStorage.getItem(key) === 'light') root.dataset.theme = 'light';
  } catch { /* The switch also works without storage for the current page. */ }

  document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('[data-theme-toggle]');
    const update = () => {
      for (const button of buttons) button.textContent = root.dataset.theme === 'light' ? 'Dark mode' : 'Light mode';
    };
    for (const button of buttons) {
      button.addEventListener('click', () => {
        const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
        root.dataset.theme = theme;
        try { localStorage.setItem(key,theme); } catch { /* Keep the selected mode on this page. */ }
        update();
      });
    }
    update();
  });
})();
