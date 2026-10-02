/* ==========================================================================
   app.js · wires the page together
   Theme, motion toggle, menu, hero intro, case studies (hover preview and
   dialog), the engine scene, experience, scroll spy and the search palette.
   ========================================================================== */
(function () {
  'use strict';

  var ZT = window.ZT;
  if (!ZT) return;
  window.__zt = true;

  var $ = ZT.$, $$ = ZT.$$, clamp = ZT.clamp;
  var root = document.documentElement;
  function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.error('[portfolio] ' + name, e); } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function stored(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function isTyping(el) { return !!(el && el.closest && el.closest('input, textarea, select, [contenteditable="true"]')); }
  function afterFrames(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }

  var state = { menu: false };

  /* ---------- small things ---------- */
  safe('labels', function () {
    var mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
    $$('[data-kbd]').forEach(function (k) { k.textContent = mac ? '⌘K' : 'Ctrl K'; });
    $$('[data-year]').forEach(function (y) { y.textContent = new Date().getFullYear(); });
  });

  safe('clock', function () {
    var fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
    function tick() {
      var now = new Date(), s = fmt.format(now);
      $$('[data-clock]').forEach(function (t) { t.textContent = s; t.setAttribute('datetime', now.toISOString()); });
    }
    tick();
    setInterval(tick, 15000);
  });

  var toastEl = $('#toast'), toastT = null;
  ZT.toast = function (msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  };

  /* ---------- theme ---------- */
  var metaTheme = $('meta[name="theme-color"]');
  function themeLabels() {
    var light = root.getAttribute('data-theme') === 'light';
    $$('[data-theme-toggle]').forEach(function (b) {
      var l = light ? 'Switch to dark theme' : 'Switch to light theme';
      b.setAttribute('aria-label', l); b.title = l;
    });
  }
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (metaTheme) metaTheme.setAttribute('content', t === 'light' ? '#F2F4F8' : '#0A0C12');
    themeLabels();
    ZT.emit('theme', t);
  }
  function setTheme(t, origin) {
    store('zt-theme', t);
    root.classList.add('no-tr');
    var done = function () { afterFrames(function () { root.classList.remove('no-tr'); }); };
    if (!document.startViewTransition || ZT.reduced()) { applyTheme(t); done(); return; }
    var x = origin ? origin.x : ZT.vw - 40, y = origin ? origin.y : 36;
    var vt = document.startViewTransition(function () { applyTheme(t); });
    vt.ready.then(function () {
      var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 820, easing: 'cubic-bezier(.76,0,.24,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
    vt.finished.then(done, done);
  }
  function toggleTheme(origin) { setTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', origin); }
  safe('theme', function () {
    themeLabels();
    $$('[data-theme-toggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = b.getBoundingClientRect();
        toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      });
    });
    var mql = window.matchMedia('(prefers-color-scheme: light)');
    var onChange = function (e) { if (!stored('zt-theme')) applyTheme(e.matches ? 'light' : 'dark'); };
    if (mql.addEventListener) mql.addEventListener('change', onChange);
  });

  /* ---------- motion toggle ---------- */
  function motionLabels() {
    var on = !ZT.reduced();
    $$('[data-motion-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(!on));
      var l = on ? 'Pause animations' : 'Play animations';
      b.setAttribute('aria-label', l); b.title = l;
    });
  }
  function setMotion(on) {
    root.classList.toggle('rm', !on);
    if (on) root.removeAttribute('data-motion'); else root.setAttribute('data-motion', 'off');
    store('zt-motion', on ? 'on' : 'off');
    motionLabels();
    if (on) ZT.startSmooth(); else ZT.stopSmooth();
    ZT.emit('motion', on);
    ZT.refresh();
  }
  safe('motion', function () {
    motionLabels();
    $$('[data-motion-toggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        setMotion(ZT.reduced());
        ZT.toast(ZT.reduced() ? 'Animations paused' : 'Animations on');
      });
    });
    ZT.startSmooth();
  });

  /* ---------- header + progress ---------- */
  safe('header', function () {
    var hdr = $('#hdr'), bar = $('#progress'), anchorY = 0, focused = false;
    hdr.addEventListener('focusin', function () { focused = true; hdr.classList.remove('is-hidden'); });
    hdr.addEventListener('focusout', function () { focused = false; });
    ZT.onScroll(function (y) {
      return function () {
        hdr.classList.toggle('is-scrolled', y > 24);
        var max = ZT.docH - ZT.vh;
        bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ')';
        if (state.menu || focused || y < ZT.vh * 0.6) { hdr.classList.remove('is-hidden'); anchorY = y; return; }
        if (Math.abs(y - anchorY) > 14) { hdr.classList.toggle('is-hidden', y > anchorY); anchorY = y; }
      };
    });
  });

  /* ---------- mobile menu ---------- */
  var menu = $('#menu'), menuBtn = $('#menuBtn');
  function setMenu(open) {
    if (!menu || open === state.menu) return;
    state.menu = open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('#main').inert = open;
    $('.ftr').inert = open;
    if (open) {
      menu.hidden = false;
      ZT.lockScroll(true);
      afterFrames(function () { menu.classList.add('is-open'); });
      $('#hdr').classList.remove('is-hidden');
    } else {
      menu.classList.remove('is-open');
      ZT.lockScroll(false);
      setTimeout(function () { if (!state.menu) menu.hidden = true; }, ZT.reduced() ? 0 : 800);
    }
  }
  safe('menu', function () {
    $$('.menu-nav a').forEach(function (a, i) { a.style.setProperty('--i', i); });
    menuBtn.addEventListener('click', function () { setMenu(!state.menu); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a[href^="#"]')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.menu) { setMenu(false); menuBtn.focus(); }
    });
    ZT.on('resize', function () { if (state.menu && ZT.vw >= 1024) setMenu(false); });
  });

  /* ---------- text, reveals and small motion ---------- */
  safe('reveals', function () {
    $$('[data-split]').forEach(function (el) {
      ZT.split(el);
      if (!el.closest('.hero')) ZT.observe(el);
    });
    $$('[data-reveal]').forEach(function (el) { ZT.observe(el); });
    $$('[data-stagger]').forEach(function (el) {
      Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty('--d', (i * 0.07).toFixed(2) + 's'); });
      ZT.observe(el);
    });
    $$('[data-lit]').forEach(ZT.lit);
    $$('[data-roll]').forEach(ZT.roll);
  });
  safe('odometers', function () {
    $$('[data-odo]').forEach(function (el) {
      if (el.closest('.hero')) { ZT.odo(el); return; }
      ZT.observe(el, function () { var o = ZT.odo(el); afterFrames(o.run); });
    });
  });
  safe('magnetic', function () { if (ZT.finePointer) $$('[data-magnetic]').forEach(ZT.magnetic); });
  safe('marquee', function () { $$('[data-marquee]').forEach(ZT.marquee); });
  safe('parallax', function () { $$('[data-parallax]').forEach(ZT.parallax); });
  safe('stack', function () { ZT.stack($$('.card')); });
  safe('footer', function () { var f = $('[data-footer-word]'); if (f) ZT.footerWord(f); });
  safe('caps', function () {
    $$('.cap').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  });
  safe('art', function () {
    $$('[data-art]').forEach(function (box) {
      var name = box.getAttribute('data-art'), wrap = null;
      ZT.observe(box, function () { wrap = ZT.renderViz(box, name); ZT.playViz(wrap, 120); });
      ZT.on('resize', function (e) {
        if (!wrap || !e.widthChanged) return;
        wrap = ZT.renderViz(box, name);
        if (wrap) wrap.classList.add('is-on');
      });
    });
  });

  /* ---------- case studies ---------- */
  var CASES = $$('.case').map(function (li, i) {
    return {
      id: li.getAttribute('data-case'), i: i, el: li,
      row: li.querySelector('.case-row'), body: li.querySelector('.case-body'),
      name: li.querySelector('.case-name').textContent.replace(/\s+/g, ' ').trim(),
      sector: li.querySelector('.case-sector').textContent.trim(),
      metric: li.querySelector('.case-metric').textContent.trim()
    };
  });
  function caseById(id) { for (var i = 0; i < CASES.length; i++) if (CASES[i].id === id) return CASES[i]; return null; }

  var dlg = $('#caseDialog'), cdContent = $('#cdContent'), panel = dlg && dlg.querySelector('.cd-panel');
  var current = null, lastTrigger = null, closing = false, caseViz = null;
  /* True only while the open dialog owns a history entry this page pushed, so closing
     never steps back past the site (for example after arriving on a #case- deep link). */
  var pushed = false;
  var preview = { hide: function () {} };

  function fillCase(c) {
    cdContent.textContent = '';
    var clone = c.body.cloneNode(true);
    Array.prototype.slice.call(clone.children).forEach(function (ch, i) {
      ch.style.setProperty('--d', (0.06 + i * 0.07).toFixed(2) + 's');
      cdContent.appendChild(ch);
    });
    var title = cdContent.querySelector('.case-title');
    if (title) title.id = 'cdTitle';
    $('#cdIdx').textContent = String(c.i + 1).padStart(2, '0');
    $('#cdMoreName').textContent = CASES[(c.i + 1) % CASES.length].name;
    current = c;
  }
  function renderCaseViz(animate) {
    var box = cdContent.querySelector('.case-visual');
    if (!box) return;
    caseViz = ZT.renderViz(box, box.getAttribute('data-visual'), { interactive: true });
    if (!caseViz) return;
    if (animate === false) caseViz.classList.add('is-on');
    else ZT.playViz(caseViz, ZT.reduced() ? 0 : 380);
  }
  function openCase(id, opts) {
    opts = opts || {};
    var c = caseById(id);
    if (!c || !dlg) return;
    if (dlg.open) {
      if (current && current.id === c.id) return;
      swapCase(c);
      if (opts.push !== false) history.replaceState({ zcase: c.id }, '', '#case-' + c.id);
      return;
    }
    lastTrigger = opts.trigger || (document.activeElement !== document.body ? document.activeElement : null);
    preview.hide();
    if (state.menu) setMenu(false);
    fillCase(c);
    dlg.showModal();
    ZT.lockScroll(true);
    panel.scrollTop = 0;
    $('#cdClose').focus({ preventScroll: true });
    afterFrames(function () {
      dlg.classList.add('is-open');
      setTimeout(function () { cdContent.classList.add('is-in'); renderCaseViz(); }, ZT.reduced() ? 0 : 260);
    });
    if (opts.push !== false) { history.pushState({ zcase: c.id }, '', '#case-' + c.id); pushed = true; }
    else pushed = false;
  }
  function swapCase(c) {
    cdContent.classList.add('is-out');
    cdContent.classList.remove('is-in');
    setTimeout(function () {
      fillCase(c);
      panel.scrollTop = 0;
      cdContent.classList.remove('is-out');
      afterFrames(function () { cdContent.classList.add('is-in'); renderCaseViz(); });
    }, ZT.reduced() ? 0 : 280);
  }
  function closeCase(fromHistory, onClosed) {
    if (!dlg || !dlg.open || closing) return;
    closing = true;
    dlg.classList.remove('is-open');
    cdContent.classList.remove('is-in');
    setTimeout(function () {
      dlg.close();
      closing = false;
      cdContent.textContent = '';
      current = null;
      if (!pal || !pal.open) ZT.lockScroll(false);
      if (onClosed) onClosed();
      else if (lastTrigger && lastTrigger.focus && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
    }, ZT.reduced() ? 0 : 720);
    if (!fromHistory) {
      if (pushed) history.back();
      else history.replaceState(null, '', location.pathname + location.search);
    }
    pushed = false;
  }
  function stepCase(dir) {
    if (!current) return;
    openCase(CASES[(current.i + dir + CASES.length) % CASES.length].id);
  }
  ZT.openCase = openCase;

  safe('cases', function () {
    if (!dlg) return;
    CASES.forEach(function (c) {
      c.row.addEventListener('click', function () { openCase(c.id, { trigger: c.row }); });
    });
    $('#cdClose').addEventListener('click', function () { closeCase(); });
    $('#cdPrev').addEventListener('click', function () { stepCase(-1); });
    $('#cdNext').addEventListener('click', function () { stepCase(1); });
    $('#cdMore').addEventListener('click', function () { stepCase(1); });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeCase(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeCase(); });
    dlg.addEventListener('keydown', function (e) {
      if (isTyping(e.target)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stepCase(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepCase(-1); }
    });
    window.addEventListener('popstate', function (e) {
      var id = e.state && e.state.zcase;
      if (id) openCase(id, { push: false });
      else if (dlg.open) closeCase(true);
    });
    ZT.on('resize', function (e) { if (dlg.open && e.widthChanged) renderCaseViz(false); });
  });

  /* Hover preview that follows the cursor across the case list. */
  safe('preview', function () {
    var pv = $('#pv'), reel = $('#pvReel'), list = $('#cases');
    if (!pv || !list || !ZT.finePointer) return;
    var PRIMARY = { trading: 1, tembuni: 1, traveloka: 1, hashmicro: 0, property: 0, agriculture: 0, agency: 0, simakara: 2 };
    var slides = CASES.map(function (c) {
      var sl = document.createElement('div');
      sl.className = 'pv-slide';
      var box = document.createElement('div'); box.className = 'viz-box'; box.style.flex = '1'; box.style.minHeight = '0';
      var p = document.createElement('p'), b = document.createElement('b'), s = document.createElement('span');
      var outs = c.body.querySelectorAll('.outcomes > div'), o = outs[PRIMARY[c.id] || 0] || outs[0];
      b.textContent = o ? o.querySelector('dd').textContent : c.name;
      s.textContent = o ? o.querySelector('dt').textContent : c.metric;
      p.appendChild(b); p.appendChild(s); sl.appendChild(box); sl.appendChild(p);
      reel.appendChild(sl);
      return { el: sl, box: box, id: c.id, viz: null };
    });
    var built = false, on = false, idx = -1, px = 0, py = 0, tx = 0, ty = 0, rot = 0, off = null, mx = 0, my = 0;
    function build() {
      if (built) return;
      built = true;
      slides.forEach(function (s) { s.viz = ZT.renderViz(s.box, s.id); });
    }
    function setIdx(i) {
      if (i === idx || i < 0) return;
      idx = i;
      reel.style.transform = 'translate3d(0,' + (-100 * i) + '%,0)';
      var v = slides[i].viz;
      if (v) { v.classList.remove('is-on'); void v.offsetWidth; ZT.playViz(v, 90); }
    }
    function follow(t, dt) {
      var k = 1 - Math.pow(0.82, dt / 16.67), vx = tx - px;
      px += vx * k; py += (ty - py) * k;
      rot += (clamp(vx * 0.04, -6, 6) - rot) * 0.12;
      pv.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
      if (!on && Math.abs(vx) < 0.3) { off(); off = null; }
    }
    function target(x, y) {
      var w = pv.offsetWidth || 380, h = 270;
      tx = x + 30; ty = y - h / 2;
      if (tx + w > ZT.vw - 12) tx = x - w - 30;
      ty = clamp(ty, 80, ZT.vh - h - 16);
    }
    function show() {
      if (on || ZT.reduced()) return;
      build();
      on = true;
      px = tx; py = ty;
      pv.classList.add('is-on');
      if (!off) off = ZT.tick(follow);
    }
    function hide() {
      if (!on) return;
      on = false;
      pv.classList.remove('is-on');
    }
    preview.hide = hide;
    function rowAt(x, y) {
      var el = document.elementFromPoint(x, y), li = el && el.closest && el.closest('.case');
      return li ? CASES.indexOf(caseById(li.getAttribute('data-case'))) : -1;
    }
    list.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      target(mx, my);
      var i = rowAt(mx, my);
      if (i < 0) { hide(); return; }
      show();
      setIdx(i);
    });
    list.addEventListener('pointerleave', hide);
    ZT.onScroll(function () {
      if (!on) return null;
      var i = rowAt(mx, my);
      return function () { if (i < 0) hide(); else setIdx(i); };
    });
  });

  /* ---------- hero ---------- */
  var tracker = null;
  safe('hero', function () {
    tracker = ZT.rankTracker({
      canvas: $('#rankCanvas'), hero: $('.hero'), tip: $('#rankTip'),
      clusters: [
        { id: 'simakara', k: 'Registration queries', client: 'SIMAKARA', m: '6.2K clicks · 3.6% CTR' },
        { id: 'agriculture', k: 'Varietal avocado long-tail', client: 'Avocado grower', m: '280+ keywords managed' },
        { id: 'tembuni', k: 'Pregnancy & labour questions', client: 'Tembuni', m: '432K impressions, month one' },
        { id: 'property', k: 'Room layouts & rental templates', client: 'Property platform', m: '40.7K clicks in 12 months' },
        { id: 'agency', k: 'Commodity price queries', client: 'Commodity-data platform', m: '10K+ monthly traffic' },
        { id: 'agency', k: 'Seasonal F&B campaigns', client: 'Restaurant chain', m: '10K keywords ranked' },
        { id: 'trading', k: 'Instrument & market pages', client: 'Trading platform', m: 'Every article quality-gated' },
        { id: 'traveloka', k: 'Destination guides', client: 'Traveloka', m: 'SG · AU · VN · PH' },
        { id: 'hashmicro', k: 'ERP software guides', client: 'HashMicro', m: '~1M visitors, +23% a quarter' }
      ],
      onOpen: function (id) { openCase(id); }
    });
  });

  /* ---------- engine ---------- */
  safe('engine', function () {
    var sec = $('#engine'), track = $('#engineTrack'), steps = $$('#steps .step'), list = $('#steps');
    var sim = ZT.engine({ svg: $('#engineSvg'), stats: { q: $('[data-es="q"]'), d: $('[data-es="d"]'), r: $('[data-es="r"]'), p: $('[data-es="p"]') } });
    var pinMQ = window.matchMedia('(min-width: 1024px) and (min-height: 700px)');
    var pinned = false, cur = -1, picked = 0, visible = false;
    function setStep(i) {
      if (i === cur) return;
      cur = i;
      steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      list.style.setProperty('--sp', ((i + 1) / steps.length).toFixed(3));
      sim.setStep(i);
    }
    function updatePin() {
      var should = pinMQ.matches && !ZT.reduced();
      if (should === pinned) return;
      pinned = should;
      sec.classList.toggle('is-pinned', pinned);
      ZT.refresh();
    }
    setStep(0);
    updatePin();
    if (pinMQ.addEventListener) pinMQ.addEventListener('change', updatePin);
    ZT.on('motion', updatePin);
    ZT.onScroll(function () {
      if (!pinned) return null;
      var r = track.getBoundingClientRect(), total = r.height - ZT.vh;
      if (total <= 0 || r.bottom < 0 || r.top > ZT.vh) return null;
      var i = Math.floor(clamp(-r.top / total, 0, 0.9999) * steps.length);
      return i === cur ? null : function () { setStep(i); };
    });
    $$('#steps [data-step]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.getAttribute('data-step');
        picked = Date.now();
        if (pinned) {
          var top = track.getBoundingClientRect().top + window.scrollY, total = track.offsetHeight - ZT.vh;
          ZT.scrollTo(top + total * ((i + 0.5) / steps.length));
        } else setStep(i);
      });
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.3 }).observe(sec);
    setInterval(function () {
      if (pinned || !visible || ZT.reduced() || Date.now() - picked < 12000) return;
      setStep((cur + 1) % steps.length);
    }, 3800);
  });

  /* ---------- experience ---------- */
  safe('experience', function () {
    $$('.role-head').forEach(function (h) {
      h.addEventListener('click', function () {
        var li = h.parentNode, open = !li.classList.contains('is-open');
        li.classList.toggle('is-open', open);
        h.setAttribute('aria-expanded', String(open));
        setTimeout(ZT.refresh, 760);
      });
    });
    var roles = $('#roles'), fill = $('#xpFill');
    ZT.onScroll(function () {
      var r = roles.getBoundingClientRect();
      if (r.bottom < -100 || r.top > ZT.vh + 100) return null;
      var v = 'scaleY(' + clamp((ZT.vh * 0.62 - r.top) / r.height, 0, 1).toFixed(4) + ')';
      return function () { fill.style.transform = v; };
    });
  });

  /* ---------- scroll spy ---------- */
  safe('spy', function () {
    var links = $$('.nav a[data-nav]');
    var map = [['about', 'about'], ['work', 'work'], ['engine', 'engine'], ['shipped', 'work'], ['experience', 'experience'], ['capabilities', null], ['impact', null], ['contact', 'contact']];
    var secs = map.map(function (m) { return { el: document.getElementById(m[0]), nav: m[1] }; }).filter(function (s) { return s.el; });
    var cur;
    ZT.onScroll(function () {
      var line = ZT.vh * 0.42, found = null;
      for (var i = 0; i < secs.length; i++) {
        var r = secs[i].el.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) { found = secs[i].nav; break; }
      }
      if (found === cur) return null;
      return function () {
        cur = found;
        links.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + found;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      };
    });
  });

  /* ---------- in-page anchors (smooth, with focus handling) ---------- */
  safe('anchors', function () {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.classList.contains('skip')) return;
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var go = function () {
        ZT.scrollTo(target);
        setTimeout(function () {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }, ZT.reduced() ? 0 : 900);
      };
      if (a.hasAttribute('data-close-case') && dlg && dlg.open) closeCase(false, function () { setTimeout(go, 60); }); else go();
    });
  });

  /* ---------- copy email ---------- */
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand('copy')) resolve(); else reject(); } catch (err) { reject(err); }
      ta.remove();
    });
  }
  function copyEmail() {
    var mail = 'zhafrantsanyy@gmail.com';
    copyText(mail).then(function () { ZT.toast('Email copied. Talk soon.'); }, function () { location.href = 'mailto:' + mail; });
  }
  safe('copy', function () {
    $$('[data-copy]').forEach(function (b) { b.addEventListener('click', copyEmail); });
  });

  /* ---------- search palette ---------- */
  var pal = $('#palette');
  safe('palette', function () {
    if (!pal) return;
    var input = $('#palInput'), listEl = $('#palList'), statsEl = $('#palStats');
    var items = [], results = [], sel = 0, trigger = null, query = '', indexed = false;
    var BOOST = { Case: 8, Action: 6, Section: 5, Project: 4, Role: 3, Link: 2 };
    function open(url) { window.open(url, '_blank', 'noopener'); }
    function download(href) { var a = document.createElement('a'); a.href = href; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); }
    function add(it) {
      it.kw = (it.kw || '').toLowerCase().replace(/\s+/g, ' ');
      items.push(it);
    }
    function buildIndex() {
      indexed = true;
      [
        ['about', 'About', 'Bio, facts and skills', 'profile bio skills education languages bekasi', true],
        ['work', 'Selected work', 'Nine brands, eight case studies', 'case studies portfolio clients results', true],
        ['engine', 'The engine', 'A live simulation of the programmatic content pipeline', 'programmatic seo automation pipeline quality gate simulation', true],
        ['shipped', 'Shipped', 'Four public repositories', 'projects github repositories code n8n next.js supabase'],
        ['experience', 'Experience', 'Roles from 2022 to 2026', 'timeline jobs career history', true],
        ['capabilities', 'Capabilities', 'What I do, plus adjacent work', 'services skills translation localization outreach kol'],
        ['impact', 'Impact', 'The numbers, plus the CV download', 'results metrics numbers'],
        ['contact', 'Contact', 'Email, WhatsApp, LinkedIn, GitHub', 'hire email reach message', true]
      ].forEach(function (s) {
        add({ kind: 'Section', title: s[1], sub: s[2], kw: s[3], suggest: !!s[4], run: function () { var t = document.getElementById(s[0]); if (t) ZT.scrollTo(t); } });
      });
      CASES.forEach(function (c) {
        add({ kind: 'Case', title: c.name, sub: c.sector + ' · ' + c.metric, kw: c.body.textContent, suggest: c.id === 'tembuni' || c.id === 'trading',
          run: function () { openCase(c.id); } });
      });
      $$('.card').forEach(function (card) {
        var link = card.querySelector('.card-link');
        add({ kind: 'Project', title: card.querySelector('.card-title').textContent, sub: card.querySelector('.card-sub').textContent, kw: card.textContent,
          run: function () { ZT.scrollTo(card); } });
        add({ kind: 'Link', title: 'Open ' + card.querySelector('.card-title').textContent + ' on GitHub', sub: link.href.replace('https://', ''), kw: 'repo repository source code github',
          run: function () { open(link.href); } });
      });
      $$('.role').forEach(function (r) {
        var head = r.querySelector('.role-head');
        add({ kind: 'Role', title: r.querySelector('.role-what strong').textContent + ' · ' + r.querySelector('.role-what span').textContent,
          sub: r.querySelector('.role-when').textContent, kw: r.textContent,
          run: function () { if (!r.classList.contains('is-open')) head.click(); setTimeout(function () { ZT.scrollTo(r, { offset: 120 }); }, 60); } });
      });
      add({ kind: 'Action', title: 'Copy email address', sub: 'zhafrantsanyy@gmail.com', kw: 'mail contact copy clipboard', suggest: true, run: copyEmail });
      add({ kind: 'Action', title: 'Download CV', sub: 'One-page PDF', kw: 'resume curriculum vitae pdf download', suggest: true, run: function () { download('assets/docs/Muhammad-Zhafran-Tsany-CV.pdf'); } });
      add({ kind: 'Action', title: function () { return root.getAttribute('data-theme') === 'light' ? 'Switch to dark theme' : 'Switch to light theme'; }, sub: 'Colour theme', kw: 'theme dark light mode colour color appearance', suggest: true, run: function () { toggleTheme(); } });
      add({ kind: 'Action', title: function () { return ZT.reduced() ? 'Play animations' : 'Pause animations'; }, sub: 'Motion preference', kw: 'motion reduce animation accessibility stop pause play', run: function () { setMotion(ZT.reduced()); } });
      add({ kind: 'Link', title: 'Send an email', sub: 'zhafrantsanyy@gmail.com', kw: 'mail contact hire', run: function () { location.href = 'mailto:zhafrantsanyy@gmail.com'; } });
      add({ kind: 'Link', title: 'LinkedIn', sub: 'linkedin.com/in/zhafran-tsany', kw: 'social profile network', run: function () { open('https://www.linkedin.com/in/zhafran-tsany'); } });
      add({ kind: 'Link', title: 'GitHub', sub: 'github.com/zhafrantsanyy', kw: 'code repos repositories', run: function () { open('https://github.com/zhafrantsanyy'); } });
      add({ kind: 'Link', title: 'WhatsApp', sub: '+62 877 2074 2631', kw: 'phone call chat message', run: function () { open('https://wa.me/6287720742631'); } });
    }

    function titleOf(it) { return typeof it.title === 'function' ? it.title() : it.title; }
    function fuzzy(str, q) {
      if (q.length < 2) return false;
      for (var i = 0, j = 0; i < str.length; i++) if (str[i] === q[j] && ++j === q.length) return true;
      return false;
    }
    function score(it, terms) {
      var t = titleOf(it).toLowerCase(), s2 = it.sub.toLowerCase(), total = 0;
      for (var i = 0; i < terms.length; i++) {
        var q = terms[i], p = t.indexOf(q), s = 0;
        if (p === 0) s = 100;
        else if (p > 0) s = /[^a-z0-9]/.test(t[p - 1]) ? 70 : 40;
        else if (s2.indexOf(q) > -1) s = 28;
        else if (it.kw.indexOf(q) > -1) s = 12;
        else if (fuzzy(t, q)) s = 6;
        if (!s) return 0;
        total += s;
      }
      return total + (BOOST[it.kind] || 0);
    }
    function titleNode(it, terms) {
      var t = titleOf(it), frag = document.createDocumentFragment(), lower = t.toLowerCase(), q = terms[0], p = q ? lower.indexOf(q) : -1;
      if (p < 0) { frag.appendChild(document.createTextNode(t)); return frag; }
      var m = document.createElement('mark');
      m.textContent = t.slice(p, p + q.length);
      frag.appendChild(document.createTextNode(t.slice(0, p)));
      frag.appendChild(m);
      frag.appendChild(document.createTextNode(t.slice(p + q.length)));
      return frag;
    }
    function render() {
      var t0 = performance.now();
      var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) results = items.filter(function (it) { return it.suggest; });
      else results = items.map(function (it) { return { it: it, s: score(it, terms) }; })
        .filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 12).map(function (x) { return x.it; });
      var ms = performance.now() - t0;
      listEl.textContent = '';
      if (!results.length) {
        var li = document.createElement('li');
        li.className = 'pal-empty';
        var b = document.createElement('b'); b.textContent = 'No results for “' + query + '”';
        li.appendChild(b);
        li.appendChild(document.createTextNode('Zero search volume. Try “n8n”, “Traveloka”, “CV” or “theme”.'));
        listEl.appendChild(li);
        input.removeAttribute('aria-activedescendant');
        statsEl.textContent = '0 results in ' + ms.toFixed(2) + ' ms';
        return;
      }
      results.forEach(function (it, i) {
        var li = document.createElement('li');
        li.className = 'pal-item'; li.id = 'pal-opt-' + i;
        li.setAttribute('role', 'option');
        li.style.setProperty('--i', i);
        var rank = document.createElement('span'); rank.className = 'pal-rank'; rank.textContent = '#' + (i + 1);
        var mid = document.createElement('span');
        var tt = document.createElement('span'); tt.className = 'pal-title'; tt.appendChild(titleNode(it, terms));
        var sub = document.createElement('span'); sub.className = 'pal-sub'; sub.textContent = it.sub;
        mid.appendChild(tt); mid.appendChild(sub);
        var kind = document.createElement('span'); kind.className = 'pal-kind'; kind.textContent = it.kind;
        li.appendChild(rank); li.appendChild(mid); li.appendChild(kind);
        li.addEventListener('pointermove', function () { if (sel !== i) select(i, false); });
        li.addEventListener('click', function () { run(i); });
        listEl.appendChild(li);
      });
      select(0, false);
      statsEl.textContent = terms.length
        ? results.length + ' result' + (results.length === 1 ? '' : 's') + ' in ' + ms.toFixed(2) + ' ms'
        : 'Suggested · type to search every case study, role and project';
    }
    function select(i, scroll) {
      if (!results.length) return;
      sel = (i + results.length) % results.length;
      $$('.pal-item', listEl).forEach(function (li, k) { li.setAttribute('aria-selected', String(k === sel)); });
      input.setAttribute('aria-activedescendant', 'pal-opt-' + sel);
      if (scroll) { var el = $('#pal-opt-' + sel); if (el) el.scrollIntoView({ block: 'nearest' }); }
    }
    function openPal(from) {
      if (pal.open) return;
      if (state.menu) setMenu(false);
      if (!indexed) buildIndex();
      trigger = from || document.activeElement;
      query = ''; input.value = '';
      render();
      pal.showModal();
      ZT.lockScroll(true);
      input.focus();
      afterFrames(function () { pal.classList.add('is-open'); });
    }
    function closePal(restore) {
      if (!pal.open) return;
      pal.classList.remove('is-open');
      pal.close();
      if (!dlg || !dlg.open) ZT.lockScroll(false);
      if (restore !== false && trigger && trigger.focus && document.contains(trigger)) trigger.focus({ preventScroll: true });
    }
    function run(i) {
      var it = results[i];
      if (!it) return;
      closePal(false);
      if (dlg && dlg.open && it.kind !== 'Case' && it.kind !== 'Action' && it.kind !== 'Link') closeCase(false, function () { setTimeout(it.run, 60); });
      else setTimeout(it.run, 40);
    }
    input.addEventListener('input', function () { query = input.value; render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1, true); }
      else if (e.key === 'Home' && results.length) { e.preventDefault(); select(0, true); }
      else if (e.key === 'End' && results.length) { e.preventDefault(); select(results.length - 1, true); }
      else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    });
    pal.addEventListener('cancel', function (e) { e.preventDefault(); closePal(); });
    pal.addEventListener('click', function (e) { if (e.target === pal) closePal(); });
    $$('[data-palette]').forEach(function (b) { b.addEventListener('click', function () { openPal(b); }); });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (pal.open) closePal(); else openPal();
      } else if (e.key === '/' && !pal.open && !isTyping(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openPal();
      }
    });
  });

  /* ---------- intro ---------- */
  function intro() {
    var rm = ZT.reduced();
    var delays = [0, 0.05, 0.62, 0.74, 0.86];
    $$('[data-intro]').forEach(function (el) { el.style.setProperty('--d', delays[+el.getAttribute('data-intro')] + 's'); });
    var name = $('.hero-name'), tag = $('.hero-tag');
    if (name) { name.style.setProperty('--d', '80ms'); name.classList.add('is-in'); }
    if (tag) { tag.style.setProperty('--d', '240ms'); tag.classList.add('is-in'); }
    root.classList.add('is-ready');
    if (tracker) setTimeout(tracker.intro, rm ? 0 : 320);
    setTimeout(function () { $$('.hero [data-odo]').forEach(function (el) { ZT.odo(el).run(); }); }, rm ? 0 : 950);
    if (/^#case-/.test(location.hash)) {
      var id = location.hash.slice(6);
      setTimeout(function () { openCase(id, { push: false }); }, rm ? 0 : 700);
    }
  }
  requestAnimationFrame(function () { safe('intro', intro); });
  ZT.afterPaint(ZT.refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ZT.afterPaint(ZT.refresh); });
  window.addEventListener('load', function () { ZT.refresh(); });
})();
