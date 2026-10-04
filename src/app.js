(function () {
  'use strict';
  var F = window.EtsyFees;
  var $ = function (id) { return document.getElementById(id); };

  var DEFAULTS = {
    physical: { price: '25', shipping: '5', cogs: '6', postage: '4', target: '10' },
    digital: { price: '10', shipping: '0', cogs: '0', postage: '0', target: '8' }
  };
  var vals = { physical: Object.assign({}, DEFAULTS.physical), digital: Object.assign({}, DEFAULTS.digital) };
  var state = { mode: 'fees', type: 'physical', country: 'us' };
  var ids = ['price', 'shipping', 'cogs', 'postage', 'target'];

  function num(v) {
    var n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) && n >= 0 ? n : 0;
  }
  function fmt(amount, currency) {
    var loc = currency === 'INR' ? 'en-IN' : 'en-US';
    try {
      return new Intl.NumberFormat(loc, { style: 'currency', currency: currency }).format(amount);
    } catch (e) { return amount.toFixed(2) + ' ' + currency; }
  }
  function symbol(currency) {
    try {
      var p = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0);
      for (var i = 0; i < p.length; i++) if (p[i].type === 'currency') return p[i].value;
    } catch (e) {}
    return currency;
  }
  function pct(x, d) { return (x * 100).toFixed(d == null ? 1 : d).replace(/\.0$/, '') + '%'; }

  function readInputs() {
    var out = {};
    ids.forEach(function (k) { out[k] = num($(k).value); vals[state.type][k] = $(k).value; });
    var digital = state.type === 'digital';
    var c = F.byId(state.country);
    return {
      country: state.country,
      price: out.price,
      shipping: digital ? 0 : out.shipping,
      cogs: out.cogs,
      postage: digital ? 0 : out.postage,
      target: out.target,
      intl: $('intl').checked && c.ppRateIntl != null,
      ads: +$('ads').value,
      conversion: $('conv').checked
    };
  }

  function row(label, value, cls, small) {
    return '<div class="row ' + (cls || '') + '"><div class="l">' + label +
      (small ? '<small>' + small + '</small>' : '') + '</div><div class="v">' + value + '</div></div>';
  }

  function receiptHTML(r, currency, inp) {
    var f = function (x) { return fmt(x, currency); };
    var minus = function (x) { return '−' + f(x); };
    var digital = state.type === 'digital';
    var h = '';
    h += '<h2>' + (digital ? 'One digital download sold' : 'One order sold') + '</h2>';
    h += '<p class="sub">' + r.country.name + ' · amounts in ' + currency + '</p>';
    h += row('Buyer pays' + (digital ? '' : ' (item + shipping)'), f(r.gross), 'total');
    h += '<hr class="rule">';
    h += row('Listing fee', minus(r.listing), 'fee', '$0.20, converted' + (currency === 'USD' ? '' : ' (approx.)'));
    h += row('Transaction fee', minus(r.transaction), 'fee', '6.5% of ' + (digital ? 'price' : 'item + shipping'));
    h += row('Payment processing', minus(r.processing), 'fee',
      pct(r.ppPct, 1) + ' + ' + fmt(r.ppFlat, currency) + (inp.intl ? ' (international order)' : ''));
    if (r.regulatory > 0) h += row('Regulatory fee', minus(r.regulatory), 'fee', pct(r.country.regRate / 100, 2) + ' in ' + r.country.name);
    if (r.ads > 0) h += row('Offsite Ads fee', minus(r.ads), 'fee', inp.ads + '% on ad-driven orders, capped at $100');
    if (r.conversion > 0) h += row('Currency conversion', minus(r.conversion), 'fee', '2.5%');
    h += '<hr class="rule">';
    h += row('Etsy keeps', f(r.fees), 'total fee', pct(r.feePct, 1) + ' of what the buyer pays');
    if (r.cogs > 0) h += row('Cost to make', minus(r.cogs), '');
    if (r.postage > 0) h += row('Postage you pay', minus(r.postage), '');
    h += '<hr class="rule">';
    h += row('You keep', f(r.net), 'keep' + (r.net < 0 ? ' neg' : ''));
    h += '<div class="stat">Profit margin: ' + pct(r.margin, 1) + ' of what the buyer pays</div>';

    var g = Math.max(r.gross, 0.0001);
    var wFee = Math.min(100, (r.fees / g) * 100);
    var wCost = Math.min(100 - wFee, ((r.cogs + r.postage) / g) * 100);
    var wKeep = Math.max(0, 100 - wFee - wCost);
    h += '<div class="bar" role="img" aria-label="Split of the sale: Etsy fees ' + wFee.toFixed(0) + '%, your costs ' +
      wCost.toFixed(0) + '%, profit ' + wKeep.toFixed(0) + '%">' +
      '<i class="b-fee" style="width:' + wFee + '%"></i><i class="b-cost" style="width:' + wCost + '%"></i><i class="b-keep" style="width:' + wKeep + '%"></i></div>';
    h += '<div class="legend"><span style="--c:var(--fee)">Etsy fees</span><span style="--c:var(--cost)">Your costs</span><span style="--c:var(--money)">Profit</span></div>';
    return h;
  }

  function render() {
    var inp = readInputs();
    var c = F.byId(state.country);
    var cur = c.currency;
    var digital = state.type === 'digital';

    // static UI state
    document.querySelectorAll('.cur').forEach(function (el) { el.textContent = symbol(cur); });
    $('f-shipping').hidden = digital;
    $('f-postage').hidden = digital;
    $('c-intl').hidden = c.ppRateIntl == null;
    $('f-target').hidden = state.mode !== 'price';
    $('f-price').hidden = state.mode === 'price';
    $('shipping-label').textContent = state.mode === 'price' ? 'Shipping you charge the buyer' : 'Shipping you charge the buyer';
    $('cogs-label').textContent = digital ? 'Your cost per sale (optional)' : 'Cost to make one';
    $('cogs-hint').textContent = digital ? 'Software, fonts, stock files you pay for per sale. Leave 0 if none.' : 'Materials, packaging, print costs.';

    var html = '';
    var result;
    if (state.mode === 'price') {
      var rv = F.reverse(inp);
      if (!rv.ok || rv.price < 0) {
        $('receipt').innerHTML = '<h2>Check your numbers</h2><p class="sub">With these costs and fees, no positive price reaches that profit. Lower the target or the costs.</p>';
        return;
      }
      var withPrice = Object.assign({}, inp, { price: rv.price });
      result = F.calc(withPrice);
      html += '<div class="rev-out"><div class="sub">To keep ' + fmt(inp.target, cur) + ' profit, charge at least</div>' +
        '<div class="big">' + fmt(Math.ceil(rv.price * 100) / 100, cur) + '</div>' +
        '<div class="sub">for the ' + (digital ? 'download.' : 'item, plus ' + fmt(inp.shipping, cur) + ' shipping.') + '</div></div><hr class="rule">';
      html += receiptHTML(result, cur, withPrice);
    } else {
      result = F.calc(inp);
      html = receiptHTML(result, cur, inp);
    }
    $('receipt').innerHTML = html;
    $('sticky-val').textContent = fmt(result.net, cur);
    $('sticky-sub').textContent = pct(result.feePct, 1) + ' to Etsy';
  }

  function loadType(type) {
    state.type = type;
    ids.forEach(function (k) { $(k).value = vals[type][k]; });
    $('type-physical').setAttribute('aria-pressed', String(type === 'physical'));
    $('type-digital').setAttribute('aria-pressed', String(type === 'digital'));
  }
  function setMode(mode) {
    state.mode = mode;
    $('mode-fees').setAttribute('aria-pressed', String(mode === 'fees'));
    $('mode-price').setAttribute('aria-pressed', String(mode === 'price'));
  }

  function setCountry(id) {
    state.country = id;
    $('country').value = id;
    var c = F.byId(id);
    if (c.ppRateIntl == null) $('intl').checked = false;
  }

  // wiring
  $('type-physical').addEventListener('click', function () { loadType('physical'); render(); });
  $('type-digital').addEventListener('click', function () { loadType('digital'); render(); });
  $('mode-fees').addEventListener('click', function () { setMode('fees'); render(); });
  $('mode-price').addEventListener('click', function () { setMode('price'); render(); });
  $('country').addEventListener('change', function () { setCountry(this.value); render(); });
  ids.forEach(function (k) { $(k).addEventListener('input', render); });
  ['ads', 'intl', 'conv'].forEach(function (k) { $(k).addEventListener('change', render); });

  function applyPreset(p) {
    var parts = String(p).replace('#', '').split(':');
    parts.forEach(function (x) {
      if (x === 'digital') loadType('digital');
      else if (x === 'physical') loadType('physical');
      else if (x === 'price') setMode('price');
      else if (x === 'fees') setMode('fees');
      else if (x === 'uk') setCountry('gb');
      else if (F.countries.some(function (c) { return c.id === x; })) setCountry(x);
    });
    render();
  }
  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      applyPreset(b.getAttribute('data-preset'));
      $('calculator').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      $('price').focus({ preventScroll: true });
    });
  });

  // lead magnet form
  var form = $('lead-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('lead-email').value.trim();
      var msg = $('lead-msg');
      msg.className = 'msg';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        msg.className = 'msg err';
        msg.textContent = 'Enter a valid email address, for example name@gmail.com.';
        return;
      }
      var btn = $('lead-btn');
      btn.disabled = true;
      msg.textContent = 'Sending…';
      var show = function () {
        form.hidden = true;
        $('lead-done').hidden = false;
        $('lead-download').focus();
      };
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, company: $('lead-company').value, source: location.hash || 'home' })
      }).then(function () { show(); }).catch(function () { show(); });
    });
  }

  // small screens: keep the result visible while the receipt itself is off screen
  var sticky = $('sticky');
  if ('IntersectionObserver' in window && sticky) {
    var seen = true;
    new IntersectionObserver(function (entries) {
      seen = entries[0].isIntersecting;
      sticky.hidden = seen;
    }, { threshold: 0.15 }).observe($('receipt'));
  }

  // initial state from URL hash, e.g. /#uk or /#gb:digital
  if (location.hash && location.hash.length > 1 && location.hash !== '#calculator') {
    var h = location.hash.slice(1);
    if (h.indexOf(':') > -1 || h === 'digital' || h === 'uk' || F.countries.some(function (c) { return c.id === h; })) applyPreset(h);
  }
  loadType(state.type);
  setCountry(state.country);
  render();
})();
