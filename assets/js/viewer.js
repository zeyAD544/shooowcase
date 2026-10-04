/* ==========================================================================
   KYN — viewer.js
   A single, reusable fullscreen image viewer with keyboard + focus handling.
   Usage:  var viewer = KYN.createViewer();  viewer.open(items, index);
           items = [{ url, label }]
   ========================================================================== */
window.KYN = window.KYN || {};

(function (K) {
  "use strict";

  K.createViewer = function () {
    var root = null, imgEl = null, spinner = null, countEl = null, captionEl = null;
    var items = [], index = 0, isOpen = false, lastFocus = null, built = false;

    function build() {
      if (built) return;
      built = true;
      root = document.createElement("div");
      root.className = "viewer";
      root.setAttribute("role", "dialog");
      root.setAttribute("aria-modal", "true");
      root.setAttribute("aria-label", "Image viewer");
      root.dataset.open = "false";
      root.innerHTML =
        '<div class="viewer__bar">' +
          '<span class="viewer__count" aria-live="polite"><span data-cur>1</span> / <span data-total>1</span></span>' +
          '<button class="viewer__close" type="button" aria-label="Close viewer" data-close>' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          "</button>" +
        "</div>" +
        '<div class="viewer__stage" data-stage>' +
          '<div class="viewer__spinner" data-spinner hidden></div>' +
          '<img class="viewer__img" alt="" data-img />' +
        "</div>" +
        '<div class="viewer__foot">' +
          '<p class="viewer__caption" data-caption></p>' +
          '<div class="viewer__nav">' +
            '<button class="viewer__nav-btn" type="button" aria-label="Previous image" data-prev>' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 5l-7 7 7 7"/></svg>' +
            "</button>" +
            '<button class="viewer__nav-btn" type="button" aria-label="Next image" data-next>' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5l7 7-7 7"/></svg>' +
            "</button>" +
          "</div>" +
        "</div>";
      document.body.appendChild(root);

      imgEl = root.querySelector("[data-img]");
      spinner = root.querySelector("[data-spinner]");
      countEl = root.querySelector("[data-cur]");
      captionEl = root.querySelector("[data-caption]");

      root.querySelector("[data-close]").addEventListener("click", close);
      root.querySelector("[data-prev]").addEventListener("click", function () { step(-1); });
      root.querySelector("[data-next]").addEventListener("click", function () { step(1); });
      root.querySelector("[data-stage]").addEventListener("click", function (e) {
        if (e.target === e.currentTarget) close();
      });

      document.addEventListener("keydown", onKey, true);
    }

    function onKey(e) {
      if (!isOpen) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      else if (e.key === "Tab") { trapTab(e); }
    }

    function trapTab(e) {
      var focusable = root.querySelectorAll("button");
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function render() {
      var item = items[index] || {};
      root.querySelector("[data-total]").textContent = items.length;
      countEl.textContent = index + 1;
      captionEl.textContent = item.label || "";
      root.querySelector("[data-prev]").disabled = index <= 0;
      root.querySelector("[data-next]").disabled = index >= items.length - 1;
      imgEl.classList.remove("is-ready");
      imgEl.alt = item.label || "Project image";
      spinner.hidden = false;
      var token = index;
      imgEl.onload = function () {
        if (token !== index) return;
        spinner.hidden = true;
        imgEl.classList.add("is-ready");
      };
      imgEl.onerror = function () { spinner.hidden = true; };
      imgEl.src = item.url || "";
    }

    function step(delta) {
      var next = index + delta;
      if (next < 0 || next >= items.length) return;
      index = next;
      render();
    }

    function open(list, startIndex) {
      build();
      items = (list || []).filter(function (it) { return it && it.url; });
      if (!items.length) return;
      index = Math.max(0, Math.min(items.length - 1, startIndex || 0));
      lastFocus = document.activeElement;
      isOpen = true;
      root.dataset.open = "true";
      document.documentElement.style.overflow = "hidden";
      render();
      var closeBtn = root.querySelector("[data-close]");
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      root.dataset.open = "false";
      document.documentElement.style.overflow = "";
      imgEl.removeAttribute("src");
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    }

    return { open: open, close: close };
  };
})(window.KYN);
