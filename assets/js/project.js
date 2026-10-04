/* ==========================================================================
   KYN — project.js
   Renders a single project case study from ?p=<slug> (or the #hash), wires the
   fullscreen viewer, the next-project link and SEO metadata.
   ========================================================================== */
(function (K) {
  "use strict";

  var viewer = null;
  var state = { project: null, list: [], index: -1 };

  function getSlug() {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get("p");
    if (!slug && window.location.hash) slug = window.location.hash.replace(/^#/, "");
    return slug || "";
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dimAttrs(url) {
    var d = K.imgDims ? K.imgDims(url) : null;
    if (!d) return "";
    return ' width="' + d[0] + '" height="' + d[1] + '"';
  }
  function isSquare(url) {
    var d = K.imgDims ? K.imgDims(url) : null;
    return !!(d && d[0] === d[1]);
  }

  function setMeta(project) {
    var title = project.title + " — Kyn, 3D Modeler";
    document.title = title;
    function meta(name, content, attr) {
      var sel = "meta[" + (attr || "name") + '="' + name + '"]';
      var el = document.head.querySelector(sel);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr || "name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    }
    var desc = (project.description || (project.title + " — a 3D project by Kyn.")).slice(0, 180);
    meta("description", desc);
    meta("og:title", title, "property");
    meta("og:description", desc, "property");
    meta("og:type", "article", "property");
    meta("og:image", project.coverImage, "property");
    meta("twitter:card", "summary_large_image");

    var ld = {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "name": project.title,
      "description": desc,
      "image": project.coverImage,
      "creator": { "@type": "Person", "name": "Kyn", "jobTitle": "3D Modeler" },
      "dateCreated": project.createdAt
    };
    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  }

  /* ------------------------------------------------------------- render */
  function render(project) {
    state.project = project;

    document.getElementById("proj-idx").textContent = pad2(project.order || (state.index + 1));
    document.getElementById("proj-cat").textContent = (project.tags || [])[0] || "Project";
    document.getElementById("proj-title").textContent = project.title;
    var lead = document.getElementById("proj-lead");
    if (project.description) lead.textContent = project.description; else lead.remove();

    /* metadata rail */
    var metaEl = document.getElementById("proj-meta");
    var items = [];
    items.push(["Year", K.year(project.createdAt) || "—"]);
    items.push(["Software", (project.software && project.software.length) ? project.software.join(", ") : "—"]);
    items.push(["Tags", (project.tags && project.tags.length) ? project.tags.join(", ") : "—"]);
    items.push(["Published", K.formatDate(project.createdAt)]);
    metaEl.innerHTML = items.map(function (it) {
      return '<div class="project-meta__item"><dt>' + K.escapeHtml(it[0]) + "</dt><dd>" + K.escapeHtml(it[1]) + "</dd></div>";
    }).join("");

    /* images */
    var images = (project.images || []).filter(function (im) { return im && (im.url || typeof im === "string"); })
      .map(function (im) { return typeof im === "string" ? { url: im, label: "" } : im; });
    if (!images.length && project.coverImage) images = [{ url: project.coverImage, label: "Beauty render" }];

    var viewerItems = images.map(function (im) { return { url: im.url, label: im.label || "" }; });
    viewer = K.createViewer();

    var heroWrap = document.getElementById("proj-hero");
    var restSection = document.getElementById("proj-rest-section");
    var restWrap = document.getElementById("proj-rest");

    if (!images.length) {
      /* No media on this project. A project can legitimately be saved with no
         images (e.g. an upload failed), so show a graceful empty state rather
         than crashing the page on images[0].url. */
      heroWrap.innerHTML =
        '<div class="figure-empty" data-fit="contain">' +
          '<p class="eyebrow">No media yet</p>' +
          "<h3>This project has no images.</h3>" +
          "<p>Open it in the admin dashboard and add images — they will appear here straight away.</p>" +
        "</div>";
      restSection.hidden = true;
      renderNext();
      setMeta(project);
      document.title = project.title + " — Kyn, 3D Modeler";
      return;
    }

    var hero = images[0];
    var rest = images.slice(1);

    heroWrap.innerHTML =
      '<figure class="figure reveal" data-fit="' + (isSquare(hero.url) ? "contain" : "natural") + '">' +
        '<button class="figure__frame" type="button" data-viewer-index="0" aria-label="Open the primary render fullscreen">' +
          '<img src="' + K.escapeHtml(hero.url) + '" alt="' + K.escapeHtml(project.title) + " — " + K.escapeHtml(hero.label || "render") + '"' + dimAttrs(hero.url) + ' decoding="async">' +
          '<span class="figure__zoom" aria-hidden="true">' + iconExpand() + "</span>" +
        "</button>" +
        '<figcaption class="figure__cap"><span>' + K.escapeHtml(hero.label || "Primary render") + '</span><span class="idx">' + pad2(1) + " / " + pad2(images.length) + "</span></figcaption>" +
      "</figure>";

    if (rest.length) {
      var allSquare = rest.every(function (im) { return isSquare(im.url); });
      restWrap.className = allSquare ? "map-grid" : "";
      document.getElementById("proj-rest-label").textContent = allSquare ? "Surface studies" : "More views";
      document.getElementById("proj-rest-count").textContent = pad2(rest.length) + " images";
      restWrap.innerHTML = rest.map(function (im, i) {
        var gi = i + 1;
        return '<figure class="figure reveal" data-fit="' + (isSquare(im.url) ? "contain" : "natural") + '">' +
          '<button class="figure__frame" type="button" data-viewer-index="' + gi + '" aria-label="Open image ' + (gi + 1) + ' fullscreen">' +
            '<img src="' + K.escapeHtml(im.url) + '" alt="' + K.escapeHtml(project.title) + " — " + K.escapeHtml(im.label || "view") + '"' + dimAttrs(im.url) + ' loading="lazy" decoding="async">' +
            '<span class="figure__zoom" aria-hidden="true">' + iconExpand() + "</span>" +
          "</button>" +
          (im.label ? '<figcaption class="figure__cap"><span>' + K.escapeHtml(im.label) + '</span><span class="idx">' + pad2(gi + 1) + " / " + pad2(images.length) + "</span></figcaption>" : "") +
        "</figure>";
      }).join("");
    } else {
      restSection.hidden = true;
    }

    document.querySelectorAll("[data-viewer-index]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        viewer.open(viewerItems, parseInt(btn.getAttribute("data-viewer-index"), 10) || 0);
      });
    });

    renderNext();
    setMeta(project);
    document.title = project.title + " — Kyn, 3D Modeler";
  }

  function iconExpand() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5"/></svg>';
  }

  function renderNext() {
    var others = state.list.filter(function (p) { return p.slug !== state.project.slug; });
    var wrap = document.getElementById("proj-next");
    if (!others.length) { wrap.hidden = true; return; }
    var after = state.list.slice(state.index + 1).filter(function (p) { return p.published; });
    var next = after[0] || others[0];
    wrap.innerHTML =
      '<a class="project-next__link" href="project.html?p=' + encodeURIComponent(next.slug) + '">' +
        "<div>" +
          '<p class="eyebrow" style="margin-bottom:14px">Next project</p>' +
          '<span class="project-next__title">' + K.escapeHtml(next.title) + "</span>" +
        "</div>" +
        '<span class="project-next__arrow" aria-hidden="true">→</span>' +
      "</a>";
  }

  function showState(kind, message) {
    var main = document.getElementById("project-root");
    document.getElementById("project-state").innerHTML =
      '<h1>' + (kind === "error" ? "Something went wrong" : "Project not found") + "</h1>" +
      "<p>" + K.escapeHtml(message || "This project may have been unpublished or the link is incorrect.") + "</p>" +
      '<p style="margin-top:24px"><a class="project-back" href="index.html">← Back to index</a></p>';
    document.getElementById("project-state").hidden = false;
    if (main) main.hidden = true;
  }

  /* ------------------------------------------------------------- boot */
  function boot() {
    var slug = getSlug();
    if (!slug) { showState("missing"); return; }

    K.store.init().then(function () {
      return Promise.all([
        K.store.getProject(slug, { publishedOnly: !new URLSearchParams(window.location.search).has("preview") }),
        K.store.listProjects({ publishedOnly: true })
      ]);
    }).then(function (res) {
      var project = res[0];
      state.list = res[1];
      state.index = indexOfSlug(state.list, slug);
      if (!project) { showState("missing"); return; }
      document.getElementById("project-state").hidden = true;
      document.getElementById("project-root").hidden = false;
      render(project);
    }).catch(function (err) {
      showState("error", err.message);
    });
  }

  function indexOfSlug(list, slug) {
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return i;
    return -1;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.KYN);
