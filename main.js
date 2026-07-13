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

  // 2) Remove the left box's .inside (login box, friend list, news,
  //    how-to-play, discord). The two auth blocks are stashed in a hidden
  //    holder so defly's own login/logout/stats code never hits a missing
  //    element. Nothing else on the page is touched — #tourney-countdown
  //    lives outside this panel and stays exactly where defly puts it.
  const cleanupHomepage = () => {
    const holder0 = document.getElementById('defly-auth-holder');
    // ignore the .login-box once it's been stashed inside the hidden holder
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

    // safety net only: if defly ever puts the tourney countdown inside this
    // panel, lift it out one step instead of deleting it with the panel.
    // (Currently it lives elsewhere, so this never runs and it's never moved.)
    const tourney = document.getElementById('tourney-countdown');
    if (tourney && panel.contains(tourney)) {
      panel.insertAdjacentElement('beforebegin', tourney);
    }

    panel.remove();
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
  const o2 = new MutationObserver(() => {
    const holder = document.getElementById('defly-auth-holder');
    const back = [...document.querySelectorAll('.login-box')]
      .some(el => !(holder && holder.contains(el)));
    if (back) sync();
  });
  o2.observe(host, { childList: true, subtree: true });
  mod.observers.push(o2);

  console.log('[deflyPanelMod] active — left panel removed; account buttons in settings; tourney countdown untouched.');
})();
