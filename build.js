/* Builds ./dist from ./src. Run: node build.js
 * SITE_URL is taken from the SITE_URL env var, or from Vercel's production URL, or localhost. */
const fs = require('fs');
const path = require('path');
const F = require('./src/fees.js');

const GUMROAD_URL = 'https://sharipov7.gumroad.com/l/gbfaof';
const root = __dirname;
const dist = path.join(root, 'dist');

const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : '') ||
  'http://localhost:3000'
).replace(/\/+$/, '');
const TODAY = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function money(x, cur) {
  const loc = cur === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(loc, { style: 'currency', currency: cur }).format(x);
}
const pct = (x, d = 1) => (x * 100).toFixed(d).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1') + '%';

/* ---------- worked-example table, computed with the same code as the calculator ---------- */
function exTable(caption, inp) {
  const r = F.calc(inp);
  const cur = r.country.currency;
  const m = (x) => money(x, cur);
  let rows = '';
  const add = (l, v, cls) => { rows += `<tr${cls ? ` class="${cls}"` : ''}><td>${l}</td><td class="n">${v}</td></tr>`; };
  add(inp.shipping ? 'Buyer pays (item + shipping)' : 'Buyer pays', m(r.gross));
  add('Listing fee', '−' + m(r.listing));
  add('Transaction fee (6.5%)', '−' + m(r.transaction));
  add(`Payment processing (${pct(r.ppPct, 1)} + ${money(r.ppFlat, cur)})`, '−' + m(r.processing));
  if (r.regulatory > 0) add(`Regulatory operating fee (${pct(r.country.regRate / 100, 2)})`, '−' + m(r.regulatory));
  if (r.ads > 0) add('Offsite Ads fee', '−' + m(r.ads));
  add(`Total Etsy fees (${pct(r.feePct, 1)} of the sale)`, m(r.fees), 'sum');
  add('Left after Etsy fees', m(r.gross - r.fees), 'keep');
  return `<div class="tbl"><table><caption>${caption}</caption><tbody>${rows}</tbody></table></div>`;
}

const usOrder = F.calc({ country: 'us', price: 25, shipping: 5 });
const usOrderAds = F.calc({ country: 'us', price: 25, shipping: 5, ads: 15 });
const dig10 = F.calc({ country: 'us', price: 10, shipping: 0 });

/* cheap-download table */
function lowPriceTable() {
  let rows = '';
  [2, 5, 10, 20, 50].forEach((p) => {
    const r = F.calc({ country: 'us', price: p, shipping: 0 });
    rows += `<tr><td>${money(p, 'USD')}</td><td class="n">${money(r.fees, 'USD')}</td><td class="n">${money(r.gross - r.fees, 'USD')}</td><td class="n">${pct(r.feePct, 0)}</td></tr>`;
  });
  return `<div class="tbl"><table><caption>What Etsy keeps from a digital download (US seller, no ads)</caption>
<thead><tr><th>Price</th><th class="n">Etsy fees</th><th class="n">You keep before costs</th><th class="n">Share to Etsy</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* by-country table */
function countryTable() {
  let rows = '';
  F.countries.forEach((c) => {
    const flat = money(c.ppFlat, c.currency);
    const proc = c.ppRateIntl != null
      ? `${c.ppRate}% + ${flat} (${c.ppRateIntl}% + ${flat} international)`
      : `${c.ppRate}% + ${flat}`;
    const reg = c.regRate > 0 ? c.regRate.toFixed(2) + '%' : 'none';
    const totalPct = (6.5 + c.ppRate + c.regRate).toFixed(2);
    rows += `<tr><td>${esc(c.name)}</td><td>${proc}</td><td class="n">${reg}</td><td class="n">${totalPct}%</td></tr>`;
  });
  return `<div class="tbl"><table><caption>Etsy fees by country of bank account, 2026</caption>
<thead><tr><th>Country</th><th>Payment processing</th><th class="n">Regulatory fee</th><th class="n">Percentage fees before ads</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* price-for-profit example */
const rvBase = { country: 'us', shipping: 5, cogs: 6, postage: 4, target: 10 };
const rv0 = F.reverse(rvBase);
const rv15 = F.reverse(Object.assign({}, rvBase, { ads: 15 }));

const ukInp = { country: 'gb', price: 20, shipping: 3 };
const caInp = { country: 'ca', price: 30, shipping: 8 };
const auInp = { country: 'au', price: 35, shipping: 7 };
const inInp = { country: 'in', price: 1500, shipping: 150 };

const ARTICLE = `
<h2 id="how">How much does Etsy take from a sale?</h2>
<p>Four fees can apply to an Etsy sale. Three of them are charged on every order, and the fourth only when a sale comes from an Etsy ad.</p>
<ul>
<li><strong>Listing fee:</strong> $0.20 each time you create or renew a listing. A listing with several units renews for another $0.20 each time one sells, so the calculator counts $0.20 per sale.</li>
<li><strong>Transaction fee:</strong> 6.5% of the item price plus shipping and gift wrapping.</li>
<li><strong>Payment processing:</strong> a percentage plus a fixed amount, set by the country of your bank account. For a US account it is 3% + $0.25 on the full order total.</li>
<li><strong>Offsite Ads fee:</strong> 12% or 15% when a buyer comes through an Etsy ad on another website and orders from you. More on that <a href="#offsite-ads">below</a>.</li>
</ul>
<p>On a $30 order (a $25 item with $5 shipping) a US seller pays $${usOrder.fees.toFixed(2)} in fees, which is ${pct(usOrder.feePct, 0)} of the sale. The two fixed amounts, $0.20 and $0.25, matter more as prices drop, so cheap items lose a bigger share.</p>
${exTable('Example: US seller, $25 item with $5 shipping, no ads', { country: 'us', price: 25, shipping: 5 })}

<h2 id="digital-products">Etsy fee calculator for digital products</h2>
<p>A digital download pays the same Etsy fees as a physical item, but there is no shipping, so the percentage fees apply to the price alone. There is also no postage and usually no materials cost, which is why digital products can keep a high margin.</p>
<p class="use"><button type="button" data-preset="digital">Calculate a digital product</button></p>
${exTable('Example: US seller, $10 digital download, no ads', { country: 'us', price: 10, shipping: 0 })}
<p>You keep ${money(dig10.gross - dig10.fees, 'USD')} of the $10 before your own costs. Price is where digital sellers get caught: the $0.20 listing fee and $0.25 processing fee are fixed, so they take a large bite out of low-priced files.</p>
${lowPriceTable()}
<div class="callout"><p>Below about $4, Etsy's fees take more than a fifth of the price, and a $2 file loses 32%. If you sell cheap files, bundle them or raise the price rather than counting on volume.</p></div>
<p>In some countries Etsy has to collect and remit VAT on digital items. Etsy shows the buyer the higher price and handles the tax itself when the sale goes through Etsy Payments, so it is not part of the fees above.</p>

<h2 id="offsite-ads">Etsy Offsite Ads fees</h2>
<p>Etsy advertises listings on other websites, such as social networks and search engines. You pay the Offsite Ads fee only when a buyer clicks one of those ads and then orders from your shop within 30 days. The fee works like this:</p>
<ul>
<li><strong>15%</strong> if your shop made less than $10,000 in sales over the last 365 days. While you are under that line you can opt out of Offsite Ads.</li>
<li><strong>12%</strong> once your shop reaches $10,000 in 365 days. At that point participation becomes mandatory, and the 12% rate applies for the lifetime of the shop, even if sales later drop.</li>
<li>The fee is a percentage of the whole order (item, shipping and gift wrapping) and is <strong>capped at $100</strong> per order.</li>
</ul>
<p>The same $30 order from the example above costs $${usOrderAds.fees.toFixed(2)} in fees with a 15% Offsite Ads charge, which is ${pct(usOrderAds.feePct, 0)} of the sale. Use the "Did the sale come from an Etsy Offsite Ad?" menu in the calculator to test your own prices.</p>

<h2 id="by-country">Etsy fees by country</h2>
<p>The listing fee is $0.20 everywhere, converted into your currency, and the transaction fee is 6.5% everywhere. What changes is payment processing, which depends on the country of your bank account, and a small regulatory operating fee in some countries. Etsy adds 2.5% if you list in a currency other than your payment account currency.</p>
${countryTable()}
<p>Etsy quotes the listing fee and the Offsite Ads cap in US dollars. Where your currency is different, the calculator converts them at an approximate rate, so those two figures can be off by a few cents.</p>

<h3 id="etsy-fees-uk">Etsy fee calculator for UK sellers</h3>
<p>UK payment processing is 4% + £0.20, higher than the 3% + $0.25 that US sellers pay. On top of the 6.5% transaction fee there is a 0.48% regulatory operating fee. Etsy may also add VAT to your seller fees depending on your business status, which the calculator does not include.</p>
<p class="use"><button type="button" data-preset="uk">Use UK rates</button></p>
${exTable('Example: UK seller, £20 item with £3 shipping, no ads', ukInp)}

<h3 id="etsy-fees-canada">Etsy fee calculator for Canadian sellers</h3>
<p>Canadian sellers pay 3% + CA$0.25 on domestic orders and on orders from the US, and 4% + CA$0.25 on other international orders. A 0.50% regulatory operating fee applies as well. Tick "International order" in the calculator to switch to the higher rate.</p>
<p class="use"><button type="button" data-preset="ca">Use Canada rates</button></p>
${exTable('Example: Canadian seller, CA$30 item with CA$8 shipping, domestic order, no ads', caInp)}

<h3 id="etsy-fees-australia">Etsy fee calculator for Australian sellers</h3>
<p>Australian sellers pay 3% + A$0.25 on domestic orders and 4% + A$0.25 on international orders. Etsy lists no regulatory operating fee for Australia.</p>
<p class="use"><button type="button" data-preset="au">Use Australia rates</button></p>
${exTable('Example: Australian seller, A$35 item with A$7 shipping, domestic order, no ads', auInp)}

<h3 id="etsy-fees-india">Etsy fee calculator for sellers in India</h3>
<p>Sellers in India get paid through Payoneer. Etsy charges 5% + ₹25 for payment processing and a 0.05% regulatory operating fee. Payoneer can add its own withdrawal fee when you move money to your bank, which Etsy says is typically up to 3% of the amount. That Payoneer fee is not included in the calculator.</p>
<p class="use"><button type="button" data-preset="in">Use India rates</button></p>
${exTable('Example: seller in India, ₹1,500 item with ₹150 shipping, no ads', inInp)}

<h2 id="price-for-profit">How to price an Etsy item to hit your profit</h2>
<p>Most sellers pick a price, then find out what is left. It works better the other way round. Decide how much you want to keep, add your costs and the fixed fees, and divide by what remains after the percentage fees:</p>
<div class="callout"><p><strong>Buyer total = (profit + cost to make + postage + fixed fees) ÷ (1 − percentage fees)</strong></p></div>
<p>Say you want $10 profit on an item that costs $6 to make and $4 to post, and you charge $5 shipping. For a US seller with no ads the item price must be at least $${rv0.price.toFixed(2)}. If the sale comes through a 15% Offsite Ad, the same $10 profit needs $${rv15.price.toFixed(2)}.</p>
<p>Switch the calculator to "Price from profit" and it does this sum for your own numbers, including your country's fees.</p>
<p class="use"><button type="button" data-preset="price">Work out my price</button></p>
`;

/* ---------- FAQ ---------- */
const FAQ = [
  ['How much does Etsy take from each sale?',
    `Etsy charges a $0.20 listing fee, a 6.5% transaction fee on the item price plus shipping, and payment processing (3% + $0.25 for US sellers). On a $30 order that is $${usOrder.fees.toFixed(2)}, or ${pct(usOrder.feePct, 0)}. If the sale comes from an Etsy Offsite Ad, add 12% or 15%.`],
  ['Does Etsy charge fees on shipping?',
    'Yes. The 6.5% transaction fee applies to the item price, the shipping you charge and any gift wrapping. Payment processing is charged on the full order total including shipping and tax.'],
  ['Is the $0.20 listing fee charged per sale?',
    'The fee is charged when you create or renew a listing, and listings expire after four months. If a listing has several units, it renews for another $0.20 each time one sells. The calculator counts $0.20 per sale as the cautious assumption.'],
  ['What is the Etsy Offsite Ads fee?',
    'When a buyer clicks an Etsy ad on another website and orders from your shop within 30 days, you pay 15% of the order (12% once your shop reaches $10,000 in sales over 365 days). The fee is capped at $100 per order.'],
  ['Can I opt out of Offsite Ads?',
    'Yes, while your shop has made less than $10,000 in sales over the last 365 days. Once you reach that amount, participation is mandatory and the 12% rate applies for the lifetime of the shop.'],
  ['What are the Etsy fees for digital products?',
    'The same fees as physical items: $0.20 listing, 6.5% transaction fee and payment processing, but with no shipping. On a $10 download from a US seller Etsy keeps $1.40 and you keep $8.60 before your own costs.'],
  ['Do Etsy fees change by country?',
    'Payment processing depends on the country of your bank account, from 3% + $0.25 in the US to 6.5% + $0.30 in several Payoneer countries. Sellers in Canada, France, Hungary, Italy, India, Spain, Türkiye, the United Kingdom and Vietnam also pay a regulatory operating fee.'],
  ['When does Etsy charge a currency conversion fee?',
    'Etsy charges 2.5% on the sale amount when you list in a currency other than the currency of your payment account. Listing in your payment account currency avoids it.'],
  ['How do I price an item to keep a set profit?',
    'Add your profit target, cost to make, postage and fixed fees, then divide by one minus the percentage fees. The "Price from profit" mode in the calculator does this for you, including your country\'s fees and Offsite Ads.'],
  ['How accurate is this calculator?',
    'It uses the rates published by Etsy in October 2026 and is an estimate for a single sale. It leaves out sales tax, VAT on fees, Etsy Ads, Etsy Plus, deposit fees, refunds and Payoneer withdrawal fees. Your payment account in Shop Manager shows the exact amounts.']
];
const FAQ_HTML = FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n');

const JSONLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Etsy Fee Calculator',
      url: SITE_URL + '/',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      description: 'Free calculator for Etsy seller fees in 2026, with rates for ' + F.countries.length + ' countries, digital products and a price-from-profit mode.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      dateModified: TODAY
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
    }
  ]
}).replace(/</g, '\\u003c');

/* ---------- assemble ---------- */
const fontFaces = `
@font-face{font-family:'Bricolage Grotesque';src:url(/fonts/bricolage-grotesque.woff2) format('woff2');font-weight:200 800;font-display:swap}
@font-face{font-family:'Instrument Sans';src:url(/fonts/instrument-sans.woff2) format('woff2');font-weight:400 700;font-display:swap}
@font-face{font-family:'DM Mono';src:url(/fonts/dm-mono-400.woff2) format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:'DM Mono';src:url(/fonts/dm-mono-500.woff2) format('woff2');font-weight:500;font-display:swap}
`;
const css = fontFaces + fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
const options = F.countries.map((c) => `<option value="${c.id}">${esc(c.name)} (${c.currency})</option>`).join('');

let html = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
const map = {
  CSS: css,
  FEES_JS: fs.readFileSync(path.join(root, 'src/fees.js'), 'utf8'),
  APP_JS: fs.readFileSync(path.join(root, 'src/app.js'), 'utf8'),
  ARTICLE, FAQ: FAQ_HTML, JSONLD,
  COUNTRY_OPTIONS: options,
  COUNTRY_COUNT: String(F.countries.length),
  GUMROAD_URL, SITE_URL,
  GSC_META: process.env.GOOGLE_SITE_VERIFICATION
    ? '<meta name="google-site-verification" content="' + esc(process.env.GOOGLE_SITE_VERIFICATION) + '">'
    : ''
};
// replace with a function so "$" in the content is never treated as a regex replacement pattern
for (const k of Object.keys(map)) html = html.split('{{' + k + '}}').join(map[k]);
const left = html.match(/\{\{[A-Z_]+\}\}/g);
if (left) throw new Error('Unreplaced tokens: ' + left.join(', '));

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), html);

const nm = path.join(root, 'node_modules');
const fonts = {
  'bricolage-grotesque.woff2': '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
  'instrument-sans.woff2': '@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2',
  'dm-mono-400.woff2': '@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff2',
  'dm-mono-500.woff2': '@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff2'
};
for (const [out, rel] of Object.entries(fonts)) {
  const src = path.join(root, 'assets/fonts', out);
  fs.copyFileSync(fs.existsSync(src) ? src : path.join(nm, rel), path.join(dist, 'fonts', out));
}
const pub = path.join(root, 'public');
if (fs.existsSync(pub)) fs.cpSync(pub, dist, { recursive: true });

fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
fs.writeFileSync(path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>\n</urlset>\n`);

console.log('Built dist/ for', SITE_URL, '-', Math.round(html.length / 1024) + ' KB html');
