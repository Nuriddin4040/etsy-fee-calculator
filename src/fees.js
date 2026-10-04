/*
 * Etsy fee model, shared by the browser calculator and the build script.
 *
 * Sources (checked October 2026):
 *  - https://www.etsy.com/legal/fees          listing, transaction, offsite ads, currency conversion
 *  - https://www.etsy.com/legal/etsy-payments payment processing fee by bank-account country
 *  - https://help.etsy.com/hc/en-us/articles/1500011073202  regulatory operating fees
 *
 * Fixed fees that Etsy quotes in USD (listing fee, offsite-ads cap) are converted with the
 * approximate rates below. Etsy uses live market rates, so those two numbers are estimates.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EtsyFees = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // units of local currency per 1 USD (approximate, for listing fee and offsite-ads cap only)
  var FX = {
    USD: 1, GBP: 0.78, EUR: 0.92, CAD: 1.37, AUD: 1.52, NZD: 1.66, DKK: 6.9, SEK: 10.3,
    NOK: 10.6, CHF: 0.86, INR: 88, SGD: 1.3, HKD: 7.8, MXN: 18.5
  };

  var LISTING_FEE_USD = 0.20;
  var TRANSACTION_RATE = 0.065;
  var CONVERSION_RATE = 0.025;
  var ADS_CAP_USD = 100;
  var ADS_RATE_STANDARD = 0.15; // shops under $10,000 in the last 365 days (can opt out)
  var ADS_RATE_REDUCED = 0.12; // shops at or over $10,000 (mandatory for the life of the shop)

  // id, name, currency, processing % (domestic), processing % (international, if different),
  // flat processing fee in local currency, regulatory operating fee %, slug used in the page
  var C = [
    ['us', 'United States', 'USD', 3, null, 0.25, 0],
    ['gb', 'United Kingdom', 'GBP', 4, null, 0.20, 0.48],
    ['ca', 'Canada', 'CAD', 3, 4, 0.25, 0.50],
    ['au', 'Australia', 'AUD', 3, 4, 0.25, 0],
    ['nz', 'New Zealand', 'NZD', 3, 4, 0.30, 0],
    ['ie', 'Ireland', 'EUR', 4, null, 0.30, 0],
    ['de', 'Germany', 'EUR', 4, null, 0.30, 0],
    ['fr', 'France', 'EUR', 4, null, 0.30, 1.14],
    ['it', 'Italy', 'EUR', 4, null, 0.30, 0.80],
    ['es', 'Spain', 'EUR', 4, null, 0.30, 0.88],
    ['nl', 'Netherlands', 'EUR', 4, null, 0.30, 0],
    ['at', 'Austria', 'EUR', 4, null, 0.30, 0],
    ['be', 'Belgium', 'EUR', 4, null, 0.30, 0],
    ['pt', 'Portugal', 'EUR', 4, null, 0.30, 0],
    ['fi', 'Finland', 'EUR', 4, null, 0.30, 0],
    ['dk', 'Denmark', 'DKK', 4, null, 2.50, 0],
    ['se', 'Sweden', 'SEK', 4, null, 3.00, 0],
    ['no', 'Norway', 'NOK', 4, null, 2.50, 0],
    ['ch', 'Switzerland', 'CHF', 4, null, 0.50, 0],
    ['in', 'India', 'INR', 5, null, 25, 0.05],
    ['sg', 'Singapore', 'SGD', 4.4, null, 0.35, 0],
    ['hk', 'Hong Kong', 'HKD', 4.4, null, 2.00, 0],
    ['mx', 'Mexico', 'MXN', 4.5, null, 8.00, 0],
    ['jp', 'Japan', 'USD', 6, null, 0.30, 0],
    ['th', 'Thailand', 'USD', 6, null, 0.30, 0],
    ['br', 'Brazil', 'USD', 6.5, null, 0.30, 0],
    ['cn', 'China', 'USD', 6.5, null, 0.30, 0],
    ['kr', 'South Korea', 'USD', 6.5, null, 0.30, 0],
    ['ae', 'United Arab Emirates', 'USD', 6.5, null, 0.30, 0]
  ].map(function (r) {
    return {
      id: r[0], name: r[1], currency: r[2], ppRate: r[3], ppRateIntl: r[4],
      ppFlat: r[5], regRate: r[6]
    };
  });

  function byId(id) {
    for (var i = 0; i < C.length; i++) if (C[i].id === id) return C[i];
    return C[0];
  }

  /**
   * input: { country, price, shipping, cogs, postage, intl, ads: 0|15|12, conversion: bool }
   * all money values are in the seller's currency.
   */
  function calc(input) {
    var c = byId(input.country);
    var fx = FX[c.currency] || 1;
    var price = +input.price || 0;
    var shipping = +input.shipping || 0;
    var cogs = +input.cogs || 0;
    var postage = +input.postage || 0;
    var gross = price + shipping; // what the buyer pays, before tax

    var ppPct = (input.intl && c.ppRateIntl != null ? c.ppRateIntl : c.ppRate) / 100;
    var listing = gross > 0 ? LISTING_FEE_USD * fx : 0;
    var transaction = TRANSACTION_RATE * gross;
    var regulatory = (c.regRate / 100) * gross;
    var processing = gross > 0 ? ppPct * gross + c.ppFlat : 0;
    var adsRate = input.ads ? input.ads / 100 : 0;
    var ads = Math.min(adsRate * gross, ADS_CAP_USD * fx);
    var conversion = input.conversion ? CONVERSION_RATE * gross : 0;

    var fees = listing + transaction + regulatory + processing + ads + conversion;
    var net = gross - fees - cogs - postage;
    return {
      country: c, gross: gross, listing: listing, transaction: transaction,
      regulatory: regulatory, processing: processing, ads: ads, conversion: conversion,
      fees: fees, cogs: cogs, postage: postage, net: net,
      feePct: gross > 0 ? fees / gross : 0,
      margin: gross > 0 ? net / gross : 0,
      ppPct: ppPct, ppFlat: c.ppFlat
    };
  }

  /**
   * Price you need to charge to keep `target` profit after fees and costs.
   * Returns the item price (shipping charged is kept as entered).
   */
  function reverse(input) {
    var c = byId(input.country);
    var fx = FX[c.currency] || 1;
    var shipping = +input.shipping || 0;
    var target = +input.target || 0;
    var cogs = +input.cogs || 0;
    var postage = +input.postage || 0;
    var ppPct = (input.intl && c.ppRateIntl != null ? c.ppRateIntl : c.ppRate) / 100;
    var adsRate = input.ads ? input.ads / 100 : 0;
    var k = TRANSACTION_RATE + c.regRate / 100 + ppPct + (input.conversion ? CONVERSION_RATE : 0);
    var fixed = LISTING_FEE_USD * fx + c.ppFlat + cogs + postage + target;

    var gross = fixed / (1 - k - adsRate);
    if (adsRate && adsRate * gross > ADS_CAP_USD * fx) {
      gross = (fixed + ADS_CAP_USD * fx) / (1 - k);
    }
    var price = gross - shipping;
    return { gross: gross, price: price, ok: isFinite(price) && gross > 0 };
  }

  return {
    countries: C, byId: byId, calc: calc, reverse: reverse, FX: FX,
    LISTING_FEE_USD: LISTING_FEE_USD, TRANSACTION_RATE: TRANSACTION_RATE,
    CONVERSION_RATE: CONVERSION_RATE, ADS_CAP_USD: ADS_CAP_USD,
    ADS_RATE_STANDARD: ADS_RATE_STANDARD, ADS_RATE_REDUCED: ADS_RATE_REDUCED
  };
});
