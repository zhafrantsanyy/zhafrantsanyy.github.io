/* ==========================================================================
   motion.js · a small motion toolkit for the portfolio
   One rAF ticker, scroll state (Lenis when available), text splitting,
   reveals, odometers, marquee, parallax and scroll-linked scenes.
   Everything degrades: without JS the page is fully readable, and with
   reduced motion (system or on-page toggle) nothing moves on its own.
   ========================================================================== */
(function () {
  'use strict';

  var ZT = window.ZT = window.ZT || {};
  var root = document.documentElement;

  /* ---------- utilities ---------- */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  ZT.$ = $; ZT.$$ = $$; ZT.clamp = clamp; ZT.lerp = lerp;

  var mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  ZT.finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  ZT.reduced = function () { return root.classList.contains('rm'); };
  ZT.sysReduced = function () { return mqReduced.matches; };

  /* tiny event bus: 'theme', 'motion', 'resize' */
  var bus = {};
  ZT.on = function (name, fn) { (bus[name] = bus[name] || []).push(fn); };
  ZT.emit = function (name, data) { (bus[name] || []).forEach(function (fn) { fn(data); }); };

  /* Run after the first paint, when layout is already computed (no forced reflow). */
  ZT.afterPaint = function (fn) { requestAnimationFrame(function () { setTimeout(fn, 0); }); };

  /* ---------- viewport ---------- */
  ZT.vw = window.innerWidth;
  ZT.vh = window.innerHeight;
  ZT.docH = root.scrollHeight;

  /* ---------- ticker ---------- */
  var subs = [], running = false, last = 0;
  function loop(t) {
    var dt = last ? Math.min(64, t - last) : 16.67;
    last = t;
    var list = subs.slice();
    for (var i = 0; i < list.length; i++) list[i](t, dt);
    if (subs.length) requestAnimationFrame(loop);
    else { running = false; last = 0; }
  }
  /* Subscribe a per-frame callback. Returns an unsubscribe function. */
  ZT.tick = function (fn) {
    if (subs.indexOf(fn) === -1) subs.push(fn);
    if (!running) { running = true; requestAnimationFrame(loop); }
    return function () { var i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); };
  };

  /* ---------- scroll state ---------- */
  var scroll = ZT.scroll = { y: window.scrollY, vel: 0, dir: 1 };
  var scrollFns = [], lastY = -1, prevY = window.scrollY, force = true, idle = 0;
  /* fn(y) runs every frame the scroll position changes. It should only measure; if it
     needs to change the page it returns a function, and those run after all measuring
     is done, so a frame never interleaves layout reads with writes. */
  ZT.onScroll = function (fn) { scrollFns.push(fn); force = true; wake(); };
  ZT.refreshScroll = function () { force = true; wake(); };

  function scrollFrame(t, dt) {
    if (ZT.lenis) ZT.lenis.raf(t);
    var y = window.scrollY || root.scrollTop || 0;
    var v = (y - prevY) / Math.max(dt, 1) * 16.67;
    prevY = y;
    scroll.vel = lerp(scroll.vel, v, 0.18);
    if (Math.abs(scroll.vel) < 0.01) scroll.vel = 0;
    if (y !== lastY || force) {
      if (y > lastY + 0.5) scroll.dir = 1; else if (y < lastY - 0.5) scroll.dir = -1;
      scroll.y = y; lastY = y; force = false; idle = 0;
      var writes = [];
      for (var i = 0; i < scrollFns.length; i++) { var w = scrollFns[i](y); if (w) writes.push(w); }
      for (var j = 0; j < writes.length; j++) writes[j]();
    } else if (!ZT.lenis && scroll.vel === 0 && ++idle > 90) {
      /* Native scrolling and nothing moving: let the ticker sleep until the next scroll. */
      stopScroll(); stopScroll = null;
    }
  }
  var stopScroll = null;
  function wake() { if (!stopScroll) { idle = 0; stopScroll = ZT.tick(scrollFrame); } }
  window.addEventListener('scroll', wake, { passive: true });
  wake();

  /* Lenis smooth scrolling: fine pointers only, never with reduced motion. */
  ZT.startSmooth = function () {
    if (ZT.lenis || !window.Lenis || ZT.reduced() || !ZT.finePointer) return;
    try {
      ZT.lenis = new window.Lenis({ lerp: 0.105, wheelMultiplier: 1, autoRaf: false, anchors: false });
      wake();
    } catch (e) { ZT.lenis = null; }
  };
  ZT.stopSmooth = function () { if (ZT.lenis) { ZT.lenis.destroy(); ZT.lenis = null; } };
  ZT.lockScroll = function (on) {
    if (ZT.lenis) { if (on) ZT.lenis.stop(); else ZT.lenis.start(); }
    root.style.overflow = on ? 'hidden' : '';
  };

  /* Smooth scroll to an element (optionally offset) or to a y position. */
  ZT.scrollTo = function (target, opts) {
    opts = opts || {};
    var y = typeof target === 'number' ? target
      : target.getBoundingClientRect().top + window.scrollY - (opts.offset || 0);
    y = clamp(y, 0, root.scrollHeight - ZT.vh);
    if (ZT.lenis && !opts.instant) {
      ZT.lenis.scrollTo(y, { duration: opts.duration || clamp(Math.abs(y - window.scrollY) / 1800, 0.9, 1.8), easing: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; } });
    } else {
      window.scrollTo({ top: y, behavior: opts.instant || ZT.reduced() ? 'auto' : 'smooth' });
    }
  };

  /* ---------- resize ---------- */
  var rT = null, lastW = ZT.vw;
  window.addEventListener('resize', function () {
    clearTimeout(rT);
    rT = setTimeout(function () {
      var w = window.innerWidth, h = window.innerHeight;
      /* Mobile URL bars change the height while scrolling; only react to real resizes. */
      var widthChanged = w !== lastW;
      if (!widthChanged && Math.abs(h - ZT.vh) < 120) { ZT.vh = h; ZT.refreshScroll(); return; }
      lastW = w; ZT.vw = w; ZT.vh = h;
      ZT.refresh();
      ZT.emit('resize', { widthChanged: widthChanged });
    }, 160);
  });
  ZT.refresh = function () {
    ZT.docH = root.scrollHeight;
    if (ZT.lenis) ZT.lenis.resize();
    ZT.refreshScroll();
  };

  /* ---------- text splitting ---------- */
  function wrapWord(text, cls, innerCls, idx) {
    var w = document.createElement('span');
    w.className = cls;
    if (innerCls) {
      var wi = document.createElement('span');
      wi.className = innerCls;
      wi.textContent = text;
      wi.style.setProperty('--i', idx);
      w.appendChild(wi);
    } else {
      w.textContent = text;
      w.style.setProperty('--i', idx);
    }
    return w;
  }
  /* Split every word of an element (nested inline elements are preserved) into
     masked spans. Word-level only, so screen readers still read whole words. */
  ZT.split = function (el, mode) {
    if (el.__split) return el.__split;
    var outer = mode === 'lit' ? 'lw' : 'w', inner = mode === 'lit' ? null : 'wi';
    var idx = 0, words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var w = wrapWord(p, outer, inner, idx++);
            words.push(w); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          if (n.classList.contains('face') && inner) {
            /* the inline portrait pill rises with the words */
            var w = document.createElement('span'), wi = document.createElement('span');
            w.className = outer; wi.className = inner; wi.style.setProperty('--i', idx++);
            n.parentNode.replaceChild(w, n); wi.appendChild(n); w.appendChild(wi);
            words.push(w);
          } else if (!/^(IMG|SVG|BR)$/i.test(n.tagName)) {
            walk(n);
          }
        }
      });
    })(el);
    el.style.setProperty('--n', idx);
    /* Words inside an accent <em> each take the next slice of one gradient,
       so the phrase reads as a single sweep even while the words animate apart. */
    Array.prototype.forEach.call(el.querySelectorAll('em'), function (em) {
      var ws = em.querySelectorAll('.' + outer), n = ws.length;
      Array.prototype.forEach.call(ws, function (w, k) {
        w.style.setProperty('--g0', (k / n * 100).toFixed(1) + '%');
        w.style.setProperty('--g1', ((k + 1) / n * 100).toFixed(1) + '%');
      });
    });
    el.__split = words;
    return words;
  };

  /* ---------- reveals ---------- */
  var batch = 0, batchT = null;
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      io.unobserve(el);
      /* Elements entering together get a small automatic stagger. */
      if (!el.hasAttribute('data-split') && !el.style.getPropertyValue('--d')) el.style.setProperty('--d', (batch * 0.08).toFixed(2) + 's');
      batch++;
      clearTimeout(batchT); batchT = setTimeout(function () { batch = 0; }, 60);
      el.classList.add('is-in');
      if (el.__onIn) el.__onIn(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 }) : null;

  ZT.observe = function (el, cb) {
    if (cb) el.__onIn = cb;
    if (io) io.observe(el);
    else { el.classList.add('is-in'); if (cb) cb(el); }
  };

  /* Scroll-lit statement: words light up as the block scrolls through the viewport. */
  ZT.lit = function (el) {
    var words = [];
    Array.prototype.slice.call(el.children).forEach(function (child) { words = words.concat(ZT.split(child, 'lit')); });
    var n = words.length, k = 0;
    function apply(target) {
      return function () {
        var a = Math.min(k, target), b = Math.max(k, target);
        for (var i = a; i < b; i++) words[i].classList.toggle('on', i < target);
        k = target;
      };
    }
    function update() {
      if (ZT.reduced()) return k !== n ? apply(n) : null;
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > ZT.vh + 200) return null;
      var start = ZT.vh * 0.9, end = ZT.vh * 0.35;
      var target = Math.round(clamp((start - r.top) / (start - end + r.height * 0.6), 0, 1) * n);
      return target === k ? null : apply(target);
    }
    ZT.onScroll(update);
    ZT.on('motion', function () { var w = update(); if (w) w(); });
  };

  /* ---------- odometers ---------- */
  ZT.odo = function (el) {
    if (el.__odo) return el.__odo;
    var txt = el.textContent.trim();
    el.textContent = '';
    var sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = txt;
    var vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true'); vis.style.display = 'contents';
    el.appendChild(sr); el.appendChild(vis);
    var strips = [], digitCount = txt.replace(/\D/g, '').length, di = 0;
    txt.split('').forEach(function (ch) {
      if (/\d/.test(ch)) {
        var c = document.createElement('span'); c.className = 'odo-c';
        var s = document.createElement('span'); s.className = 'odo-s';
        for (var k = 0; k <= 10 + (+ch); k++) { var d = document.createElement('span'); d.textContent = k % 10; s.appendChild(d); }
        s.style.setProperty('--d', ((digitCount - di) * 0.07).toFixed(2) + 's');
        c.appendChild(s); vis.appendChild(c);
        strips.push({ s: s, d: +ch, i: di++ });
      } else {
        var x = document.createElement('span'); x.className = 'odo-x'; x.textContent = ch;
        vis.appendChild(x);
      }
    });
    var api = {
      run: function () {
        strips.forEach(function (o) { o.s.style.transform = 'translate3d(0,' + (-(10 + o.d) * 1.1) + 'em,0)'; });
      }
    };
    el.__odo = api;
    return api;
  };

  /* ---------- magnetic ---------- */
  ZT.magnetic = function (el) {
    var s = parseFloat(el.getAttribute('data-magnetic')) || 0.28;
    var x = 0, y = 0, tx = 0, ty = 0, off = null;
    function step() {
      x = lerp(x, tx, 0.16); y = lerp(y, ty, 0.16);
      el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
      if (!tx && !ty && Math.abs(x) < 0.08 && Math.abs(y) < 0.08) { el.style.transform = ''; if (off) off(); off = null; }
    }
    el.addEventListener('pointermove', function (e) {
      if (ZT.reduced()) return;
      var r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * s;
      ty = (e.clientY - (r.top + r.height / 2)) * s * 1.2;
      if (!off) off = ZT.tick(step);
    });
    el.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!off) off = ZT.tick(step); });
  };

  /* ---------- marquee ---------- */
  ZT.marquee = function (row) {
    var dir = parseFloat(row.getAttribute('data-marquee')) || 1;
    var track = row.querySelector('.mq-track');
    var w = 0, x = 0, visible = false;
    function build() {
      $$('.mq-track', row).slice(1).forEach(function (n) { n.remove(); });
      w = track.getBoundingClientRect().width;
      var copies = Math.max(2, Math.ceil((ZT.vw * 1.5) / Math.max(w, 1)) + 1);
      for (var i = 1; i < copies; i++) row.appendChild(track.cloneNode(true));
      x = dir > 0 ? 0 : -w;
    }
    ZT.afterPaint(build);
    ZT.on('resize', function (e) { if (e.widthChanged) build(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ZT.afterPaint(build); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(row);
    ZT.tick(function (t, dt) {
      if (!visible || ZT.reduced() || !w) return;
      var boost = clamp(Math.abs(scroll.vel) * 0.35, 0, 14);
      var v = (0.55 + boost) * (dt / 16.67) * dir * scroll.dir;
      x -= v;
      if (x <= -w) x += w; else if (x > 0) x -= w;
      row.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0) skewX(' + clamp(-scroll.vel * 0.06 * dir, -6, 6).toFixed(2) + 'deg)';
    });
  };

  /* ---------- parallax (image inside a clipped frame) ---------- */
  ZT.parallax = function (img) {
    var frame = img.closest('.portrait-frame') || img.parentNode;
    ZT.onScroll(function () {
      if (ZT.reduced()) return function () { img.style.transform = ''; };
      var r = frame.getBoundingClientRect();
      if (r.bottom < -50 || r.top > ZT.vh + 50) return null;
      var p = clamp((r.top + r.height / 2 - ZT.vh / 2) / (ZT.vh / 2 + r.height / 2), -1, 1);
      var v = 'translate3d(0,' + (p * r.height * 0.075).toFixed(2) + 'px,0)';
      return function () { img.style.transform = v; };
    });
  };

  /* ---------- stacking cards ---------- */
  ZT.stack = function (cards) {
    var desk = window.matchMedia('(min-width: 1024px)');
    cards.forEach(function (c, i) { c.style.setProperty('--ci', i); });
    var inner = cards.map(function (c) { return c.firstElementChild; });
    var cur = cards.map(function () { return 0; });
    var hdr = 72, off = false;
    function measureHdr() { hdr = parseFloat(getComputedStyle(root).getPropertyValue('--hdr-h')) || 72; }
    ZT.afterPaint(measureHdr);
    ZT.on('resize', measureHdr);
    function update() {
      if (!desk.matches || ZT.reduced()) {
        if (off) return null;
        return function () { off = true; inner.forEach(function (n) { n.style.removeProperty('--cs'); n.style.removeProperty('--co'); }); };
      }
      var first = cards[0].getBoundingClientRect(), last = cards[cards.length - 1].getBoundingClientRect();
      if (last.bottom < -100 || first.top > ZT.vh + 100) return null;
      var prog = cards.map(function (c, i) {
        if (i === 0) return 0;
        return clamp((ZT.vh - c.getBoundingClientRect().top) / (ZT.vh - (hdr + 20 + i * 16)), 0, 1);
      });
      return function () {
        off = false;
        for (var i = 0; i < cards.length; i++) {
          var depth = 0;
          for (var j = i + 1; j < cards.length; j++) depth += prog[j];
          if (Math.abs(depth - cur[i]) < 0.0005) continue;
          cur[i] = depth;
          inner[i].style.setProperty('--cs', (1 - depth * 0.04).toFixed(4));
          inner[i].style.setProperty('--co', Math.min(0.55, depth * 0.22).toFixed(3));
        }
      };
    }
    ZT.onScroll(update);
    ZT.on('motion', function () { var w = update(); if (w) w(); });
  };

  /* ---------- footer wordmark ---------- */
  ZT.footerWord = function (el) {
    var words = el.textContent.trim().split(/\s+/), last = words.length - 1;
    el.textContent = '';
    words.forEach(function (word, wi) {
      if (wi) el.appendChild(document.createTextNode(' '));
      word.split('').forEach(function (ch, ci) {
        var s = document.createElement('span');
        s.className = 'fc'; s.textContent = ch;
        s.style.setProperty('--k', (0.55 + Math.random() * 1.1).toFixed(2));
        /* the surname is the accent: serif italic with the gradient, one slice per letter */
        if (wi === last && last > 0) {
          s.classList.add('fc-acc');
          s.style.setProperty('--g0', (ci / word.length * 100).toFixed(1) + '%');
          s.style.setProperty('--g1', ((ci + 1) / word.length * 100).toFixed(1) + '%');
        }
        el.appendChild(s);
      });
    });
    var cur = 0;
    ZT.onScroll(function () {
      var r = el.getBoundingClientRect();
      var p = r.top > ZT.vh + 100 ? 0 : clamp((ZT.vh - r.top) / r.height, 0, 1);
      if (Math.abs(p - cur) <= 0.002 && !(p === 0 && cur !== 0)) return null;
      return function () { el.style.setProperty('--fp', p.toFixed(3)); cur = p; };
    });
  };

  /* ---------- rolling button labels ---------- */
  ZT.roll = function (el) {
    if (el.querySelector('.roll-in')) return;
    var s = document.createElement('span'); s.className = 'roll-in';
    while (el.firstChild) s.appendChild(el.firstChild);
    el.appendChild(s);
  };
})();
