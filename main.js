(() => {
  // tidy up any previous version of this script
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

  // 1) Three always-present buttons directly under the settings X
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

  // 2) Strip the left homepage panel, but stash the two auth blocks (hidden)
  //    so defly's own login/logout/stats code never hits a missing element.
  const cleanupHomepage = () => {
    const loginBox = document.querySelector('.login-box');
    if (!loginBox) return;
    const panel = loginBox.closest('.inside') || loginBox.parentElement;
    let holder = document.getElementById('defly-auth-holder');
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
    if (panel) panel.remove();
  };

  const sync = () => { cleanupHomepage(); drawButtons(); };
  sync();

  // keep the buttons present if the settings panel re-renders
  const sp = document.getElementById('settings-popup');
  if (sp) {
    const o = new MutationObserver(() => drawButtons());
    o.observe(sp, { childList: true });
    mod.observers.push(o);
  }

  // re-strip the panel if it ever comes back
  const host = document.getElementById('homepage-content') || document.body;
  const o2 = new MutationObserver(() => { if (document.querySelector('.login-box')) sync(); });
  o2.observe(host, { childList: true, subtree: true });
  mod.observers.push(o2);

  console.log('[deflyPanelMod] active — My Statistics / My Account / Sign out injected; login button & left panel removed.');
})();
