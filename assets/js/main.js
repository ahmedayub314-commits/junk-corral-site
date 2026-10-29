/* Junk Era — site behaviour.
   Buildless, no dependencies. Everything here degrades safely if a config
   value is empty, so the site is publishable before the tracking IDs and the
   form key exist. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- config
     Fill these in at launch. While they are empty the site still works:
     the form falls back to mailto and no tracking calls are made. */
  var CONFIG = {
    WEB3FORMS_KEY: '97f9c9aa-1839-4623-aafd-e313391367fe',   // Web3Forms free plan, delivers to junkeratx@gmail.com (2026-10-10). Public by design.
    META_PIXEL_ID: '1874776500155822',   // Junk Era dataset (business 1718236382622575), 2026-10-10
    GOOGLE_TAG_ID: '',   // e.g. 'AW-1234567890'
    GOOGLE_LABELS: { estimate: '', booking: '', phone: '' },
    FALLBACK_EMAIL: 'junkeratx@gmail.com'   // his business Gmail
  };

  /* ------------------------------------------------------------ nav toggle */
  var toggle = document.querySelector('.navtoggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    var sync = function () {
      if (window.matchMedia('(max-width: 900px)').matches) {
        nav.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        nav.hidden = false;
      }
    };
    sync();
    window.addEventListener('resize', sync);
    toggle.addEventListener('click', function () {
      var open = nav.hidden;
      nav.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* -------------------------------------------------------------- tracking
     All of these are no-ops until the IDs above are filled in. Conversions
     fire only after a successful server response, never on click. */
  function loadPixel(id) {
    if (!id || window.fbq) return;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  }
  function loadGtag(id) {
    if (!id || window.gtag) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }
  loadPixel(CONFIG.META_PIXEL_ID);
  loadGtag(CONFIG.GOOGLE_TAG_ID);

  function track(metaEvent, googleLabel, value) {
    try {
      if (window.fbq && metaEvent) {
        window.fbq('track', metaEvent, value ? { value: value, currency: 'USD' } : undefined);
      }
      if (window.gtag && CONFIG.GOOGLE_TAG_ID && googleLabel) {
        window.gtag('event', 'conversion', {
          send_to: CONFIG.GOOGLE_TAG_ID + '/' + googleLabel,
          value: value || 0,
          currency: 'USD'
        });
      }
    } catch (e) { /* never let tracking break the page */ }
  }

  /* phone call and text taps count as contact */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="tel:"], a[href^="sms:"]') : null;
    if (a) track('Contact', CONFIG.GOOGLE_LABELS.phone, 120);
  });

  /* ------------------------------------------------------------ quote form */
  var form = document.getElementById('quote-form');
  if (form) {
    var msg = document.getElementById('form-msg');
    var submit = form.querySelector('button[type="submit"]');

    var say = function (text, ok) {
      if (!msg) return;
      msg.textContent = text;
      msg.className = 'formmsg ' + (ok ? 'formmsg--ok' : 'formmsg--err');
      msg.hidden = false;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);

      /* No form key yet: hand off to the mail client rather than silently
         dropping the lead on the floor. */
      if (!CONFIG.WEB3FORMS_KEY && !CONFIG.FALLBACK_EMAIL) {
        say('Online quotes switch on at launch. For now, please call or text us and we will get you a price.', false);
        return;
      }
      if (!CONFIG.WEB3FORMS_KEY) {
        var lines = [];
        data.forEach(function (v, k) { if (v) lines.push(k + ': ' + v); });
        window.location.href = 'mailto:' + CONFIG.FALLBACK_EMAIL +
          '?subject=' + encodeURIComponent('Quote request from the website') +
          '&body=' + encodeURIComponent(lines.join('\n'));
        say('Opening your email app so you can send this through. You can also just call us.', true);
        track('Contact', '', 0);   /* not Lead: we can't see whether they pressed send */
        return;
      }

      data.append('access_key', CONFIG.WEB3FORMS_KEY);
      data.append('subject', 'New quote request from junkeratx.com' + (data.get('city') ? ' (' + data.get('city') + ')' : ''));
      data.append('from_name', 'Junk Era website');
      if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data
      }).then(function (res) {
        return res.json().then(function (body) { return { ok: res.ok, body: body }; });
      }).then(function (r) {
        if (r.ok) {
          form.reset();
          say('Got it. We will text or call you back with a price, usually within the hour. Got photos? Text them to (817) 776-9938.', true);
          track('Lead', CONFIG.GOOGLE_LABELS.estimate, 120);
        } else {
          say((r.body && r.body.message) || 'That did not go through. Please call us instead.', false);
        }
      }).catch(function () {
        say('That did not go through — your connection may have dropped. Please call us instead.', false);
      }).finally(function () {
        if (submit) { submit.disabled = false; submit.textContent = 'Get my price'; }
      });
    });
  }

  /* current year in the footer */
  var y = document.getElementById('yr');
  if (y) y.textContent = String(new Date().getFullYear());
})();
