/* Native shell: non altera il motore territoriale, gestisce solo il contenitore mobile. */
(() => {
  const capacitor = window.Capacitor;
  if (!capacitor || typeof capacitor.isNativePlatform !== 'function' || !capacitor.isNativePlatform()) return;
  document.documentElement.classList.add('capacitor-native');
  document.body?.classList.add('capacitor-native');
  const markBody = () => document.body.classList.add('capacitor-native');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markBody, { once: true });
  else markBody();
  document.documentElement.dataset.nativePlatform = capacitor.getPlatform?.() || 'native';
})();
