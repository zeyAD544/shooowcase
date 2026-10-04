/* ==========================================================================
   KYN — site.js
   Homepage: renders the curated selected-work grid and the project index,
   wires scroll reveals, the hero motion detail, the clock and Discord copy.
   ========================================================================== */
(function (K) {
  "use strict";

  var FALLBACK_LAYOUT = [
    { span: 12, fit: "natural", offset: false },
    { span: 7, fit: "natural", offset: false },
    { span: 5, fit: "contain", offset: false },
    { span: 6, fit: "natural", offset: true },
    { span: 6, fit: "natural", offset: false },
    { span: 7, fit: "natural", offset: true },
    { span: 5, fit: "contain", offset: false }
  ];

  function layoutFor(project, i) {
    var map = K.DEMO_LAYOUT || {};
    if (map[project.slug]) return map[project.slug];
    return FALLBACK_LAYOUT[i % FALLBACK_LAYOUT.length];
  }

  function dimAttrs(url) {
    var d = K.imgDims ? K.imgDims(url) : null;
    if (!d) return "";
    return ' width="' + d[0] + '" height="' + d[1] + '"';
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  /* ------------------------------------------------------------- rendering */
  function renderWork(projects) {
    var grid = document.getElementById("work-grid");
    if (!grid) return;
    var countEl = document.getElementById("work-count");
    if (countEl) countEl.textContent = pad2(projects.length);
    if (!projects.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>No published work yet</h3><p>Projects published from the admin dashboard will appear here.</p></div>';
      return;
    }
    var html = projects.map(function (p, i) {
      var l = layoutFor(p, i);
      var meta = [K.year(p.createdAt), (p.software || [])[0]].filter(Boolean).join(" · ");
      var featured = p.featured ? '<span class="artwork__tag"><span class="dot"></span>Featured</span>' : "";
      return (
        '<article class="work reveal' + (l.offset ? " work--offset" : "") + '" data-span="' + l.span + '" style="transition-delay:' + (i % 3) * 60 + 'ms">' +
          '<a class="work__link" href="project.html?p=' + encodeURIComponent(p.slug) + '" aria-label="Open project: ' + K.escapeHtml(p.title) + '">' +
            '<figure class="artwork" data-fit="' + l.fit + '">' +
              '<img src="' + K.escapeHtml(p.coverImage) + '" alt="' + K.escapeHtml(p.title) + ' — cover render"' + dimAttrs(p.coverImage) + ' loading="lazy" decoding="async">' +
              featured +
              '<span class="artwork__view">View project <span aria-hidden="true">↗</span></span>' +
            "</figure>" +
            '<div class="work__meta">' +
              '<span class="work__idx">' + pad2(i + 1) + "</span>" +
              "<div>" +
                '<h3 class="work__title">' + K.escapeHtml(p.title) + "</h3>" +
                '<p class="work__sub">' + K.escapeHtml(meta) + "</p>" +
              "</div>" +
              '<span class="work__arrow" aria-hidden="true">→</span>' +
            "</div>" +
          "</a>" +
        "</article>"
      );
    }).join("");
    grid.innerHTML = html;
  }

  function renderIndex(projects) {
    var list = document.getElementById("index-list");
    if (!list) return;
    if (!projects.length) {
      list.innerHTML = '<li class="index__row"><div style="padding:24px 0" class="mono">No entries</div></li>';
      return;
    }
    list.innerHTML = projects.map(function (p, i) {
      var cat = (p.tags || [])[0] || (p.software || [])[0] || "Project";
      return (
        '<li class="index__row">' +
          '<a class="index__link" href="project.html?p=' + encodeURIComponent(p.slug) + '" data-cover="' + K.escapeHtml(p.coverImage) + '">' +
            '<span class="index__num">' + pad2(i + 1) + "</span>" +
            '<span class="index__name">' + K.escapeHtml(p.title) + "</span>" +
            '<span class="index__cat">' + K.escapeHtml(cat) + "</span>" +
            '<span class="index__year">' + K.escapeHtml(K.year(p.createdAt)) + "</span>" +
            '<span class="index__go" aria-hidden="true">→</span>' +
          "</a>" +
        "</li>"
      );
    }).join("");
    wireIndexPreview(list);
  }

  /* ----------------------------------------------- index hover preview */
  function wireIndexPreview(list) {
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var preview = document.createElement("div");
    preview.className = "index-preview";
    preview.setAttribute("aria-hidden", "true");
    document.body.appendChild(preview);

    var raf = null, x = 0, y = 0;
    function move() {
      raf = null;
      preview.style.transform = "translate(" + x + "px," + y + "px) translate(-50%,-50%) scale(" + (preview.classList.contains("is-on") ? 1 : 0.94) + ")";
    }
    document.addEventListener("mousemove", function (e) {
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(move);
    });
    list.querySelectorAll(".index__link").forEach(function (link) {
      link.addEventListener("mouseenter", function () {
        var cover = link.getAttribute("data-cover");
        if (cover) preview.style.backgroundImage = 'url("' + cover.replace(/"/g, "%22") + '")';
        preview.classList.add("is-on");
      });
      link.addEventListener("mouseleave", function () { preview.classList.remove("is-on"); });
    });
  }

  /* ----------------------------------------------- reveal on scroll */
  function observeReveals(root) {
    var els = (root || document).querySelectorAll(".reveal:not(.is-in)");
    if (!("IntersectionObserver" in window) || K.prefersReducedMotion()) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------- header + hero details */
  function headerScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function heroMotion() {
    var hero = document.querySelector(".hero");
    var coords = document.querySelector("[data-coords]");
    if (!hero) return;
    if (K.prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    var rect = null;
    function measure() { rect = hero.getBoundingClientRect(); }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    hero.addEventListener("mousemove", function (e) {
      if (!rect) measure();
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;
      hero.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      hero.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      if (coords) {
        coords.querySelector("[data-x]").textContent = (px * 1000).toFixed(1).padStart(6, "0");
        coords.querySelector("[data-y]").textContent = (py * 1000).toFixed(1).padStart(6, "0");
      }
    });
  }

  function clock() {
    var el = document.querySelector("[data-clock]");
    if (!el) return;
    function tick() {
      var d = new Date();
      el.textContent = pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
    }
    tick();
    setInterval(tick, 1000);
  }

  function yearStamp() {
    var y = String(new Date().getFullYear());
    ["year", "year-inline"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = y;
    });
  }

  function copyButtons() {
    document.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy");
        K.copyText(text).then(function () {
          var label = btn.querySelector("[data-copy-label]");
          var original = label ? label.textContent : "";
          btn.dataset.copied = "true";
          if (label) label.textContent = "Copied";
          K.toast("Copied “" + text + "” to clipboard", "ok");
          setTimeout(function () { btn.dataset.copied = "false"; if (label) label.textContent = original; }, 1800);
        }).catch(function () { K.toast("Could not copy — please copy manually.", "error"); });
      });
    });
  }

  /* ------------------------------------------------------------- boot */
  function boot() {
    headerScroll();
    heroMotion();
    clock();
    yearStamp();
    copyButtons();

    K.store.init().then(function () {
      return K.store.listProjects({ publishedOnly: true });
    }).then(function (list) {
      renderWork(list);
      renderIndex(list);
      observeReveals();
    }).catch(function (err) {
      var grid = document.getElementById("work-grid");
      if (grid) grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>Work could not be loaded</h3><p>' + K.escapeHtml(err.message) + "</p></div>";
      observeReveals();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.KYN);
