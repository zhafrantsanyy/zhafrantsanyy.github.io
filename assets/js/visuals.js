/* ==========================================================================
   visuals.js · generative and data visuals
   - Hero rank tracker (canvas)
   - Case-study charts (SVG, built at the size of their container)
   - Shipped-project artwork (SVG)
   - The content-engine simulation (SVG)
   Numbers shown are the ones in the portfolio PDF; anything illustrative
   is labelled as such on the page.
   ========================================================================== */
(function () {
  'use strict';

  var ZT = window.ZT;
  var $$ = ZT.$$, clamp = ZT.clamp, lerp = ZT.lerp;
  var root = document.documentElement;
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- helpers ---------- */
  function css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
  function mk(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, str, attrs) {
    var t = mk('text', Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = str;
    return t;
  }
  function svgRoot(w, h) { return mk('svg', { viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, 'aria-hidden': 'true', focusable: 'false' }); }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function d(s) { return '--d:' + s.toFixed(3) + 's'; }
  function hexToRgb(c) {
    c = c.trim();
    if (c.indexOf('rgb') === 0) { var m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
    if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    var n = parseInt(c.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function rgba(c, a) { var v = hexToRgb(c); return 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + a + ')'; }
  function fmtK(v) { return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(Math.round(v)); }

  /* Caption row shared by the case charts; returns the chart box below it. */
  function frame(s, w, h, left, right, bottomPad) {
    text(s, 0, 11, left, { 'data-fade': '' });
    if (right && fits(w, left, right)) text(s, w, 11, right, { 'text-anchor': 'end', 'class': 't-acc', 'data-fade': '', style: d(0.2) });
    return { x: 0, y: 30, w: w, h: h - 30 - (bottomPad == null ? 18 : bottomPad) };
  }

  /* Mono caption glyphs are ~6.4px wide at 10px; keep both captions only if they fit. */
  function fits(w, a, b) { return (a.length + b.length) * 6.4 + 24 < w; }

  var V = ZT.visuals = {};

  /* ======================================================================
     Case visuals
     ====================================================================== */

  /* Gotrade: distribution of draft scores against the quality gate. */
  V.gotrade = function (w, h) {
    var s = svgRoot(w, h), R = rng(11);
    var c = frame(s, w, h, 'Illustrative draft scores', 'Gate at 0.80');
    var bins = w < 420 ? 16 : 24, lo = 0.52, hi = 1.0, bw = (hi - lo) / bins, vals = [];
    for (var i = 0; i < bins; i++) {
      var x = lo + (i + 0.5) * bw;
      var v = Math.exp(-Math.pow((x - 0.875) / 0.06, 2) / 2) + 0.26 * Math.exp(-Math.pow((x - 0.7) / 0.055, 2) / 2);
      vals.push(v * (0.86 + R() * 0.28));
    }
    var max = Math.max.apply(null, vals), step = c.w / bins, gap = Math.max(2, step * 0.2);
    mk('line', { x1: 0, y1: c.y + c.h, x2: c.w, y2: c.y + c.h, 'class': 'ax' }, s);
    vals.forEach(function (v, i) {
      var bh = Math.max(3, v / max * (c.h - 26)), score = lo + (i + 0.5) * bw;
      mk('rect', { x: i * step + gap / 2, y: c.y + c.h - bh, width: step - gap, height: bh, rx: Math.min(3, (step - gap) / 3),
        'class': score < 0.8 ? 'bar-warn' : 'bar-acc', 'data-grow': '', style: d(i * 0.025) }, s);
    });
    var gx = (0.8 - lo) / (hi - lo) * c.w;
    mk('line', { x1: gx, y1: c.y + 4, x2: gx, y2: c.y + c.h, 'class': 'arc', 'data-fade': '', style: d(0.5) }, s);
    text(s, gx - 8, c.y + 16, 'Rewrite', { 'text-anchor': 'end', 'class': 't-warn', 'data-fade': '', style: d(0.6) });
    text(s, gx + 8, c.y + 16, 'Ship', { 'class': 't-acc', 'data-fade': '', style: d(0.6) });
    text(s, 0, h - 2, '0.50');
    text(s, gx, h - 2, '0.80', { 'text-anchor': 'middle' });
    text(s, c.w, h - 2, '1.00', { 'text-anchor': 'end' });
    return s;
  };

  /* Tembuni: 100 squares, every article written and published hands-off. */
  V.tembuni = function (w, h) {
    var s = svgRoot(w, h);
    var c = frame(s, w, h, 'Each square is 1% of articles', '100% hands-off', 0);
    var g = Math.min(c.h, c.w * 0.48), cell = g / 10, sq = cell * 0.76;
    var oy = c.y + (c.h - g) / 2;
    for (var r = 0; r < 10; r++) for (var q = 0; q < 10; q++) {
      mk('rect', { x: q * cell, y: oy + r * cell, width: sq, height: sq, rx: sq * 0.24, 'class': 'bar-acc', 'data-pop': '', style: d((r + q) * 0.03) }, s);
    }
    var sx = g + Math.max(18, c.w * 0.06), avail = c.w - sx, big = clamp(avail * 0.3, 24, 76);
    var y1 = oy + big * 0.9;
    text(s, sx, y1, '432K', { 'class': 't-strong', style: 'font-size:' + big + 'px;' + d(0.35), 'data-fade': '' });
    text(s, sx, y1 + 18, 'Impressions, month one', { 'data-fade': '', style: d(0.45) });
    var y2 = y1 + big + 34;
    if (y2 < h - 4) {
      text(s, sx, y2, '4K', { 'class': 't-strong', style: 'font-size:' + big + 'px;' + d(0.55), 'data-fade': '' });
      text(s, sx, y2 + 18, 'Clicks, month one', { 'data-fade': '', style: d(0.65) });
    }
    return s;
  };

  /* Traveloka: routes from Indonesia to the four markets. */
  V.traveloka = function (w, h) {
    var s = svgRoot(w, h);
    var c = frame(s, w, h, 'SG · AU · VN · PH', '200+ keywords a month', 0);
    var wide = c.w > c.h * 1.9;
    var mapW = wide ? c.w * 0.62 : c.w, mapX = wide ? c.w - mapW : 0;
    var scale = Math.min(mapW / 62, c.h / 60), ox = mapX + (mapW - 62 * scale) / 2, oy = c.y + (c.h - 60 * scale) / 2;
    var X = function (lon) { return ox + (lon - 95) * scale; }, Y = function (lat) { return oy + (23 - lat) * scale; };
    var gridStep = Math.max(10, scale * 3.2);
    for (var gx = ox + gridStep / 2; gx < ox + 62 * scale; gx += gridStep)
      for (var gy = oy + gridStep / 2; gy < oy + 60 * scale; gy += gridStep)
        mk('circle', { cx: gx, cy: gy, r: 1, 'class': 'dot-dim', opacity: 0.35 }, s);
    var hub = [X(106.8), Y(-6.2)];
    [0.28, 0.55, 0.85].forEach(function (k, i) {
      mk('circle', { cx: hub[0], cy: hub[1], r: k * 60 * scale * 0.5, 'class': 'grid', fill: 'none', 'data-fade': '', style: d(0.1 + i * 0.1) }, s);
    });
    var mk2 = [
      { k: 'SG', n: 'Singapore', lon: 103.8, lat: 1.35 },
      { k: 'VN', n: 'Vietnam', lon: 106.7, lat: 10.8 },
      { k: 'PH', n: 'Philippines', lon: 121.0, lat: 14.6 },
      { k: 'AU', n: 'Australia', lon: 151.2, lat: -33.9 }
    ];
    mk2.forEach(function (m, i) {
      var x = X(m.lon), y = Y(m.lat), mx = (hub[0] + x) / 2, my = (hub[1] + y) / 2;
      var dx = x - hub[0], dy = y - hub[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      var bend = Math.min(60, len * 0.35);
      var cx = mx + (-dy / len) * bend, cy = my + (dx / len) * bend;
      if (m.k === 'SG') { cx = mx - 34; cy = my - 6; }
      var p = 'M' + hub[0].toFixed(1) + ' ' + hub[1].toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1);
      mk('path', { d: p, 'class': 'ln', 'data-draw': '', style: d(0.2 + i * 0.18) + ';stroke-width:1.6' }, s);
      if (!ZT.reduced()) {
        var dot = mk('circle', { r: 2.6, 'class': 'dot' }, s);
        var am = mk('animateMotion', { dur: (2.2 + i * 0.35) + 's', repeatCount: 'indefinite', begin: (1.4 + i * 0.3) + 's', path: p }, dot);
        am.setAttribute('rotate', 'auto');
      }
      mk('circle', { cx: x, cy: y, r: 4.5, 'class': 'dot', 'data-pop': '', style: d(0.9 + i * 0.18) }, s);
      var right = m.k !== 'PH';
      text(s, x + (right ? 9 : -9), y - 4, m.k, { 'class': 't-strong', 'text-anchor': right ? 'start' : 'end', style: 'font-size:13px;' + d(1 + i * 0.18), 'data-fade': '' });
      if (c.w > 300) text(s, x + (right ? 9 : -9), y + 9, m.n, { 'text-anchor': right ? 'start' : 'end', 'data-fade': '', style: d(1.05 + i * 0.18) });
    });
    mk('circle', { cx: hub[0], cy: hub[1], r: 6, fill: 'none', 'class': 'ring-acc', style: 'stroke-width:2' }, s);
    mk('circle', { cx: hub[0], cy: hub[1], r: 2.5, 'class': 'dot' }, s);
    text(s, hub[0] - 10, hub[1] + 4, 'ID', { 'text-anchor': 'end', 'class': 't-strong', style: 'font-size:13px' });
    if (wide) {
      var big = clamp(c.h * 0.2, 26, 60), sy = c.y + big;
      [['200+', 'Keywords researched a month'], ['150+', 'Pieces optimized a month'], ['04', 'International markets']].forEach(function (r, i) {
        var yy = sy + i * (big + 26);
        if (yy > h) return;
        text(s, 0, yy, r[0], { 'class': 't-strong', style: 'font-size:' + big + 'px;' + d(0.3 + i * 0.12), 'data-fade': '' });
        text(s, 0, yy + 16, r[1], { 'data-fade': '', style: d(0.4 + i * 0.12) });
      });
    }
    return s;
  };

  /* HashMicro: a traffic index compounding at +23% a quarter. */
  V.hashmicro = function (w, h) {
    var s = svgRoot(w, h);
    var c = frame(s, w, h, 'Illustrative traffic index', '~1M visitors');
    var vals = [100, 123, 151.3, 186.1, 228.9], max = 250, padL = 30;
    var X = function (i) { return padL + i * (c.w - padL - 12) / (vals.length - 1); };
    var Yv = function (v) { return c.y + c.h - v / max * c.h; };
    [0, 100, 200].forEach(function (g) {
      mk('line', { x1: padL, y1: Yv(g), x2: c.w, y2: Yv(g), 'class': 'grid' }, s);
      text(s, 0, Yv(g) + 3, String(g));
    });
    var line = 'M' + vals.map(function (v, i) { return X(i).toFixed(1) + ' ' + Yv(v).toFixed(1); }).join(' L');
    mk('path', { d: line + ' L' + X(4).toFixed(1) + ' ' + Yv(0) + ' L' + X(0) + ' ' + Yv(0) + 'Z', 'class': 'area', 'data-fade': '', style: d(0.6) }, s);
    mk('path', { d: line, 'class': 'ln', 'data-draw': '', style: d(0.1) }, s);
    vals.forEach(function (v, i) {
      mk('circle', { cx: X(i), cy: Yv(v), r: 4.5, 'class': 'dot', 'data-pop': '', style: d(0.3 + i * 0.28) }, s);
      text(s, X(i), h - 2, 'Q' + (i + 1), { 'text-anchor': 'middle' });
      if (i) {
        var mx = (X(i) + X(i - 1)) / 2, my = (Yv(v) + Yv(vals[i - 1])) / 2;
        text(s, mx - 6, my - 12, '+23%', { 'class': 't-acc', 'text-anchor': 'end', 'data-fade': '', style: d(0.45 + i * 0.28) });
      }
    });
    return s;
  };

  /* Superkos: monthly clicks, 12-month ramp (bar heights from the PDF chart). */
  var SUPERKOS = [222, 370, 593, 815, 1333, 2074, 2815, 3556, 4296, 5185, 6074, 6815];
  var MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  V.superkos = function (w, h, opts) {
    var s = svgRoot(w, h);
    var interactive = opts && opts.interactive, base = w > 520 ? '40.7K clicks · 1.6M impressions' : '40.7K clicks';
    text(s, 0, 11, w > 300 ? 'Monthly clicks, 12-month ramp' : 'Monthly clicks', { 'data-fade': '' });
    var read = text(s, w, 11, base, { 'text-anchor': 'end', 'class': 't-acc', 'data-fade': '', style: d(0.2) });
    var c = { x: 0, y: 30, w: w, h: h - 48 }, padL = 30, max = 8000;
    var Yv = function (v) { return c.y + c.h - v / max * c.h; };
    [0, 2000, 4000, 6000, 8000].forEach(function (g) {
      mk('line', { x1: padL, y1: Yv(g), x2: c.w, y2: Yv(g), 'class': 'grid' }, s);
      text(s, 0, Yv(g) + 3, g ? g / 1000 + 'K' : '0');
    });
    var step = (c.w - padL) / 12, gap = Math.max(3, step * 0.24), bars = [];
    SUPERKOS.forEach(function (v, i) {
      var x = padL + i * step + gap / 2, y = Yv(v);
      bars.push(mk('rect', { x: x, y: y, width: step - gap, height: Yv(0) - y, rx: Math.min(4, (step - gap) / 4),
        'class': i === 11 ? 'bar-acc' : 'bar', 'data-grow': '', style: d(i * 0.06) }, s));
      if (w > 360 || i % 2 === 0) text(s, x + (step - gap) / 2, h - 2, MONTHS[i], { 'text-anchor': 'middle' });
    });
    if (interactive) {
      SUPERKOS.forEach(function (v, i) {
        var hit = mk('rect', { x: padL + i * step, y: c.y, width: step, height: c.h, 'class': 'bar-hit' }, s);
        hit.addEventListener('pointerenter', function () {
          bars.forEach(function (b, j) { b.setAttribute('class', j === i ? 'bar-acc' : 'bar'); });
          read.textContent = MONTHS[i] + ' · about ' + fmtK(Math.round(v / 100) * 100) + ' clicks';
        });
      });
      s.addEventListener('pointerleave', function () {
        bars.forEach(function (b, j) { b.setAttribute('class', j === 11 ? 'bar-acc' : 'bar'); });
        read.textContent = base;
      });
    }
    return s;
  };

  /* Adnafarms: a 280-keyword portfolio placed by difficulty and intent. */
  V.adnafarms = function (w, h) {
    var s = svgRoot(w, h), R = rng(280);
    var c = frame(s, w, h, 'Illustrative keyword placement', '280+ keywords');
    var zone = { x: c.x, y: c.y, w: c.w * 0.42, h: c.h * 0.5 };
    mk('rect', { x: zone.x, y: zone.y, width: zone.w, height: zone.h, rx: 10, fill: 'none', 'class': 'arc', 'data-fade': '', style: d(0.1) }, s);
    text(s, zone.x + 10, zone.y + 16, 'Low difficulty, high intent', { 'class': 't-acc', 'data-fade': '', style: d(0.3) });
    mk('line', { x1: 0, y1: c.y + c.h, x2: c.w, y2: c.y + c.h, 'class': 'ax' }, s);
    text(s, c.w, h - 2, 'Difficulty →', { 'text-anchor': 'end' });
    text(s, 0, h - 2, 'Intent ↑');
    var r = w > 600 ? 3 : 2.2;
    function gauss() { return (R() + R() + R() - 1.5) / 1.5; }
    for (var i = 0; i < 280; i++) {
      var inZone = i < 200, x, y;
      if (inZone) { x = zone.x + clamp(0.46 + gauss() * 0.5, 0.04, 0.96) * zone.w; y = zone.y + 22 + clamp(0.52 + gauss() * 0.55, 0.04, 0.96) * (zone.h - 26); }
      else { x = c.x + R() * c.w; y = c.y + R() * c.h; if (x < zone.x + zone.w && y < zone.y + zone.h) { x += zone.w; } }
      x = clamp(x, r, c.w - r);
      var dist = (x / c.w + (1 - (y - c.y) / c.h)) / 2;
      mk('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r, 'class': inZone ? 'dot' : 'dot-dim', 'data-pop': '', style: d(0.15 + dist * 0.9) }, s);
    }
    return s;
  };

  /* Brotzeit and Palmoilanalytics: two clients, two audiences. */
  V.brotzeit = function (w, h) {
    var s = svgRoot(w, h);
    var half = w / 2, big = clamp(Math.min(half * 0.26, h * 0.24), 26, 70);
    mk('line', { x1: half, y1: 0, x2: half, y2: h, 'class': 'grid' }, s);
    text(s, 0, 11, 'Brotzeit · Singapore', { 'data-fade': '' });
    text(s, 0, 30 + big, '10K', { 'class': 't-strong', style: 'font-size:' + big + 'px;' + d(0.2), 'data-fade': '' });
    text(s, 0, 30 + big + 17, 'Keywords ranked', { 'data-fade': '', style: d(0.3) });
    var barsTop = 30 + big + 36, bw = (half - 24) / 50;
    var bh = h - barsTop - 18;
    if (bh > 16) {
      for (var i = 0; i < 50; i++) {
        var hh = bh * (0.35 + 0.65 * Math.abs(Math.sin(i * 1.7 + 0.4)));
        mk('rect', { x: i * bw, y: barsTop + bh - hh, width: Math.max(1, bw * 0.55), height: hh, 'class': 'bar-acc', 'data-grow': '', style: d(0.3 + i * 0.015) }, s);
      }
      text(s, 0, h - 2, '50 backlinks a month');
    }
    var cx0 = half + 20;
    text(s, cx0, 11, 'Palmoilanalytics · global', { 'data-fade': '' });
    var rr = Math.max(18, Math.min((half - 40) / 2.2, (h - 60) / 2)), cx = cx0 + rr + 8, cy = 30 + (h - 48) / 2 + 4;
    var circ = 2 * Math.PI * rr;
    mk('circle', { cx: cx, cy: cy, r: rr, 'class': 'ring', style: 'stroke-width:' + Math.max(6, rr * 0.18) }, s);
    mk('circle', { cx: cx, cy: cy, r: rr, 'class': 'ring-acc', transform: 'rotate(-90 ' + cx + ' ' + cy + ')', 'data-arc': '',
      style: 'stroke-width:' + Math.max(6, rr * 0.18) + ';--len:' + circ.toFixed(1) + ';--a:' + (circ * 0.95).toFixed(1) + ';' + d(0.4) }, s);
    text(s, cx, cy + 4, '95%', { 'class': 't-strong', 'text-anchor': 'middle', style: 'font-size:' + clamp(rr * 0.5, 14, 34) + 'px' });
    var tx0 = cx + rr + 16;
    if (w - tx0 > 70) {
      text(s, tx0, cy - 10, 'New users', { 'data-fade': '', style: d(0.8) });
      text(s, tx0, cy + 16, '10K+', { 'class': 't-strong', style: 'font-size:' + clamp(rr * 0.45, 14, 30) + 'px;' + d(0.9), 'data-fade': '' });
      text(s, tx0, cy + 32, 'Monthly traffic', { 'data-fade': '', style: d(1) });
    }
    return s;
  };

  /* SIMAKARA: a registration query at the top of an enrollment funnel. */
  V.simakara = function (w, h) {
    var s = svgRoot(w, h);
    var pillH = 34, pillW = Math.min(w, 420);
    mk('rect', { x: 0, y: 0, width: pillW, height: pillH, rx: pillH / 2, 'class': 'pill', 'data-fade': '' }, s);
    mk('circle', { cx: 18, cy: pillH / 2 - 1, r: 5.5, fill: 'none', stroke: 'currentColor', 'class': 'ax', style: 'stroke:var(--fg-2);stroke-width:1.6' }, s);
    mk('line', { x1: 22, y1: pillH / 2 + 3, x2: 26, y2: pillH / 2 + 7, style: 'stroke:var(--fg-2);stroke-width:1.6;stroke-linecap:round' }, s);
    var q = text(s, 36, pillH / 2 + 4, pillW < 330 ? 'contoh formulir pendaftaran…' : 'contoh formulir pendaftaran bimbel', { 'class': 't-strong', style: 'font-size:13px;font-family:var(--f-sans);font-weight:500' });
    q.setAttribute('data-fade', '');
    var top = pillH + 22, fh = h - top - 4, bands = [
      { w: 1, label: '171K impressions', v: 'Search results' },
      { w: 0.5, label: '6.2K clicks', v: '3.6% CTR' },
      { w: 0.26, label: 'Registration', v: 'Enrollment' }
    ];
    var bandH = (fh - 16) / 3;
    bands.forEach(function (b, i) {
      var bwid = w * b.w, x = (w - bwid) / 2, y = top + i * (bandH + 8);
      var nw = i < 2 ? w * bands[i + 1].w : bwid * 0.7, nx = (w - nw) / 2;
      var p = 'M' + x + ' ' + y + ' L' + (x + bwid) + ' ' + y + ' L' + (nx + nw) + ' ' + (y + bandH) + ' L' + nx + ' ' + (y + bandH) + 'Z';
      mk('path', { d: p, 'class': i === 1 ? 'funnel-acc' : 'funnel', 'data-grow-c': '', style: d(0.25 + i * 0.22) }, s);
      var fs = clamp(bandH * 0.36, 11, 22);
      text(s, w / 2, y + bandH / 2 + fs * 0.1, b.label, { 'class': 't-strong', 'text-anchor': 'middle', style: 'font-size:' + fs + 'px;' + (i === 1 ? 'fill:var(--accent-ink);' : '') + d(0.5 + i * 0.22), 'data-fade': '' });
      if (bandH > 34) text(s, w / 2, y + bandH / 2 + fs * 0.1 + 15, b.v, { 'text-anchor': 'middle', style: (i === 1 ? 'fill:var(--accent-ink);opacity:.7;' : '') + d(0.6 + i * 0.22), 'data-fade': '' });
    });
    return s;
  };

  /* ======================================================================
     Shipped-project artwork
     ====================================================================== */

  /* financial-reporting-pipeline: an n8n-style canvas. */
  V.pipeline = function (w, h) {
    var s = svgRoot(w, h), compact = w < 560;
    var nw = compact ? Math.min(104, w * 0.29) : 124, nh = compact ? 30 : 38, fs = compact ? 9.5 : 11.5;
    var N, E;
    if (compact) {
      var cx = [0.17, 0.5, 0.83].map(function (k) { return k * w; });
      N = [
        { l: 'Accurate Online', x: cx[0], y: h * 0.42 }, { l: 'Google Sheets', x: cx[0], y: h * 0.74 },
        { l: 'Merge + checks', x: cx[1], y: h * 0.36 }, { l: 'Metrics · P&L', x: cx[1], y: h * 0.58 },
        { l: 'Render HTML', x: cx[1], y: h * 0.8 }, { l: 'Telegram 07:00', x: cx[2], y: h * 0.58 },
        { l: 'AI analyst', x: cx[2], y: h * 0.8 }
      ];
      E = [[0, 2, 'h'], [1, 2, 'h'], [2, 3, 'v'], [3, 4, 'v'], [4, 5, 'h'], [5, 6, 'v']];
    } else {
      var my = h * 0.5, gy = Math.min(70, h * 0.13), c4 = [0.14, 0.36, 0.58, 0.8].map(function (k) { return k * w; });
      N = [
        { l: 'Accurate Online', x: c4[0], y: my - gy }, { l: 'Google Sheets', x: c4[0], y: my + gy },
        { l: 'Merge + checks', x: c4[1], y: my }, { l: 'Metrics · P&L', x: c4[2], y: my - gy * 0.8 },
        { l: 'Render HTML', x: c4[2], y: my + gy * 0.8 }, { l: 'Telegram 07:00', x: c4[3], y: my },
        { l: 'AI analyst', x: c4[3], y: my + gy * 1.7 }
      ];
      E = [[0, 2, 'h'], [1, 2, 'h'], [2, 3, 'h'], [2, 4, 'h'], [3, 5, 'h'], [4, 5, 'h'], [5, 6, 'v']];
    }
    E.forEach(function (e, i) {
      var a = N[e[0]], b = N[e[1]], p;
      if (e[2] === 'v') p = 'M' + a.x + ' ' + (a.y + nh / 2) + ' L' + b.x + ' ' + (b.y - nh / 2);
      else {
        var x1 = a.x + nw / 2, x2 = b.x - nw / 2, k = Math.max(18, (x2 - x1) * 0.6);
        p = 'M' + x1 + ' ' + a.y + ' C' + (x1 + k) + ' ' + a.y + ' ' + (x2 - k) + ' ' + b.y + ' ' + x2 + ' ' + b.y;
      }
      mk('path', { d: p, 'class': 'edge', 'data-fade': '', style: d(0.2 + i * 0.08) }, s);
    });
    N.forEach(function (n, i) {
      var g = mk('g', { 'data-pop': '', style: d(0.1 + i * 0.09) }, s), acc = i === 5;
      mk('rect', { x: n.x - nw / 2, y: n.y - nh / 2, width: nw, height: nh, rx: 10, 'class': acc ? 'node-acc' : 'node' }, g);
      mk('circle', { cx: n.x - nw / 2 + 12, cy: n.y, r: 3.2, 'class': acc ? 'dot-ink' : 'dot' }, g);
      text(g, n.x - nw / 2 + 21, n.y + fs * 0.36, n.l, { 'class': 't-strong', style: 'font-size:' + fs + 'px;font-family:var(--f-sans);font-weight:600;' + (acc ? 'fill:var(--accent-ink)' : '') });
    });
    var bw = Math.min(w * (compact ? 0.5 : 0.4), 230), bh = compact ? 36 : 44, bx = w - bw - (compact ? 10 : w * 0.08), by = compact ? 14 : h * 0.1;
    var bub = mk('g', { 'data-pop': '', style: d(1.1) }, s);
    mk('rect', { x: bx, y: by, width: bw, height: bh, rx: 12, 'class': 'pill' }, bub);
    text(bub, bx + 12, by + (compact ? 15 : 18), 'Daily report ready', { 'class': 't-strong', style: 'font-size:' + (compact ? 10 : 12) + 'px;font-family:var(--f-sans)' });
    text(bub, bx + 12, by + (compact ? 28 : 34), compact ? '07:00 · 3 dashboards' : '07:00 · 3 dashboards attached');
    text(s, 14, h - 12, '61 nodes · one workflow');
    return s;
  };

  /* TJS-Lumber: a per-pallet QC sheet. 2,345 OK pieces, 55 flagged, 2.29% defect. */
  V.lumber = function (w, h) {
    var s = svgRoot(w, h), R = rng(2345);
    var padX = Math.max(16, w * 0.06), top = h * 0.2, bot = h - 36, n = 20;
    text(s, padX, top - 26, 'QC sheet · 20 pallets', { 'data-fade': '' });
    text(s, w - padX, top - 26, '2.29% defect', { 'text-anchor': 'end', 'class': 't-warn', 'data-fade': '' });
    text(s, w - padX, top - 10, '2,345 OK pieces', { 'text-anchor': 'end', 'class': 't-acc', 'data-fade': '', style: d(0.1) });
    var defects = [], left = 55;
    for (var i = 0; i < n; i++) { var dd = i === n - 1 ? left : Math.min(left, Math.round(R() * 5)); defects.push(dd); left -= dd; }
    var step = (w - padX * 2) / n, bw = step * 0.62, maxH = bot - top;
    for (var j = 0; j < n; j++) {
      var tot = 112 + R() * 16, hh = tot / 128 * maxH, x = padX + j * step, y = bot - hh;
      var defH = Math.max(defects[j] ? 3 : 0, defects[j] / tot * hh * 1.6);
      mk('rect', { x: x, y: y + defH, width: bw, height: hh - defH, rx: 3, 'class': 'bar', 'data-grow': '', style: d(j * 0.04) }, s);
      if (defH) mk('rect', { x: x, y: y, width: bw, height: defH, rx: 1.5, 'class': 'bar-warn', 'data-pop': '', style: d(0.9 + j * 0.03) }, s);
      if (j % 5 === 0 || j === n - 1) text(s, x + bw / 2, h - 16, 'P' + String(j + 1).padStart(2, '0'), { 'text-anchor': 'middle' });
    }
    return s;
  };

  /* kalamekardemo: a bouquet being built on a canvas. */
  V.bouquet = function (w, h) {
    var s = svgRoot(w, h), R = rng(8);
    var cx = w / 2, cy = h * 0.42, rad = Math.min(w, h) * 0.26, tieY = h * 0.78;
    var cone = 'M' + (cx - rad * 0.55) + ' ' + (cy + rad * 0.55) + ' L' + (cx + rad * 0.55) + ' ' + (cy + rad * 0.55) + ' L' + (cx + 10) + ' ' + (h * 0.92) + ' L' + (cx - 10) + ' ' + (h * 0.92) + 'Z';
    var flowers = [];
    for (var i = 0; i < 17; i++) {
      var a = R() * Math.PI * 2, rr = Math.sqrt(R()) * rad;
      flowers.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.8, r: rad * (0.16 + R() * 0.12), k: i % 4 });
    }
    flowers.sort(function (a, b) { return a.y - b.y; });
    flowers.forEach(function (f, i) {
      mk('line', { x1: f.x, y1: f.y, x2: cx, y2: tieY, 'class': 'stem', 'data-fade': '', style: d(0.1 + i * 0.03) }, s);
    });
    mk('path', { d: cone, 'class': 'wrap', 'data-fade': '', style: d(0.2) }, s);
    flowers.forEach(function (f, i) {
      var g = mk('g', { 'data-pop': '', style: d(0.3 + i * 0.05) }, s);
      mk('circle', { cx: f.x, cy: f.y, r: f.r, 'class': 'fl fl-' + f.k }, g);
      mk('circle', { cx: f.x, cy: f.y, r: f.r * 0.32, 'class': 'fl-core' }, g);
    });
    for (var k = 0; k < 26; k++) {
      var a2 = R() * Math.PI * 2, r2 = rad * (0.7 + R() * 0.45);
      mk('circle', { cx: cx + Math.cos(a2) * r2, cy: cy + Math.sin(a2) * r2 * 0.8, r: 1.6 + R() * 1.6, 'class': 'dot', 'data-pop': '', style: d(1 + k * 0.02) }, s);
    }
    var chipW = Math.min(170, w * 0.44), chipX = w - chipW - 16;
    var chip = mk('g', { 'data-pop': '', style: d(1.2) }, s);
    mk('rect', { x: chipX, y: 16, width: chipW, height: 46, rx: 12, 'class': 'pill' }, chip);
    text(chip, chipX + 12, 34, 'Live price', {});
    text(chip, chipX + 12, 52, 'Updates as you build', { 'class': 't-strong', style: 'font-size:12px;font-family:var(--f-sans)' });
    text(s, 16, h - 14, 'Drag · drop · price');
    return s;
  };

  /* Nusrah: an abstract reporting dashboard. */
  V.dashboard = function (w, h) {
    var s = svgRoot(w, h), R = rng(4);
    var p = Math.max(16, w * 0.06), gw = w - p * 2, tileW = (gw - 20) / 3, tileH = Math.min(78, h * 0.18);
    ['Sales', 'Orders', 'Catalogue'].forEach(function (l, i) {
      var x = p + i * (tileW + 10), g = mk('g', { 'data-pop': '', style: d(0.1 + i * 0.1) }, s);
      mk('rect', { x: x, y: p, width: tileW, height: tileH, rx: 12, 'class': 'node' }, g);
      text(g, x + 12, p + 20, l);
      mk('rect', { x: x + 12, y: p + tileH - 30, width: tileW * (0.4 + i * 0.12), height: 12, rx: 4, 'class': i === 0 ? 'bar-acc' : 'bar' }, g);
    });
    var cy0 = p + tileH + 18, ch = h * 0.36, pts = [];
    for (var i = 0; i < 12; i++) pts.push([p + i * gw / 11, cy0 + ch - (0.25 + 0.6 * (i / 11) + (R() - 0.5) * 0.18) * ch]);
    var line = 'M' + pts.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' L');
    mk('rect', { x: p, y: cy0, width: gw, height: ch, rx: 12, 'class': 'node', 'data-fade': '' }, s);
    mk('path', { d: line + ' L' + (p + gw) + ' ' + (cy0 + ch) + ' L' + p + ' ' + (cy0 + ch) + 'Z', 'class': 'area', 'data-fade': '', style: d(0.8) }, s);
    mk('path', { d: line, 'class': 'ln', 'data-draw': '', style: d(0.3) }, s);
    var by0 = cy0 + ch + 18, rows = Math.max(2, Math.min(4, Math.floor((h - by0 - p) / 22)));
    for (var r = 0; r < rows; r++) {
      var yy = by0 + r * 22;
      mk('rect', { x: p, y: yy, width: 60, height: 8, rx: 3, 'class': 'bar', opacity: 0.6 }, s);
      mk('rect', { x: p + 76, y: yy, width: (gw - 76) * (0.85 - r * 0.18), height: 8, rx: 3, 'class': r ? 'bar' : 'bar-acc', 'data-grow-x': '', style: d(0.9 + r * 0.1) }, s);
    }
    return s;
  };

  /* Render a named visual at the size of its container. */
  ZT.renderViz = function (box, name, opts) {
    if (!V[name]) return null;
    var cs = getComputedStyle(box);
    var w = Math.floor(box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    var h = Math.floor(box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
    if (w < 60 || h < 60) return null;
    box.textContent = '';
    var wrap = document.createElement('div');
    wrap.className = 'viz';
    wrap.appendChild(V[name](w, h, opts || {}));
    box.appendChild(wrap);
    $$('[data-draw]', wrap).forEach(function (p) {
      var L = 1000;
      try { L = p.getTotalLength(); } catch (e) {}
      p.style.setProperty('--len', Math.ceil(L) + 1);
    });
    return wrap;
  };
  ZT.playViz = function (wrap, delay) {
    if (!wrap) return;
    setTimeout(function () {
      requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.classList.add('is-on'); }); });
    }, delay || 0);
  };

  /* ======================================================================
     Hero rank tracker
     ====================================================================== */
  ZT.rankTracker = function (opts) {
    var canvas = opts.canvas, hero = opts.hero, tip = opts.tip, clusters = opts.clusters;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, box = {}, lines = [], col = {}, N = 34, acc = 0, lastMove = 0;
    var t0 = performance.now(), drawP = 0, drawing = false, visible = true, off = null;
    var hot = -1, pointer = null, lastUser = 0, autoI = -1, autoT = 0, coarse = false;

    function readColors() {
      col.fg = css('--fg'); col.accent = css('--accent'); col.accentFg = css('--accent-fg'); col.bg = css('--bg');
      col.light = root.getAttribute('data-theme') === 'light';
    }
    function gen() {
      var R = rng(20260927), extra = W < 760 ? 12 : 30;
      lines = [];
      for (var i = 0; i < clusters.length + extra; i++) {
        var labeled = i < clusters.length;
        lines.push({
          labeled: labeled, c: labeled ? clusters[i] : null,
          l0: Math.log(labeled ? 28 + R() * 64 : 8 + R() * 92),
          l1: Math.log(labeled ? 1 + R() * 0.6 : 1.6 + Math.pow(R(), 1.5) * 50),
          bend: 0.3 + R() * 0.42, steep: 6 + R() * 6,
          ph: [R() * 6.28, R() * 6.28, R() * 6.28], fr: [2 + R() * 2.5, 5 + R() * 4, 10 + R() * 7],
          amp: 0.14 + R() * 0.16, sp: 0.6 + R() * 0.8,
          delay: labeled ? 0.12 + i * 0.045 : R() * 0.55,
          xs: new Float32Array(N), ys: new Float32Array(N), n: 0
        });
      }
    }
    function Y(rank) { return box.top + Math.log(clamp(rank, 1, 100)) / Math.log(100) * (box.bottom - box.top); }
    function rankAt(L, t, tau) {
      var s = 1 / (1 + Math.exp(-(t - L.bend) * L.steep));
      var lr = L.l0 * (1 - s) + L.l1 * s;
      var n = Math.sin(t * L.fr[0] + L.ph[0] + tau * 0.3 * L.sp) * 0.55 + Math.sin(t * L.fr[1] + L.ph[1] - tau * 0.45 * L.sp) * 0.3 + Math.sin(t * L.fr[2] + L.ph[2] + tau * 0.7 * L.sp) * 0.15;
      return Math.exp(lr + n * L.amp * (1 - s * 0.9));
    }
    function size() {
      var r = hero.getBoundingClientRect();
      W = Math.round(r.width); H = Math.round(r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var hdr = parseFloat(css('--hdr-h')) || 72, gut = parseFloat(getComputedStyle(hero.querySelector('.wrap')).paddingLeft) || 24;
      box.gut = gut;
      box.top = W < 1024 ? hdr + 78 : hdr + 150;
      box.bottom = H - 26;
      box.left = -30;
      box.right = W - gut - 30;
      coarse = !ZT.finePointer;
      gen();
    }
    function progress(L) { return clamp((drawP - L.delay) / 1.1, 0, 1); }
    function ease(p) { return 1 - Math.pow(1 - p, 3); }

    function draw(now) {
      var tau = ZT.reduced() ? 0 : (now - t0) / 1000;
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      /* rank grid */
      ctx.font = '500 10px "Geist Mono", ui-monospace, monospace';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      [1, 3, 10, 30].forEach(function (r) {
        var y = Math.round(Y(r)) + 0.5;
        ctx.strokeStyle = rgba(col.fg, r === 1 ? 0.2 : 0.07);
        ctx.setLineDash(r === 1 ? [] : [2, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(box.right + 6, y); ctx.stroke();
        if (r <= 10 && (W >= 760 || r === 1)) {
          ctx.fillStyle = r === 1 ? col.accentFg : rgba(col.fg, 0.4);
          ctx.fillText('#' + r, W - box.gut, y);
        }
      });
      ctx.setLineDash([]);
      /* compute points */
      for (var i = 0; i < lines.length; i++) {
        var L = lines[i], p = ease(progress(L)), n = Math.max(2, Math.round(p * (N - 1)) + 1);
        L.n = p > 0 ? n : 0;
        for (var k = 0; k < n; k++) {
          var t = k / (N - 1);
          L.xs[k] = box.left + t * (box.right - box.left);
          L.ys[k] = Y(rankAt(L, t, tau));
        }
      }
      /* unlabelled first, labelled on top, hot line last */
      for (var pass = 0; pass < 3; pass++) {
        for (var j = 0; j < lines.length; j++) {
          var M = lines[j];
          if (!M.n) continue;
          var isHot = j === hot;
          if ((pass === 0 && M.labeled) || (pass === 1 && (!M.labeled || isHot)) || (pass === 2 && !isHot)) continue;
          ctx.beginPath();
          ctx.moveTo(M.xs[0], M.ys[0]);
          for (var q = 1; q < M.n - 1; q++) {
            var mx = (M.xs[q] + M.xs[q + 1]) / 2, my = (M.ys[q] + M.ys[q + 1]) / 2;
            ctx.quadraticCurveTo(M.xs[q], M.ys[q], mx, my);
          }
          ctx.lineTo(M.xs[M.n - 1], M.ys[M.n - 1]);
          if (isHot) {
            if (!col.light) { ctx.strokeStyle = rgba(col.accent, 0.16); ctx.lineWidth = 9; ctx.stroke(); }
            ctx.strokeStyle = col.light ? col.accentFg : col.accent; ctx.lineWidth = 2.4;
          } else if (M.labeled) {
            ctx.strokeStyle = rgba(col.fg, hot > -1 ? 0.16 : 0.3); ctx.lineWidth = 1.3;
          } else {
            ctx.strokeStyle = rgba(col.fg, hot > -1 ? 0.05 : 0.09); ctx.lineWidth = 1;
          }
          ctx.stroke();
          if (M.labeled && M.n === N) {
            var ex = M.xs[N - 1], ey = M.ys[N - 1];
            ctx.beginPath(); ctx.arc(ex, ey, isHot ? 4.5 : 2.6, 0, Math.PI * 2);
            ctx.fillStyle = isHot ? (col.light ? col.accentFg : col.accent) : rgba(col.fg, 0.45);
            ctx.fill();
            if (isHot) {
              ctx.beginPath(); ctx.arc(ex, ey, 10, 0, Math.PI * 2);
              ctx.strokeStyle = rgba(col.accent, 0.5); ctx.lineWidth = 1; ctx.stroke();
            }
          }
        }
      }
    }

    function frame(now, dt) {
      if (!W) return;
      if (drawing) {
        drawP += dt / 1000 * 0.62;
        if (drawP > 2) drawing = false;
      }
      autoCycle(dt);
      acc += dt;
      if (!drawing && now - lastMove > 1200 && acc < 32) return;
      acc = 0;
      draw(now);
      if (hot > -1 && pointer && !pointer.auto) placeTip(pointer.x, pointer.y);
      else if (hot > -1 && W >= 760) tipAtEnd();
    }
    function start() {
      if (off || !visible || ZT.reduced()) return;
      off = ZT.tick(frame);
    }
    function stop() { if (off) { off(); off = null; } }
    function still() {
      drawP = 2; drawing = false;
      draw(t0);
    }

    /* ---- hover / tooltip ---- */
    function nearest(px, py) {
      var best = -1, bd = coarse ? 44 : 26, t = (px - box.left) / (box.right - box.left);
      if (t < 0 || t > 1.02) return -1;
      var tau = ZT.reduced() ? 0 : (performance.now() - t0) / 1000;
      for (var i = 0; i < clusters.length; i++) {
        var L = lines[i];
        if (!L.n || progress(L) < Math.min(1, t)) continue;
        var dd = Math.abs(Y(rankAt(L, clamp(t, 0, 1), tau)) - py);
        if (dd < bd) { bd = dd; best = i; }
      }
      return best;
    }
    function fillTip(i) {
      var c = clusters[i];
      tip.innerHTML = '<b></b><span></span><small><span>Keyword cluster</span><span></span></small>';
      tip.querySelector('b').textContent = c.k;
      tip.querySelector('span').textContent = c.client + ' · ' + c.m;
      tip.querySelector('small span:last-child').textContent = coarse ? 'Case study below' : 'Click to open case';
    }
    function setHot(i) {
      if (i === hot) return;
      hot = i;
      var showTip = i > -1 && !(pointer && pointer.auto && W < 760);
      if (showTip) { fillTip(i); tip.classList.add('is-on'); } else tip.classList.remove('is-on');
      hero.style.cursor = i > -1 && !coarse ? 'pointer' : '';
      if (ZT.reduced()) draw(t0);
    }
    function placeTip(x, y) {
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var tx = x + 18, ty = y + 18;
      if (tx + tw > W - 12) tx = x - tw - 18;
      if (ty + th > H - 12) ty = y - th - 18;
      tip.style.transform = 'translate3d(' + Math.round(tx) + 'px,' + Math.round(ty) + 'px,0)';
    }
    function tipAtEnd() {
      var L = lines[hot];
      if (!L || !L.n) return;
      var k = Math.max(0, L.n - 1 - Math.round(N * 0.08));
      var x = L.xs[k], y = L.ys[k], tw = tip.offsetWidth;
      tip.style.transform = 'translate3d(' + Math.round(Math.min(x - tw * 0.5, W - tw - 16)) + 'px,' + Math.round(y + 22) + 'px,0)';
    }
    function autoCycle(dt) {
      if (ZT.reduced() || drawP < 1.5) return;
      if (performance.now() - lastUser < 4200) return;
      autoT -= dt;
      if (autoT > 0) return;
      autoT = 2800;
      autoI = (autoI + 1) % clusters.length;
      pointer = { auto: true };
      setHot(autoI);
    }

    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      lastUser = lastMove = performance.now();
      pointer = { x: x, y: y };
      setHot(nearest(x, y));
      if (hot > -1 && ZT.reduced()) placeTip(x, y);
    });
    hero.addEventListener('pointerleave', function () { pointer = null; setHot(-1); lastUser = performance.now() - 2500; });
    hero.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      var r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      lastUser = performance.now() + 4000;
      var i = nearest(x, y);
      if (i > -1) { pointer = { x: x, y: y }; setHot(i); placeTip(x, y); }
    });
    hero.addEventListener('click', function (e) {
      if (hot < 0 || coarse || (pointer && pointer.auto)) return;
      if (e.target.closest('a, button, input, [data-intro], .hero-title')) return;
      opts.onOpen(clusters[hot].id);
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0 }).observe(hero);
    }
    ZT.on('theme', function () { readColors(); if (ZT.reduced()) still(); });
    ZT.on('motion', function (on) { if (on) { start(); } else { stop(); still(); setHot(-1); } });
    ZT.on('resize', function (e) { if (!e.widthChanged && Math.abs(hero.offsetHeight - H) < 40) return; size(); if (ZT.reduced()) still(); });

    ZT.afterPaint(function () { readColors(); size(); if (ZT.reduced()) still(); });
    return {
      intro: function () {
        if (ZT.reduced()) { still(); return; }
        drawP = 0; drawing = true; start();
      },
      still: still
    };
  };

  /* ======================================================================
     Content-engine simulation
     ====================================================================== */
  var LAYOUTS = {
    wide: {
      w: 640, h: 470, nw: 136, nh: 56,
      nodes: [[96, 120], [320, 120], [544, 120], [544, 290], [320, 290], [96, 290]],
      input: 'M96 26 L96 92',
      edges: ['M164 120 L252 120', 'M388 120 L476 120', 'M544 148 L544 262', 'M476 290 L388 290', 'M252 290 L164 290', 'M96 318 L96 372'],
      loop: 'M516 92 C516 44 348 44 348 92', loopLabel: [432, 40, 'middle'],
      out: [28, 372, 584, 80], inputLabel: [110, 30], score: [532, 176, 'end']
    },
    tall: {
      w: 360, h: 760, nw: 160, nh: 52,
      nodes: [[160, 110], [160, 212], [160, 314], [160, 416], [160, 518], [160, 620]],
      input: 'M160 22 L160 84',
      edges: ['M160 136 L160 186', 'M160 238 L160 288', 'M160 340 L160 390', 'M160 442 L160 492', 'M160 544 L160 594', 'M160 646 L160 672'],
      loop: 'M240 314 C300 314 300 212 240 212', loopLabel: [294, 266, 'start'],
      out: [16, 672, 328, 80], inputLabel: [172, 26], score: [172, 366, 'start']
    }
  };
  var LABELS = ['Keyword map', 'Drafting', 'Quality gate', 'Widgets', 'Link graph', 'CMS publish'];

  ZT.engine = function (opts) {
    var svg = opts.svg, statEls = opts.stats;
    var L = null, nodes = [], segs = {}, pkts = [], stats = { q: 0, d: 0, r: 0, p: 0 }, shown = {};
    var active = 0, visible = false, off = null, spawnT = 0, pageEls = [], pageCount = 0, scoreEl = null, countEl = null, cap = 0, warmed = false;

    function sample(d) {
      var p = mk('path', { d: d }, svg), len = p.getTotalLength(), pts = [];
      for (var i = 0; i <= 40; i++) { var q = p.getPointAtLength(len * i / 40); pts.push([q.x, q.y]); }
      p.remove();
      return { len: len, pts: pts };
    }
    function at(seg, s) {
      var f = clamp(s / seg.len, 0, 1) * 40, i = Math.min(39, Math.floor(f)), t = f - i;
      return [lerp(seg.pts[i][0], seg.pts[i + 1][0], t), lerp(seg.pts[i][1], seg.pts[i + 1][1], t)];
    }
    function build() {
      var wide = svg.parentNode.clientWidth >= 500;
      L = LAYOUTS[wide ? 'wide' : 'tall'];
      svg.textContent = '';
      svg.setAttribute('viewBox', '0 0 ' + L.w + ' ' + L.h);
      svg.style.setProperty('--ar', L.w + '/' + L.h);
      pkts = []; nodes = []; pageEls = []; pageCount = 0;

      mk('path', { d: L.input, 'class': 'e-edge' }, svg);
      text(svg, L.inputLabel[0], L.inputLabel[1], 'Keywords in', { 'class': 'e-tag' });
      L.edges.forEach(function (e) { mk('path', { d: e, 'class': 'e-edge' }, svg); });
      mk('path', { d: L.loop, 'class': 'e-loop' }, svg);
      text(svg, L.loopLabel[0], L.loopLabel[1], L.w < 400 ? 'Rewrite' : 'Rewrite loop', { 'class': 'e-tag', 'text-anchor': L.loopLabel[2], style: 'fill:var(--warn)' });

      L.nodes.forEach(function (n, i) {
        var g = mk('g', { 'class': 'e-node' + (i === 2 ? ' e-gate' : '') }, svg);
        mk('rect', { x: n[0] - L.nw / 2, y: n[1] - L.nh / 2, width: L.nw, height: L.nh, rx: 12 }, g);
        text(g, n[0] - L.nw / 2 + 14, n[1] - 5, '0' + (i + 1), { 'class': 'e-num' });
        text(g, n[0] - L.nw / 2 + 14, n[1] + 12, LABELS[i], { 'class': 'e-lbl' });
        var led = mk('circle', { cx: n[0] + L.nw / 2 - 14, cy: n[1] - 10, r: 3.5, 'class': 'e-led' }, g);
        nodes.push({ g: g, led: led, x: n[0], y: n[1], blink: 0 });
      });
      scoreEl = text(svg, L.score[0], L.score[1], 'gate · waiting', { 'class': 'e-score', 'text-anchor': L.score[2] });

      var o = L.out, og = mk('g', { 'class': 'e-out' }, svg);
      mk('rect', { x: o[0], y: o[1], width: o[2], height: o[3], rx: 14, 'class': 'e-box' }, og);
      text(og, o[0] + 16, o[1] + 22, 'Published', { 'class': 'e-tag' });
      countEl = text(og, o[0] + o[2] - 16, o[1] + 22, '0 pages', { 'class': 'e-tag e-count', 'text-anchor': 'end' });
      var cols = Math.floor((o[2] - 32) / 14);
      cap = cols * 3;
      for (var k = 0; k < cap; k++) {
        pageEls.push(mk('rect', { x: o[0] + 16 + (k % cols) * 14, y: o[1] + 34 + Math.floor(k / cols) * 13, width: 9, height: 9, rx: 2, 'class': 'e-page', opacity: 0 }, og));
      }
      segs = { input: sample(L.input), loop: sample(L.loop), edges: L.edges.map(sample) };
      setStep(active);
      /* Start mid-stream so the first visit already shows traffic and published pages. */
      if (ZT.reduced()) fastForward();
      else if (!warmed) { warmed = true; for (var t = 0; t < 9000; t += 50) step(50, false); }
      renderStats(true);
    }

    function spawn() {
      stats.q++;
      var el = mk('circle', { r: 5, 'class': 'e-pkt' }, svg);
      pkts.push({ el: el, seg: segs.input, next: 0, s: 0, dwell: 0, at: -1, tries: 0, drafted: false, done: false });
    }
    function arrive(p, node) {
      p.at = node; p.dwell = node === 2 ? 520 : 320;
      nodes[node].blink = p.dwell;
      nodes[node].led.setAttribute('class', 'e-led is-blink');
      if (node === 1 && !p.drafted) { p.drafted = true; stats.d++; }
    }
    function leave(p) {
      var n = p.at;
      if (n === 2) {
        var fail = Math.random() < (p.tries ? 0.1 : 0.27);
        var score = fail ? 0.62 + Math.random() * 0.17 : 0.8 + Math.random() * 0.17;
        if (scoreEl) { scoreEl.textContent = 'score ' + score.toFixed(2) + (fail ? ' · rewrite' : ' · pass'); scoreEl.setAttribute('class', 'e-score ' + (fail ? 'is-fail' : 'is-pass')); }
        if (fail) {
          p.tries++; stats.r++;
          nodes[2].led.setAttribute('class', 'e-led is-fail');
          p.el.setAttribute('class', 'e-pkt fail');
          p.seg = segs.loop; p.next = 1;
        } else {
          p.el.setAttribute('class', 'e-pkt pass');
          p.seg = segs.edges[2]; p.next = 3;
        }
      } else if (n === 5) {
        p.seg = segs.edges[5]; p.next = 6;
      } else if (n === 1) {
        p.el.setAttribute('class', 'e-pkt');
        p.seg = segs.edges[1]; p.next = 2;
      } else {
        p.seg = segs.edges[n]; p.next = n + 1;
      }
      p.at = -1; p.s = 0;
    }
    function publish() {
      stats.p++;
      if (pageCount >= cap) { pageEls.forEach(function (e) { e.setAttribute('opacity', 0); }); pageCount = 0; }
      if (pageEls[pageCount]) pageEls[pageCount].setAttribute('opacity', 1);
      pageCount++;
    }
    function step(dt, render) {
      spawnT -= dt;
      if (spawnT <= 0 && pkts.length < 12) { spawn(); spawnT = 820 + Math.random() * 380; }
      for (var i = pkts.length - 1; i >= 0; i--) {
        var p = pkts[i];
        if (p.at > -1) {
          p.dwell -= dt;
          if (p.dwell <= 0) leave(p);
        } else {
          p.s += dt * 0.16;
          if (p.s >= p.seg.len) {
            if (p.next === 6) { publish(); p.el.remove(); pkts.splice(i, 1); continue; }
            arrive(p, p.next);
          }
        }
        if (render) {
          var pos = p.at > -1 ? [nodes[p.at].x, nodes[p.at].y + (p.at === 2 ? 0 : 0)] : at(p.seg, p.s);
          p.el.setAttribute('cx', pos[0].toFixed(1)); p.el.setAttribute('cy', pos[1].toFixed(1));
          p.el.setAttribute('opacity', p.at > -1 ? 0 : 1);
        }
      }
      nodes.forEach(function (n) {
        if (n.blink > 0) { n.blink -= dt; if (n.blink <= 0) n.led.setAttribute('class', 'e-led'); }
      });
    }
    function renderStats(force) {
      ['q', 'd', 'r', 'p'].forEach(function (k) {
        if (force || shown[k] !== stats[k]) { shown[k] = stats[k]; if (statEls[k]) statEls[k].textContent = stats[k].toLocaleString('en-US'); }
      });
      if (countEl) countEl.textContent = stats.p + (stats.p === 1 ? ' page' : ' pages');
    }
    function fastForward() {
      for (var t = 0; t < 60000; t += 50) step(50, false);
      pkts.forEach(function (p) { p.el.remove(); });
      pkts = [];
      nodes.forEach(function (n) { n.led.setAttribute('class', 'e-led'); n.blink = 0; });
    }
    function frame(t, dt) { step(dt, true); renderStats(false); }
    function start() { if (!off && visible && !ZT.reduced()) off = ZT.tick(frame); }
    function stop() { if (off) { off(); off = null; } }
    function setStep(i) {
      active = i;
      nodes.forEach(function (n, k) { n.g.classList.toggle('is-hot', k === i); });
    }

    var built = false, lastWide = null;
    function ensure() {
      if (built) return;
      built = true;
      lastWide = svg.parentNode.clientWidth >= 500;
      build();
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) ensure();
      }, { rootMargin: '100% 0px' }).observe(svg);
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { ensure(); start(); } else stop(); }, { threshold: 0 }).observe(svg);
    } else { visible = true; ZT.afterPaint(ensure); }
    ZT.on('resize', function () {
      if (!built) return;
      var wide = svg.parentNode.clientWidth >= 500;
      if (wide !== lastWide) { lastWide = wide; build(); }
    });
    ZT.on('motion', function (on) { if (!built) return; if (on) start(); else { stop(); fastForward(); renderStats(true); } });
    return { setStep: setStep };
  };
})();
