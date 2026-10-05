export {};

const menu = document.querySelector<HTMLButtonElement>('.menu-toggle');
const navigation = document.querySelector<HTMLElement>('#primary-nav');
if (menu && navigation) {
  menu.hidden = false;
  navigation.dataset.enhanced = 'true';
  const close = () => { menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('is-open'); };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  navigation.addEventListener('click', event => { if ((event.target as Element).closest('a')) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { close(); menu.focus(); }
  });
}

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(button => {
  button.hidden = false;
  let timer: ReturnType<typeof setTimeout>;
  button.addEventListener('click', async () => {
    const label = button.querySelector('span');
    const status = document.querySelector('#copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
      if (label) label.textContent = 'Copied';
      if (status) status.textContent = 'Command copied to clipboard.';
    } catch {
      if (label) label.textContent = 'Select text';
      if (status) status.textContent = 'Clipboard unavailable. Select and copy the command below.';
      const code = button.closest('.code-block')?.querySelector('code');
      if (code) { const range = document.createRange(); range.selectNodeContents(code); const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range); }
    }
    clearTimeout(timer);
    timer = setTimeout(() => { if (label) label.textContent = 'Copy'; }, 2500);
  });
});
