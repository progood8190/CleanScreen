(function () {
  console.log('cleanscreen injected');

  // clean up any previous copy of this feature (no optional chaining — old parsers choke on it)
  try {
    if (window.__deflyAuthMod && window.__deflyAuthMod.observers) {
      window.__deflyAuthMod.observers.forEach(function (o) { o.disconnect(); });
    }
  } catch (e) {}
  try {
    if (window.__deflyPanelMod && window.__deflyPanelMod.observers) {
      window.__deflyPanelMod.observers.forEach(function (o) { o.disconnect(); });
    }
  } catch (e) {}
  const mod = (window.__deflyPanelMod = { observers: [] });

  function main() {
    const loginBox = document.querySelector('.login-box');
    const settingsPopup = document.getElementById('settings-popup');
    if (!loginBox || !settingsPopup) {
      console.warn('cleanscreen: .login-box or #settings-popup not found — run this on the defly homepage.');
      return;
    }

    function makeBtn(label, fn) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'button';
      b.textContent = label;
      b.style.margin = '4px';
      b.addEventListener('click', function (e) {
        e.preventDefault();
        try { fn(); } catch (err) { console.error('cleanscreen:', err); }
      });
      return b;
    }

    // 1) Three always-present buttons directly under the settings X
    function drawButtons() {
      const popup = document.getElementById('settings-popup');
      const closeBtn = popup && popup.querySelector(':scope > .close');
      if (!closeBtn || popup.querySelector('#injected-account-buttons')) return;

      const box = document.createElement('div');
      box.id = 'injected-account-buttons';
      box.style.textAlign = 'center';
      box.style.margin = '8px 0';
      box.appendChild(makeBtn('My Statistics', function () { window.defly.showMyStats(); }));
      box.appendChild(makeBtn('My Account',    function () { window.defly.showMyAccount(); }));
      box.appendChild(makeBtn('Sign out',      function () { window.defly.logout(); }));
      closeBtn.insertAdjacentElement('afterend', box);
    }

    // 2) Strip the left homepage panel down to JUST the tourney countdown.
    //    #tourney-countdown is MOVED (never cloned/removed) so defly's own
    //    timer keeps ticking on the same node and can flip it into the
    //    active "Join tourney" button.
    function cleanupHomepage() {
      const lb = document.querySelector('.login-box');
      if (!lb) return;
      const panel = lb.closest('.inside') || lb.parentElement;
      if (!panel) return;

      // hidden stash so defly's login/logout/stats code never hits a missing element
      let holder = document.getElementById('defly-auth-holder');
      if (!holder) {
        holder = document.createElement('div');
        holder.id = 'defly-auth-holder';
        holder.style.display = 'none';
        document.body.appendChild(holder);
      }
      ['unconnected-block', 'connected-block'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el && el.parentElement !== holder) holder.appendChild(el);
      });

      // the "?" opens #event-popup — if it lives inside the panel, re-home it
      // to <body> so it can still open (NOT into the hidden holder)
      const evPopup = document.getElementById('event-popup');
      if (evPopup && panel.contains(evPopup)) document.body.appendChild(evPopup);

      const tourney = document.getElementById('tourney-countdown');

      if (tourney && panel.contains(tourney)) {
        // keep the panel as a slim container holding ONLY the countdown
        panel.appendChild(tourney); // same node — listeners & timer intact
        Array.from(panel.children).forEach(function (child) {
          if (child.id !== 'tourney-countdown') child.remove();
        });
        panel.style.textAlign = 'center';
        tourney.style.margin = '8px 0';
      } else {
        panel.remove();
      }
    }

    function sync() {
      cleanupHomepage();
      drawButtons();
    }

    sync();

    // keep the buttons present if the settings panel re-renders
    const o1 = new MutationObserver(drawButtons);
    o1.observe(settingsPopup, { childList: true });
    mod.observers.push(o1);

    // re-strip the panel if defly ever re-renders it
    const host = document.getElementById('homepage-content') || document.body;
    const o2 = new MutationObserver(function () {
      if (document.querySelector('.login-box')) sync();
    });
    o2.observe(host, { childList: true, subtree: true });
    mod.observers.push(o2);

    console.log('✓ cleanscreen active — left panel stripped, tourney countdown kept alive, account buttons moved to settings.');
  }

  if (document.getElementById('settings-popup') || document.readyState === 'complete') {
    main();
  } else {
    window.addEventListener('load', main);
  }
})();
