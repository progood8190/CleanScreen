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
  //    #tourney-countdown is MOVED (never cloned/removed) so defly's own
  //    timer keeps ticking on the same node and can flip it into the
  //    active "Join tourney" button.
  const cleanupHomepage = () => {
    const loginBox = document.querySelector('.login-box');
    if (!loginBox) return;
    const panel = loginBox.closest('.inside') || loginBox.parentElement;
    if (!panel) return;

    // hidden stash so defly's login/logout/stats code never hits a missing element
    let holder = document.getElementById('defly-auth-holder');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'defly-auth-holder';
      holder.style.display = 'none';
      (document.body || document.documentElement).appendChild(holder);
    }
    ['unconnected-block', 'connected-block'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentElement !== holder) holder.appendChild(el);
    });

    // the "?" opens #event-popup — if it lives inside the panel, re-home it
    // to <body> so it can still open (NOT into the hidden holder)
    const evPopup = document.getElementById('event-popup');
    if (evPopup && panel.contains(evPopup)) {
      (document.body || document.documentElement).appendChild(evPopup);
    }

    const tourney = document.getElementById('tourney-countdown');

    if (tourney && panel.contains(tourney)) {
      // keep the panel as a slim container holding ONLY the countdown
      panel.appendChild(tourney); // same node — listeners & timer intact
      [...panel.children].forEach(child => {
        if (child.id !== 'tourney-countdown') child.remove();
      });
      panel.style.textAlign = 'center';
      tourney.style.margin = '8px 0';
    } else {
      panel.remove();
    }
  };

  const sync = () => { cleanupHomepage(); drawButtons(); };

  // ---- main init: only ever runs once, and only when the DOM is usable ----
  let started = false;
  const init = () => {
    if (started) return;
    started = true;

    sync();

    // keep the buttons present if the settings panel re-renders
    const sp = document.getElementById('settings-popup');
    if (sp) {
      const o = new MutationObserver(() => drawButtons());
      o.observe(sp, { childList: true });
      mod.observers.push(o);
    }

    // re-strip the panel if defly ever re-renders it
    const host = document.getElementById('homepage-content')
              || document.body
              || document.documentElement; // never null -> observe can't throw
    const o2 = new MutationObserver(() => {
      if (document.querySelector('.login-box')) sync();
    });
    o2.observe(host, { childList: true, subtree: true });
    mod.observers.push(o2);

    console.log('[deflyPanelMod] active — settings buttons injected; left panel stripped; tourney countdown kept alive.');
  };

  const start = () => {
    try { init(); } catch (err) {
      // never let this feature take down the rest of the account bundle
      // (an uncaught error here can trigger the powerup loader's revert())
      console.error('[deflyPanelMod] init failed:', err);
    }
  };

  // ---- boot logic ----
  // The deflypowerup loader injects account features DURING page startup,
  // often before .login-box / #settings-popup (or even <body>) exist.
  // In the console everything already exists. So: wait for the elements.
  const ready = () =>
    document.getElementById('settings-popup') && document.querySelector('.login-box');

  if (ready() || document.readyState === 'complete') {
    // console paste, late injection, or elements already stripped by an
    // older version of this mod — init handles missing pieces gracefully
    start();
  } else {
    // documentElement exists even at document_start, so this can't throw
    const boot = new MutationObserver(() => {
      if (!ready()) return;
      boot.disconnect();
      start();
    });
    boot.observe(document.documentElement, { childList: true, subtree: true });
    mod.observers.push(boot);

    // safety net: by full load the homepage HTML definitely parsed
    window.addEventListener('load', () => {
      boot.disconnect();
      start();
    }, { once: true });
  }
})();
