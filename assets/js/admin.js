/* ==========================================================================
   KYN — admin.js
   Private dashboard: Firebase auth gate, projects overview with drag ordering,
   and the create / edit / upload / publish workflow. Falls back to a local
   demo mode that persists to localStorage when Firebase is not configured.
   ========================================================================== */
(function (K) {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var state = {
    mode: "demo",
    user: null,
    projects: [],
    filter: "",
    editing: null,
    images: [],
    cover: "",
    dirty: false,
    slugTouched: false
  };

  /* --------------------------------------------------------------- shells */
  function showAuth() {
    $("#view-auth").hidden = false;
    $("#view-dashboard").hidden = true;
  }
  function showDashboard() {
    $("#view-auth").hidden = true;
    $("#view-dashboard").hidden = false;
    $("#user-name").textContent = state.user && state.user.email ? state.user.email : "Demo";
    $("#user-avatar").textContent = (state.user && state.user.email ? state.user.email[0] : "K").toUpperCase();
    $("#user-role").textContent = state.mode === "firebase" ? "Administrator" : "Local demo";
    $("#signout-btn").textContent = state.mode === "firebase" ? "Sign out" : "Exit demo";
    $("#mode-badge").textContent = state.mode === "firebase" ? "Firebase" : "Demo";
    var banner = $("#demo-banner");
    if (state.mode === "firebase") {
      banner.hidden = true;
    } else {
      banner.hidden = false;
      banner.innerHTML = "<span aria-hidden=\"true\">◆</span><p><b>Demo mode — not connected to Firebase.</b> " +
        "Everything you change is stored in this browser only (and shown on the public site here). " +
        "Add your project keys to <code>assets/js/config.js</code> and deploy <code>firestore.rules</code> / <code>storage.rules</code> to go live — see <code>SETUP.md</code>.</p>";
    }
    loadProjects();
    showPanel("projects");
  }

  function showPanel(name) {
    var projects = name === "projects";
    $("#panel-projects").hidden = !projects;
    $("#panel-editor").hidden = projects;
    $("#topbar-title").textContent = projects ? "Projects" : (state.editing ? "Edit project" : "New project");
    $$(".admin-nav-item[data-goto]").forEach(function (b) {
      b.setAttribute("aria-current", String((projects && b.dataset.goto === "projects") || (!projects && b.dataset.goto === "new")));
    });
    closeMenu();
  }

  /* --------------------------------------------------------------- auth */
  function initAuth() {
    if (K.isFirebaseConfigured()) {
      // Firebase path: real authentication.
      $("#auth-form").hidden = false;
      $("#auth-sub").textContent = "Sign in to manage projects and media.";

      $("#auth-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var email = $("#auth-email").value.trim();
        var pass = $("#auth-password").value;
        if (!email || !pass) return;
        setAuthMsg("Signing in…", "info");
        $("#auth-submit").disabled = true;
        K.store.signIn(email, pass).then(function () {
          setAuthMsg("", "");
        }).catch(function (err) {
          setAuthMsg(friendlyAuthError(err), "error");
        }).then(function () { $("#auth-submit").disabled = false; });
      });

      K.store.onAuth(function (user) {
        if (user) { state.user = { email: user.email, uid: user.uid }; showDashboard(); }
        else { state.user = null; showAuth(); }
      });
    } else {
      // No backend configured — there is nothing to sign in to yet.
      $("#auth-form").hidden = true;
      $("#auth-sub").textContent = "Firebase is not configured. Add your project keys to assets/js/config.js.";
    }

    $("#signout-btn").addEventListener("click", function () {
      if (state.mode === "firebase") {
        K.store.signOut().then(function () { showAuth(); });
      } else {
        showAuth();
      }
    });
  }

  function setAuthMsg(text, kind) {
    var el = $("#auth-msg");
    el.textContent = text || "";
    el.dataset.kind = kind || "";
    if (!text) el.removeAttribute("data-kind");
  }

  function friendlyAuthError(err) {
    var code = err && err.code ? err.code : "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "Those credentials don't match an admin account.";
    if (code === "auth/too-many-requests") return "Too many attempts. Try again in a few minutes.";
    if (code === "auth/invalid-email") return "That email address looks invalid.";
    if (code === "auth/network-request-failed") return "Network unavailable. Check your connection.";
    return (err && err.message) ? err.message : "Could not sign in.";
  }

  /* ---------------------------------------------------------- projects list */
  function loadProjects() {
    return K.store.listProjects({}).then(function (list) {
      state.projects = list;
      renderProjects();
    }).catch(function (err) {
      K.toast("Could not load projects: " + err.message, "error");
    });
  }

  function renderProjects() {
    var rows = $("#proj-rows");
    var filter = state.filter.toLowerCase();
    var list = state.projects.filter(function (p) {
      if (!filter) return true;
      return (p.title + " " + p.slug + " " + (p.software || []).join(" ")).toLowerCase().indexOf(filter) !== -1;
    });
    $("#proj-count").textContent = list.length + " of " + state.projects.length + " projects";

    if (!list.length) {
      rows.innerHTML = '<div class="empty-state" style="margin:20px;grid-column:1/-1">' +
        "<h3>" + (state.projects.length ? "No matches" : "No projects yet") + "</h3>" +
        "<p>" + (state.projects.length ? "Try a different search." : "Create your first project to get started.") + "</p>" +
        '<button class="btn btn--sm btn--solid" type="button" data-new style="margin-top:16px">New project</button></div>';
      wireNewButtons();
      return;
    }

    rows.innerHTML = list.map(function (p) {
      var status = p.published
        ? '<span class="badge badge--live">● Live</span>'
        : '<span class="badge badge--draft">○ Draft</span>';
      var feat = p.featured ? '<span class="badge badge--featured">★ Featured</span>' : "";
      return '' +
        '<div class="proj-row" draggable="true" data-id="' + K.escapeHtml(p.id) + '">' +
          '<span class="proj-row__handle" aria-hidden="true" title="Drag to reorder">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>' +
          "</span>" +
          '<span class="proj-row__thumb"><img src="' + K.escapeHtml(p.coverImage || "") + '" alt="" loading="lazy"></span>' +
          "<span>" +
            '<span class="proj-row__title">' + K.escapeHtml(p.title) + "</span>" +
            '<span class="proj-row__slug">/' + K.escapeHtml(p.slug) + "</span>" +
          "</span>" +
          '<span class="proj-row__cell">' + K.escapeHtml((p.software || []).join(", ") || "—") + "</span>" +
          '<span class="proj-row__cell">' + K.escapeHtml(K.year(p.createdAt) || "—") + "</span>" +
          '<span class="proj-row__cell"><span style="display:flex;gap:6px;flex-wrap:wrap">' + status + feat + "</span></span>" +
          '<span class="proj-row__actions">' +
            '<button class="icon-btn' + (p.featured ? " is-on" : "") + '" type="button" data-feature title="Toggle featured" aria-pressed="' + (p.featured ? "true" : "false") + '">★</button>' +
            '<button class="icon-btn" type="button" data-publish title="Toggle published">' + (p.published ? eyeOff() : eye()) + "</button>" +
            '<button class="icon-btn" type="button" data-edit title="Edit project">' + pencil() + "</button>" +
            '<button class="icon-btn" type="button" data-danger data-delete title="Delete project">' + trash() + "</button>" +
          "</span>" +
        "</div>";
    }).join("");

    wireRows();
  }

  function onRowsDrop() {
    var rows = $("#proj-rows");
    var ids = $$(".proj-row", rows).map(function (r) { return r.dataset.id; });
    state.projects.sort(function (a, b) { return ids.indexOf(a.id) - ids.indexOf(b.id); });
    K.store.reorderProjects(ids).then(function () {
      K.toast("Order saved", "ok");
    }).catch(function (err) { K.toast("Could not save order: " + err.message, "error"); });
  }

  function wireRows() {
    $$("#proj-rows .proj-row").forEach(function (row) {
      var id = row.dataset.id;
      var project = state.projects.filter(function (p) { return p.id === id; })[0];
      if (!project) return;

      $("[data-edit]", row).addEventListener("click", function () { openEditorById(project); });
      $("[data-delete]", row).addEventListener("click", function () { confirmDelete(project); });

      $("[data-feature]", row).addEventListener("click", function () {
        project.featured = !project.featured;
        K.store.saveProject(project).then(function () {
          K.toast(project.featured ? "Marked as featured" : "Removed from featured", "ok");
          renderProjects();
        }).catch(function (err) { K.toast(err.message, "error"); });
      });

      $("[data-publish]", row).addEventListener("click", function () {
        project.published = !project.published;
        K.store.saveProject(project).then(function () {
          K.toast(project.published ? "Published" : "Moved to draft", "ok");
          renderProjects();
        }).catch(function (err) { K.toast(err.message, "error"); });
      });
    });
  }

  /* ------------------------------------------------------------- editor */
  function onImagesDrop() {
    var grid = $("#img-grid");
    var order = $$(".img-card", grid).map(function (c) { return parseInt(c.dataset.idx, 10); });
    state.images = order.map(function (i) { return state.images[i]; });
    state.dirty = true;
    renderImages();
  }

  /* Listing projects only hydrates their covers (for speed). Before editing we
     fetch the full project so every image reference is resolved to a URL. */
  function openEditorById(project) {
    if (!project || !project.id) { openEditor(project); return; }
    var needsFull = (project.images || []).some(function (im) {
      return im && typeof im === "object" && im.media && !im.url;
    });
    if (!needsFull) { openEditor(project); return; }
    K.toast("Loading images…", "info");
    K.store.getProjectById(project.id).then(function (full) {
      openEditor(full || project);
    }).catch(function () { openEditor(project); });
  }

  function openEditor(project) {
    state.editing = project ? JSON.parse(JSON.stringify(project)) : null;
    state.slugTouched = !!project;
    state.images = ((project && project.images) || []).map(function (im) {
      if (typeof im === "string") return { url: im, label: "" };
      return { url: im.url || "", media: im.media || null, path: im.path || null, label: im.label || "" };
    });
    state.cover = (project && project.coverImage) || (state.images[0] && state.images[0].url) || "";

    $("#editor-mode").textContent = project ? "Editing" : "New";
    $("#f-title").value = project ? project.title : "";
    $("#f-slug").value = project ? project.slug : "";
    $("#f-description").value = project ? (project.description || "") : "";
    $("#f-date").value = project && project.createdAt ? new Date(project.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    setSwitch("#f-published", !!(project && project.published));
    setSwitch("#f-featured", !!(project && project.featured));

    chips.software.set((project && project.software) || []);
    chips.tags.set((project && project.tags) || []);
    renderImages();
    state.dirty = false;
    $("#err-title").hidden = true;
    $("#f-title").removeAttribute("aria-invalid");
    showPanel("editor");
    window.scrollTo({ top: 0, behavior: K.prefersReducedMotion() ? "auto" : "smooth" });
  }

  function collect() {
    var created = $("#f-date").value ? new Date($("#f-date").value).toISOString() : K.nowISO();
    var slug = K.slugify($("#f-slug").value || $("#f-title").value);

    /* Persist lightweight references only — never the image bytes themselves,
       so the project document stays well under Firestore's size limit. */
    var images = state.images.map(function (im) {
      return im.media
        ? { media: im.media, label: im.label || "" }
        : { url: im.url, path: im.path || null, label: im.label || "" };
    });

    /* Store the chosen cover by reference too (media id, or an external URL). */
    var coverEntry = null;
    for (var ci = 0; ci < state.images.length; ci++) {
      if (state.images[ci].url && state.images[ci].url === state.cover) { coverEntry = state.images[ci]; break; }
    }

    return {
      id: state.editing ? state.editing.id : undefined,
      title: $("#f-title").value.trim(),
      slug: slug,
      description: $("#f-description").value.trim(),
      coverImage: coverEntry && !coverEntry.media ? coverEntry.url : "",
      coverMedia: coverEntry && coverEntry.media ? coverEntry.media : "",
      images: images,
      software: chips.software.get(),
      tags: chips.tags.get(),
      featured: getSwitch("#f-featured"),
      published: getSwitch("#f-published"),
      createdAt: created,
      order: state.editing && state.editing.order != null ? state.editing.order : (state.projects.length + 1)
    };
  }

  function saveEditor() {
    var project = collect();
    if (!project.title) {
      $("#err-title").hidden = false;
      $("#f-title").setAttribute("aria-invalid", "true");
      $("#f-title").focus();
      K.toast("A title is required.", "warn");
      return Promise.reject(new Error("validation"));
    }
    // Ensure a unique slug.
    var clash = state.projects.filter(function (p) {
      return p.slug === project.slug && p.id !== (state.editing && state.editing.id);
    });
    if (clash.length) {
      project.slug = project.slug + "-" + Math.random().toString(36).slice(2, 5);
    }
    return K.store.saveProject(project).then(function (saved) {
      state.dirty = false;
      K.toast(project.published ? "Project saved and published" : "Project saved as draft", "ok");
      return loadProjects().then(function () {
        state.editing = saved;
        return saved;
      });
    });
  }

  function confirmDelete(project) {
    openModal({
      title: "Delete project?",
      body: "“" + project.title + "” will be removed from the site. This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: function () {
        return K.store.deleteProject(project).then(function () {
          K.toast("Project deleted", "ok");
          return loadProjects().then(function () { showPanel("projects"); });
        }).catch(function (err) { K.toast(err.message, "error"); });
      }
    });
  }

  /* ------------------------------------------------------------- images */
  function renderImages() {
    var grid = $("#img-grid");
    $("#img-count").textContent = state.images.length;
    $("#img-empty").hidden = state.images.length > 0;

    grid.innerHTML = state.images.map(function (im, i) {
      var isCover = im.url === state.cover;
      return '' +
        '<div class="img-card' + (isCover ? " is-cover" : "") + '" draggable="true" data-idx="' + i + '">' +
          '<img src="' + K.escapeHtml(im.url) + '" alt="' + K.escapeHtml(im.label || "Image " + (i + 1)) + '" loading="lazy">' +
          (isCover ? '<span class="img-card__cover">Cover</span>' : "") +
          '<div class="img-card__bar">' +
            '<span class="img-card__idx">' + (i < 9 ? "0" : "") + (i + 1) + "</span>" +
            '<span style="display:flex;gap:5px">' +
              (isCover ? "" : '<button class="icon-btn" type="button" data-cover title="Set as cover" aria-label="Set as cover">' + star() + "</button>") +
              '<button class="icon-btn" type="button" data-remove title="Remove image" aria-label="Remove image">' + trash() + "</button>" +
            "</span>" +
          "</div>" +
        "</div>";
    }).join("");

    $$(".img-card", grid).forEach(function (card) {
      var idx = parseInt(card.dataset.idx, 10);
      var coverBtn = $("[data-cover]", card);
      if (coverBtn) coverBtn.addEventListener("click", function () {
        state.cover = state.images[idx].url;
        state.dirty = true;
        renderImages();
      });
      $("[data-remove]", card).addEventListener("click", function () {
        var removed = state.images.splice(idx, 1)[0];
        if (removed && removed.url === state.cover) state.cover = (state.images[0] && state.images[0].url) || "";
        state.dirty = true;
        if (removed) K.store.deleteImage(removed);
        renderImages();
      });
    });

    // Cover preview
    var coverGrid = $("#cover-grid");
    var coverEmpty = $("#cover-empty");
    if (state.cover) {
      coverEmpty.hidden = true;
      coverGrid.innerHTML = '<div class="img-card is-cover" style="cursor:default"><img src="' + K.escapeHtml(state.cover) + '" alt="Current cover"><span class="img-card__cover">Current cover</span></div>';
    } else {
      coverEmpty.hidden = false;
      coverGrid.innerHTML = "";
    }
    $("#cover-label").textContent = state.cover ? "" : "none";
  }

  function addImages(files) {
    if (!files || !files.length) return;
    var slug = K.slugify($("#f-slug").value || $("#f-title").value) || "unfiled";
    var prog = $("#upload-progress");
    var bar = $("#upload-bar");
    prog.hidden = false;
    bar.style.width = "6%";
    K.store.uploadImages(files, slug, function (done, total) {
      bar.style.width = Math.round((done / total) * 100) + "%";
    }).then(function (results) {
      results.forEach(function (im) { state.images.push(im); });
      if (!state.cover && state.images.length) state.cover = state.images[0].url;
      state.dirty = true;
      renderImages();
      K.toast(results.length + (results.length === 1 ? " image added" : " images added"), "ok");
    }).catch(function (err) {
      K.toast("Upload failed: " + err.message, "error");
    }).then(function () {
      prog.hidden = true;
      bar.style.width = "0";
      $("#file-input").value = "";
    });
  }

  /* --------------------------------------------------------- wire editor */
  function wireEditor() {
    $("#f-title").addEventListener("input", function () {
      state.dirty = true;
      if (!state.slugTouched) $("#f-slug").value = K.slugify($("#f-title").value);
    });
    $("#f-slug").addEventListener("input", function () { state.slugTouched = true; state.dirty = true; });
    ["#f-description", "#f-date"].forEach(function (sel) {
      $(sel).addEventListener("input", function () { state.dirty = true; });
    });

    $("#f-published").addEventListener("click", function () { setSwitch("#f-published", !getSwitch("#f-published")); state.dirty = true; });
    $("#f-featured").addEventListener("click", function () { setSwitch("#f-featured", !getSwitch("#f-featured")); state.dirty = true; });

    $("#editor-form").addEventListener("submit", function (e) {
      e.preventDefault();
      saveEditor().then(function () { showPanel("projects"); }).catch(function () { /* handled */ });
    });

    $("#preview-btn").addEventListener("click", function () {
      saveEditor().then(function (saved) {
        window.open("project.html?p=" + encodeURIComponent(saved.slug) + "&preview=1", "_blank", "noopener");
      }).catch(function () { /* handled */ });
    });

    $("#cancel-btn").addEventListener("click", function () { showPanel("projects"); });
    $("#delete-btn").addEventListener("click", function () {
      if (!state.editing) { showPanel("projects"); return; }
      confirmDelete(state.editing);
    });

    // Upload interactions
    sortable($("#img-grid"), ".img-card", "grid", onImagesDrop);
    var zone = $("#dropzone");
    var fileInput = $("#file-input");
    zone.addEventListener("click", function () { fileInput.click(); });
    zone.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
    fileInput.addEventListener("change", function () { addImages(fileInput.files); });
    ["dragenter", "dragover"].forEach(function (evt) {
      zone.addEventListener(evt, function (e) { e.preventDefault(); zone.classList.add("is-over"); });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      zone.addEventListener(evt, function (e) { e.preventDefault(); zone.classList.remove("is-over"); });
    });
    zone.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) addImages(e.dataTransfer.files);
    });
  }

  /* ------------------------------------------------------------- chips */
  function createChips(rootSel) {
    var root = $(rootSel);
    var input = $("input", root);
    var values = [];

    function render() {
      $$(".chip--rm", root).forEach(function (c) { c.remove(); });
      values.forEach(function (v, i) {
        var chip = document.createElement("span");
        chip.className = "chip chip--rm";
        chip.innerHTML = K.escapeHtml(v) + '<button type="button" aria-label="Remove ' + K.escapeHtml(v) + '">×</button>';
        chip.querySelector("button").addEventListener("click", function () {
          values.splice(i, 1); state.dirty = true; render();
        });
        root.insertBefore(chip, input);
      });
    }
    function add(raw) {
      var v = String(raw || "").trim().replace(/,$/, "");
      if (!v) return;
      if (values.indexOf(v) === -1) { values.push(v); state.dirty = true; render(); }
      input.value = "";
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input.value); }
      else if (e.key === "Backspace" && !input.value && values.length) { values.pop(); state.dirty = true; render(); }
    });
    input.addEventListener("blur", function () { add(input.value); });
    return {
      set: function (list) { values = Array.prototype.slice.call(list || []); render(); },
      get: function () { return values.slice(); }
    };
  }

  var chips = {};

  /* ------------------------------------------------------------- helpers */
  function setSwitch(sel, on) { $(sel).setAttribute("aria-checked", on ? "true" : "false"); }
  function getSwitch(sel) { return $(sel).getAttribute("aria-checked") === "true"; }

  function openModal(opts) {
    var modal = $("#confirm-modal");
    $("#confirm-title").textContent = opts.title || "Are you sure?";
    $("#confirm-body").textContent = opts.body || "";
    $("#confirm-ok").textContent = opts.confirmLabel || "Confirm";
    modal.dataset.open = "true";
    $("#confirm-ok").focus();
    function close() { modal.dataset.open = "false"; $("#confirm-ok").removeEventListener("click", onOk); $("#confirm-cancel").removeEventListener("click", onCancel); }
    function onCancel() { close(); }
    function onOk() {
      close();
      Promise.resolve(opts.onConfirm && opts.onConfirm());
    }
    $("#confirm-ok").addEventListener("click", onOk);
    $("#confirm-cancel").addEventListener("click", onCancel);
  }

  function sortable(container, itemSel, axis, onDrop) {
    var dragEl = null;
    container.addEventListener("dragstart", function (e) {
      var item = e.target.closest(itemSel);
      if (!item || !container.contains(item)) return;
      dragEl = item;
      item.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", ""); } catch (err) {}
    });
    container.addEventListener("dragover", function (e) {
      if (!dragEl) return;
      e.preventDefault();
      var target = e.target.closest(itemSel);
      if (!target || target === dragEl || !container.contains(target)) return;
      var r = target.getBoundingClientRect();
      var before;
      if (axis === "grid") {
        before = ((e.clientX - r.left) / r.width + (e.clientY - r.top) / r.height) < 1;
      } else {
        before = e.clientY < r.top + r.height / 2;
      }
      container.insertBefore(dragEl, before ? target : target.nextSibling);
    });
    container.addEventListener("drop", function (e) {
      if (!dragEl) return;
      e.preventDefault();
      dragEl.classList.remove("is-dragging");
      dragEl = null;
      onDrop();
    });
    container.addEventListener("dragend", function () {
      if (dragEl) { dragEl.classList.remove("is-dragging"); dragEl = null; }
    });
  }

  function wireNewButtons() {
    $$("[data-new]").forEach(function (b) {
      if (b.__wired) return; b.__wired = true;
      b.addEventListener("click", function () { openEditor(null); });
    });
  }

  function eye() { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'; }
  function eyeOff() { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.4 5.3A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 4M6 6.2C3.6 7.8 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 3.6-.7"/></svg>'; }
  function pencil() { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4"/></svg>'; }
  function trash() { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>'; }
  function star() { return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.4-.6L12 3Z"/></svg>'; }

  /* ------------------------------------------------------------- menu */
  function openMenu() { $("#admin-side").classList.add("is-open"); $("#admin-backdrop").hidden = false; }
  function closeMenu() { $("#admin-side").classList.remove("is-open"); $("#admin-backdrop").hidden = true; }

  /* ------------------------------------------------------------- boot */
  function boot() {
    chips.software = createChips("#f-software");
    chips.tags = createChips("#f-tags");

    wireEditor();
    wireNewButtons();
    sortable($("#proj-rows"), ".proj-row", "y", onRowsDrop);

    $("#proj-search").addEventListener("input", function () { state.filter = this.value; renderProjects(); });
    $("#new-btn").addEventListener("click", function () { openEditor(null); });
    $("#menu-btn").addEventListener("click", openMenu);

    var clearAll = $("#clear-all-btn");
    if (clearAll) clearAll.addEventListener("click", function () {
      if (!state.projects.length) { K.toast("There are no projects to delete.", "info"); return; }
      openModal({
        title: "Delete all projects?",
        body: "All " + state.projects.length + " project" + (state.projects.length === 1 ? "" : "s") +
          " will be permanently removed. This cannot be undone.",
        confirmLabel: "Delete all",
        onConfirm: function () {
          return K.store.deleteAllProjects(state.projects)
            .then(function () {
              K.toast("All projects deleted", "ok");
              return loadProjects().then(function () { showPanel("projects"); });
            })
            .catch(function (err) { K.toast(err.message, "error"); });
        }
      });
    });
    $("#admin-backdrop").addEventListener("click", closeMenu);

    $$(".admin-nav-item[data-goto]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.goto === "projects") showPanel("projects");
        else openEditor(null);
      });
    });

    window.addEventListener("beforeunload", function (e) {
      if (state.dirty && !$("#panel-editor").hidden) { e.preventDefault(); e.returnValue = ""; }
    });

    K.store.init().then(function (mode) {
      state.mode = mode;
      initAuth();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.KYN);
