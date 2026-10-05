export {};

const experience = document.querySelector<HTMLElement>('[data-experience]');
if (experience) {
  const tabs = [...experience.querySelectorAll<HTMLButtonElement>('[data-view]')];
  const panels = [...experience.querySelectorAll<HTMLElement>('[data-panel]')];
  const tablist = experience.querySelector<HTMLElement>('[data-view-tabs]');
  if (tablist) tablist.hidden = false;
  panels.forEach(panel => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${panel.dataset.panel}`);
    panel.tabIndex = 0;
  });
  const select = (name: string, focus = false) => {
    const selected = tabs.find(tab => tab.dataset.view === name);
    if (!selected) return;
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
    if (focus) selected.focus({ preventScroll: true });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab.dataset.view ?? 'room'));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      select(tabs[next].dataset.view ?? 'room', true);
    });
  });
  experience.querySelectorAll<HTMLButtonElement>('[data-open-view]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => select(button.dataset.openView ?? 'room', true));
  });
}
