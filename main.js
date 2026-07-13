(() => {
  // tidy up any previous run (safe to paste repeatedly)
  try { window.__deflyAuthMod?.observers?.forEach(o => o.disconnect()); } catch {}
  try { window.__deflyPanelMod?.observers?.forEach(o => o.disconnect()); } catch {}
  const mod = window.__deflyPanelMod = { observers: [] };

  const makeBtn = (label, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'button';
    b.textContent = label;
    b.style.margin = '4px';
    b.addEventListener('click', e => {
      e.preventDefault();
      try { fn(); } catch (err) { console.error('[deflyPanelMod]', err); }
    });
    return b;
  };

  // three account buttons directly under the settings X
  const drawButtons = () => {
    const popup = document.getElementById('settings-popup');
    const closeBtn = popup && popup.querySelector(':scope > .close');
    if (!closeBtn || popup.querySelector('#injected-account-buttons')) return;
    const box = document.createElement('div');
    box.id = 'injected-account-buttons';
    box.style.textAlign = 'center';
    box.style.margin = '8px 0';
    box.append(
      makeBtn('My Statistics', () => window.defly.showMyStats()),
      makeBtn('My Account',    () => window.defly.showMyAccount()),
      makeBtn('Sign out',      () => window.defly.logout())
    );
    closeBtn.insertAdjacentElement('afterend', box);
  };

  // remove the left box's .inside (login box, friend list, news, how-to-play,
  // discord). The two auth blocks are stashed in a hidden holder so defly's
  // own login/logout/stats code never hits a missing element.
  // #tourney-countdown is NOT in this panel and is never touched.
  const cleanupHomepage = () => {
    const holder0 = document.getElementById('defly-auth-holder');
    const loginBox = [...document.querySelectorAll('.login-box')]
      .find(el => !(holder0 && holder0.contains(el)));
    if (!loginBox) return;
    const panel = loginBox.closest('.inside') || loginBox.parentElement;

    let holder = holder0;
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'defly-auth-holder';
      holder.style.display = 'none';
      document.body.appendChild(holder);
    }
    ['unconnected-block', 'connected-block'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentElement !== holder) holder.appendChild(el);
    });

    // safety net only: never delete the tourney button if defly ever moves it in here
    const tourney = document.getElementById('tourney-countdown');
    if (tourney && panel.contains(tourney)) {
      panel.insertAdjacentElement('beforebegin', tourney);
    }

    panel.remove();
  };

  const ensure = () => { cleanupHomepage(); drawButtons(); };

  const start = () => {
    ensure();
    // one page-wide watcher: re-strips the panel if it ever comes back and
    // re-adds the settings buttons if that popup re-renders. This also makes
    // the script work no matter how early it runs.
    const o = new MutationObserver(() => {
      const holder = document.getElementById('defly-auth-holder');
      const panelBack = [...document.querySelectorAll('.login-box')]
        .some(el => !(holder && holder.contains(el)));
      const sp = document.getElementById('settings-popup');
      const buttonsMissing = sp && !sp.querySelector('#injected-account-buttons');
      if (panelBack || buttonsMissing) ensure();
    });
    o.observe(document.documentElement, { childList: true, subtree: true });
    mod.observers.push(o);
    console.log('[deflyPanelMod] active — left panel removed; account buttons in settings.');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
