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

  // 2) Strip the left homepage panel down to JUST the tourney countdown.
  //    - The auth blocks are stashed in a hidden holder so defly's own
  //      login/logout/stats code never hits a missing element.
  //    - #tourney-countdown is MOVED (never cloned, never removed), so
  //      defly's own timer keeps updating the very same element — the
  //      countdown text keeps ticking, and when the tourney opens defly
  //      flips it into the clickable "Join tourney" button as normal.
  const cleanupHomepage = () => {
    const loginBox = document.querySelector('.login-box');
    if (!loginBox) return;
    const panel = loginBox.closest('.inside') || loginBox.parentElement;
    if (!panel) return;

    // hidden stash for the auth blocks
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

    // the "?" next to the countdown opens #event-popup — if that popup
    // happens to live inside this panel, re-home it to <body> so it can
    // still be opened after the cleanup (must NOT go in the hidden holder,
    // or it could never become visible again)
    const evPopup = document.getElementById('event-popup');
    if (evPopup && panel.contains(evPopup)) document.body.appendChild(evPopup);

    const tourney = document.getElementById('tourney-countdown');

    if (tourney && panel.contains(tourney)) {
      // keep the panel as a slim container holding ONLY the countdown
      panel.appendChild(tourney); // move it to be a direct child (same node, listeners intact)
      [...panel.children].forEach(child => {
        if (child.id !== 'tourney-countdown') child.remove();
      });
      panel.style.textAlign = 'center';
      tourney.style.margin = '8px 0';
    } else {
      // no countdown in here — safe to drop the whole panel like before
      panel.style.setProperty('display', 'none', 'important');
    }
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

  // re-strip the panel if defly ever re-renders it (a fresh .login-box
  // reappearing is the signal; the fresh countdown gets rescued again)
  const host = document.getElementById('homepage-content') || document.body;
  const o2 = new MutationObserver(() => {
    if (document.querySelector('.login-box')) sync();
  });
  o2.observe(host, { childList: true, subtree: true });
  mod.observers.push(o2);

  console.log('[deflyPanelMod] active — settings buttons injected; left panel stripped; tourney countdown kept alive.');
})();
