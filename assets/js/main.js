/* ============================================================
   Muhammad Zhafran Tsany — portfolio
   Vanilla JS. Every effect degrades gracefully.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- year ---------- */
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- sticky nav + scroll progress + back to top ---------- */
  var nav = $('#nav'), bar = $('#scrollProgress'), toTop = $('#toTop');
  var ticking = false;

  function onScroll() {
    var sc = window.scrollY || document.documentElement.scrollTop;
    var h  = document.documentElement.scrollHeight - window.innerHeight;
    if (nav)   nav.classList.toggle('is-stuck', sc > 12);
    if (bar)   bar.style.width = (h > 0 ? (sc / h) * 100 : 0) + '%';
    if (toTop) toTop.classList.toggle('is-on', sc > 600);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if (toTop) toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ---------- mobile nav ---------- */
  var toggle = $('#navToggle'), links = $('#navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('is-open')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------- reveal on scroll ---------- */
  var revealables = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, i) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var delay = (Array.prototype.indexOf.call(el.parentNode.children, el) % 4) * 70;
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        ro.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { ro.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- scroll spy ---------- */
  var navAnchors = $$('#navLinks a[href^="#"]');
  var sections = navAnchors
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navAnchors.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- animated counters ---------- */
  function runCount(el) {
    var to       = parseFloat(el.dataset.to || '0');
    var decimals = parseInt(el.dataset.decimals || '0', 10);
    var suffix   = el.dataset.suffix || '';
    if (reduced) { el.textContent = to.toFixed(decimals) + suffix; return; }
    var dur = 1500, t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);          // easeOutCubic
      el.textContent = (to * e).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = $$('.count');
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        runCount(en.target);
        co.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { co.observe(c); });
  } else {
    counters.forEach(runCount);
  }

  /* ---------- rotating role ---------- */
  var roleEl = $('#roleRotate');
  if (roleEl) {
    var words = [
      'organic growth systems',
      'programmatic SEO engines',
      'automation that reports itself',
      'dashboards teams actually open'
    ];
    var wi = 0, ci = 0, deleting = false;
    var span = roleEl.querySelector('span') || roleEl;

    if (reduced) {
      span.textContent = words[0];
    } else {
      (function type() {
        var word = words[wi];
        ci += deleting ? -1 : 1;
        span.textContent = word.slice(0, ci);
        var wait = deleting ? 38 : 68;
        if (!deleting && ci === word.length) { deleting = true; wait = 2000; }
        else if (deleting && ci === 0)       { deleting = false; wi = (wi + 1) % words.length; wait = 340; }
        setTimeout(type, wait);
      })();
    }
  }

  /* ---------- pointer spotlight on cards ---------- */
  $$('.pcard, .hero-card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- subtle 3D tilt ---------- */
  if (!reduced && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('[data-tilt]').forEach(function (el) {
      var raf = null;
      el.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width  - 0.5;
          var py = (e.clientY - r.top)  / r.height - 0.5;
          el.style.transform =
            'perspective(900px) rotateY(' + (px * 5).toFixed(2) + 'deg) rotateX(' +
            (-py * 5).toFixed(2) + 'deg) translateY(-3px)';
        });
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduced && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var yy = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + (x * 0.12).toFixed(1) + 'px,' + (yy * 0.16).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- experience accordion ---------- */
  $$('.tl-head').forEach(function (head) {
    head.addEventListener('click', function () {
      var item = head.closest('.tl-item');
      var open = item.classList.contains('is-open');
      $$('.tl-item').forEach(function (it) {
        it.classList.remove('is-open');
        it.querySelector('.tl-head').setAttribute('aria-expanded', 'false');
      });
      if (!open) {
        item.classList.add('is-open');
        head.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- project filters ---------- */
  var filters = $$('.filter'), cards = $$('.pcard');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.dataset.filter;
      filters.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      cards.forEach(function (c) {
        var tags = (c.dataset.tags || '').split(/\s+/);
        var show = f === 'all' || tags.indexOf(f) !== -1;
        c.classList.toggle('is-hidden', !show);
        if (show) { c.classList.remove('is-in'); requestAnimationFrame(function () { c.classList.add('is-in'); }); }
      });
    });
  });

  /* ---------- copy email ---------- */
  var toast = $('#toast');
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(say._t);
    say._t = setTimeout(function () { toast.classList.remove('is-on'); }, 2200);
  }
  var copyBtn = $('#copyMail');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var mail = copyBtn.dataset.mail;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mail).then(
          function () { say('Email copied to clipboard'); },
          function () { window.location.href = 'mailto:' + mail; }
        );
      } else {
        window.location.href = 'mailto:' + mail;
      }
    });
  }

  /* ---------- constellation background ---------- */
  var canvas = $('#bgCanvas');
  if (canvas && !reduced) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, dots = [], mouse = { x: -9999, y: -9999 };

    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = Math.min(90, Math.round((W * H) / 19000));
      dots = [];
      for (var i = 0; i < target; i++) {
        dots.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.5 + 0.6
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > W) d.vx *= -1;
        if (d.y < 0 || d.y > H) d.vy *= -1;

        var dmx = d.x - mouse.x, dmy = d.y - mouse.y;
        var md = Math.sqrt(dmx * dmx + dmy * dmy);
        if (md < 130) { d.x += (dmx / md) * 0.7; d.y += (dmy / md) * 0.7; }

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(140,180,255,.55)';
        ctx.fill();

        for (var j = i + 1; j < dots.length; j++) {
          var o = dots[j], dx = d.x - o.x, dy = d.y - o.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 125) {
            ctx.beginPath();
            ctx.moveTo(d.x, d.y); ctx.lineTo(o.x, o.y);
            ctx.strokeStyle = 'rgba(77,141,255,' + (0.16 * (1 - dist / 125)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    resize();
    requestAnimationFrame(frame);
  }
})();
