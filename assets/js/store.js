/* ==========================================================================
   KYN — store.js
   One data API for the whole site. When Firebase is configured and reachable
   it reads/writes Firestore; otherwise it falls back to a local demo dataset
   persisted in localStorage so the prototype works offline.

   IMAGE STORAGE (free mode)
   Cloud Storage requires the paid Blaze plan, so this app keeps image bytes
   inside Firestore instead: each uploaded image becomes one downscaled JPEG
   data URL in its own `media` document. Project documents only ever hold
   references ({ media: id }) plus small text fields, so they stay tiny. On
   read, the store transparently "hydrates" those references back into usable
   URLs before handing projects to the pages.
   ========================================================================== */
window.KYN = window.KYN || {};

(function (K) {
  "use strict";

  var DEMO_KEY = "kyn.demo.projects.v1";
  var fb = { app: null, db: null, auth: null, ready: false };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------------------------------------------------------------- demo */
  function seedDemo() {
    try {
      if (!localStorage.getItem(DEMO_KEY)) {
        localStorage.setItem(DEMO_KEY, JSON.stringify(clone(K.DEMO_PROJECTS)));
      }
    } catch (e) { /* storage may be unavailable; in-memory fallback below */ }
  }

  function readDemo() {
    seedDemo();
    try {
      var raw = localStorage.getItem(DEMO_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return clone(K.DEMO_PROJECTS);
  }

  function writeDemo(list) {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function resetDemo() {
    try { localStorage.removeItem(DEMO_KEY); } catch (e) {}
    seedDemo();
  }

  function sortProjects(list) {
    return list.slice().sort(function (a, b) {
      var ao = a.order == null ? 9999 : Number(a.order);
      var bo = b.order == null ? 9999 : Number(b.order);
      if (ao !== bo) return ao - bo;
      var at = new Date(a.createdAt || 0).getTime();
      var bt = new Date(b.createdAt || 0).getTime();
      return bt - at;
    });
  }

  function entryUrl(entry) {
    if (typeof entry === "string") return entry;
    return (entry && entry.url) || "";
  }

  function normalize(project, id) {
    var p = Object.assign({
      slug: "", title: "Untitled", description: "",
      coverImage: "", coverMedia: "", images: [], featured: false, published: false,
      software: [], tags: [], order: 9999,
      createdAt: K.nowISO(), updatedAt: K.nowISO()
    }, project);
    if (!p.id) p.id = id || ("p-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    p.software = Array.isArray(p.software) ? p.software : [];
    p.tags = Array.isArray(p.tags) ? p.tags : [];
    p.images = Array.isArray(p.images) ? p.images : [];
    if (!p.slug) p.slug = K.slugify(p.title) || p.id;
    /* Fall back to the first image as cover — but never let a media reference
       object masquerade as a URL. */
    if (!p.coverImage && !p.coverMedia && p.images.length) {
      var firstUrl = entryUrl(p.images[0]);
      if (firstUrl) p.coverImage = firstUrl;
    }
    return p;
  }

  /* Convert any thrown upload error into something actionable. */
  function describeUploadError(err) {
    if (err && err.code === "permission-denied") {
      return "Firestore denied the upload. Make sure you are signed in as the admin and that firestore.rules is published.";
    }
    if (err && err.code === "resource-exhausted") {
      return "That image is too large for the free plan — try a smaller file.";
    }
    return (err && err.message) ? err.message : "Upload failed.";
  }

  /* ------------------------------------------------------------ firebase */
  function ensureFirebase() {
    if (K._fbPromise) return K._fbPromise;
    K._fbPromise = new Promise(function (resolve, reject) {
      if (!K.isFirebaseConfigured()) return reject(new Error("not-configured"));
      var base = "https://www.gstatic.com/firebasejs/" + K.FIREBASE_SDK + "/";
      /* Load the core SDK first, then the add-ons. Loading them all in parallel
         races: firebase-auth-compat.js can execute before the core exists and
         throw "reading 'INTERNAL' of undefined", which silently downgrades the
         whole site to demo mode. */
      K.loadScript(base + "firebase-app-compat.js").then(function () {
        return Promise.all([
          K.loadScript(base + "firebase-auth-compat.js"),
          K.loadScript(base + "firebase-firestore-compat.js")
        ]);
      }).then(function () {
        try {
          if (!window.firebase.apps || !window.firebase.apps.length) {
            window.firebase.initializeApp(K.FIREBASE_CONFIG);
          }
          fb.db = window.firebase.firestore();
          fb.auth = window.firebase.auth();
          fb.ready = true;
          resolve(fb);
        } catch (e) { reject(e); }
      }).catch(reject);
    });
    return K._fbPromise;
  }

  /* --------------------------------------------------------------- media */
  var MEDIA = function () { return K.MEDIA_COLLECTION || "media"; };

  function mediaCol() { return fb.db.collection(MEDIA()); }

  function writeMedia(dataUrl, label, slug) {
    var ref = mediaCol().doc();
    return ref.set({
      url: dataUrl,
      label: label || "",
      slug: slug || "",
      createdAt: K.nowISO()
    }).then(function () { return ref.id; });
  }

  function readMedia(id) {
    if (!id) return Promise.resolve(null);
    return mediaCol().doc(id).get()
      .then(function (doc) { return doc.exists ? doc.data() : null; })
      .catch(function () { return null; });
  }

  function deleteMedia(id) {
    if (!id) return Promise.resolve();
    return mediaCol().doc(id).delete().catch(function () { /* already gone */ });
  }

  function isMediaEntry(entry) {
    return entry && typeof entry === "object" && entry.media;
  }

  /* Resolve one project's image references into URLs (used on project pages). */
  function hydrateImages(images) {
    var list = Array.isArray(images) ? images : [];
    return Promise.all(list.map(function (im) {
      if (isMediaEntry(im) && !im.url) {
        return readMedia(im.media).then(function (m) {
          if (m && m.url) im.url = m.url;
          return im;
        });
      }
      return im;
    }));
  }

  /* Resolve just the cover (used for listing grids) — one read per project. */
  function hydrateCover(p) {
    var id = p.coverMedia;
    if (!id) {
      var first = (p.images || [])[0];
      if (isMediaEntry(first)) id = first.media;
    }
    if (!id) return Promise.resolve(p);
    return readMedia(id).then(function (m) {
      if (m && m.url) p.coverImage = m.url;
      return p;
    });
  }

  function hydrateFull(p) {
    return hydrateImages(p.images).then(function () {
      if (p.coverMedia && !p.coverImage) {
        return readMedia(p.coverMedia).then(function (m) {
          if (m && m.url) p.coverImage = m.url;
          return p;
        });
      }
      if (!p.coverImage && p.images && p.images.length) {
        var u = entryUrl(p.images[0]);
        if (u) p.coverImage = u;
      }
      return p;
    });
  }

  function deleteRefs(refs) {
    var chain = Promise.resolve();
    for (var i = 0; i < refs.length; i += 400) {
      (function (chunk) {
        chain = chain.then(function () {
          var batch = fb.db.batch();
          chunk.forEach(function (r) { batch.delete(r); });
          return batch.commit();
        });
      })(refs.slice(i, i + 400));
    }
    return chain;
  }

  function deleteMediaBySlug(slug) {
    if (!slug) return Promise.resolve();
    return mediaCol().where("slug", "==", slug).get().then(function (snap) {
      return deleteRefs(snap.docs.map(function (d) { return d.ref; }));
    }).catch(function () { /* best effort */ });
  }

  function deleteAllMedia() {
    return mediaCol().get().then(function (snap) {
      return deleteRefs(snap.docs.map(function (d) { return d.ref; }));
    }).catch(function () { /* best effort */ });
  }

  /* --------------------------------------------------------------- store */
  var store = {
    mode: K.isFirebaseConfigured() ? "firebase" : "demo",
    fallbackReason: null,

    isFirebase: function () { return store.mode === "firebase"; },

    init: function () {
      if (!K.isFirebaseConfigured()) return Promise.resolve("demo");
      return ensureFirebase().then(function () {
        store.mode = "firebase";
        return "firebase";
      }).catch(function (err) {
        store.mode = "demo";
        store.fallbackReason = err && err.message ? err.message : "firebase-unavailable";
        return "demo";
      });
    },

    resetDemo: resetDemo,

    listProjects: function (opts) {
      opts = opts || {};
      if (store.isFirebase()) {
        var q = fb.db.collection(K.COLLECTION);
        if (opts.publishedOnly) q = q.where("published", "==", true);
        return q.get().then(function (snap) {
          var list = [];
          snap.forEach(function (doc) {
            list.push(normalize(Object.assign({ id: doc.id }, doc.data()), doc.id));
          });
          list = sortProjects(list);
          /* A successful read clears any earlier fallback note, so the admin
             only warns while the data on screen is genuinely stale. */
          store.fallbackReason = null;
          /* Covers only — cheap, and enough for every listing surface. */
          return Promise.all(list.map(hydrateCover));
        }).catch(function (err) {
          store.fallbackReason = err.message;
          return publicDemo(opts);
        });
      }
      return Promise.resolve(publicDemo(opts));
    },

    getProject: function (slug, opts) {
      opts = opts || {};
      if (store.isFirebase()) {
        var q = fb.db.collection(K.COLLECTION).where("slug", "==", slug);
        if (opts.publishedOnly) q = q.where("published", "==", true);
        return q.limit(1).get()
          .then(function (snap) {
            if (snap.empty) return null;
            var doc = snap.docs[0];
            var p = normalize(Object.assign({ id: doc.id }, doc.data()), doc.id);
            if (opts.publishedOnly && !p.published) return null;
            return hydrateFull(p);
          }).catch(function () { return findDemo(slug, opts); });
      }
      return Promise.resolve(findDemo(slug, opts));
    },

    getProjectById: function (id) {
      if (store.isFirebase()) {
        return fb.db.collection(K.COLLECTION).doc(id).get().then(function (doc) {
          if (!doc.exists) return null;
          return hydrateFull(normalize(Object.assign({ id: doc.id }, doc.data()), doc.id));
        });
      }
      var list = readDemo();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return Promise.resolve(normalize(list[i], id));
      return Promise.resolve(null);
    },

    saveProject: function (project) {
      var p = normalize(project, project.id);
      p.updatedAt = K.nowISO();
      if (store.isFirebase()) {
        var isNew = !project.id || String(project.id).indexOf("p-") === 0 || String(project.id).indexOf("demo-") === 0;
        var payload = Object.assign({}, p);
        delete payload.id;
        var ref = isNew ? fb.db.collection(K.COLLECTION).doc() : fb.db.collection(K.COLLECTION).doc(p.id);
        if (isNew) { p.id = ref.id; }
        return ref.set(payload, { merge: false }).then(function () { return p; })
          .catch(function (err) { throw new Error(describeUploadError(err)); });
      }
      var list = readDemo();
      var idx = -1;
      for (var i = 0; i < list.length; i++) if (list[i].id === p.id) { idx = i; break; }
      if (idx === -1) list.push(p); else list[idx] = p;
      var ok = writeDemo(list);
      if (!ok) return Promise.reject(new Error("This browser's local storage is full. Large demo uploads may exceed the quota — connect Firebase to store real media."));
      return Promise.resolve(p);
    },

    deleteProject: function (project) {
      var id = typeof project === "string" ? project : (project && project.id);
      var slug = (project && typeof project === "object") ? project.slug : null;
      if (store.isFirebase()) {
        return deleteMediaBySlug(slug).then(function () {
          return fb.db.collection(K.COLLECTION).doc(id).delete();
        });
      }
      var list = readDemo().filter(function (p) { return p.id !== id; });
      writeDemo(list);
      return Promise.resolve();
    },

    /* Delete every project (and all their media). Firestore batches cap at
       500 writes, so both deletions are chunked. */
    deleteAllProjects: function (projects) {
      var list = Array.isArray(projects) ? projects : [];
      var ids = list.map(function (p) { return typeof p === "string" ? p : p.id; }).filter(Boolean);
      if (store.isFirebase()) {
        return deleteAllMedia().then(function () {
          return deleteRefs(ids.map(function (id) { return fb.db.collection(K.COLLECTION).doc(id); }));
        });
      }
      writeDemo([]);
      return Promise.resolve();
    },

    reorderProjects: function (orderedIds) {
      if (store.isFirebase()) {
        var batch = fb.db.batch();
        orderedIds.forEach(function (id, i) {
          batch.update(fb.db.collection(K.COLLECTION).doc(id), { order: i + 1, updatedAt: K.nowISO() });
        });
        return batch.commit();
      }
      var list = readDemo();
      orderedIds.forEach(function (id, i) {
        for (var j = 0; j < list.length; j++) if (list[j].id === id) list[j].order = i + 1;
      });
      writeDemo(list);
      return Promise.resolve();
    },

    /* Upload one or more files. Returns entries shaped [{ media, label, url }]
       where `media` is the Firestore doc id to persist and `url` is an
       in-memory data URL so the admin can preview immediately. */
    uploadImages: function (files, slug, onProgress) {
      files = Array.prototype.slice.call(files || []);
      if (store.isFirebase()) {
        var done = 0;
        var out = [];
        var chain = Promise.resolve();
        files.forEach(function (file) {
          chain = chain.then(function () {
            var label = file.name.replace(/\.[a-z0-9]+$/i, "");
            return K.fileToBoundedDataURL(file).then(function (dataUrl) {
              return writeMedia(dataUrl, label, slug).then(function (id) {
                out.push({ media: id, label: label, url: dataUrl });
                done++;
                if (onProgress) onProgress(done, files.length);
              });
            }).catch(function (err) { throw new Error(describeUploadError(err)); });
          });
        });
        return chain.then(function () { return out; });
      }
      /* demo mode — downscale to data URLs held in memory */
      var results = [];
      var seq = files.reduce(function (acc, f) { return acc.then(function () {
        return K.fileToDataURL(f).then(function (dataUrl) {
          results.push({ url: dataUrl, path: null, label: f.name.replace(/\.[a-z0-9]+$/i, ""), dataUrl: true });
          if (onProgress) onProgress(results.length, files.length);
        });
      }); }, Promise.resolve());
      return seq.then(function () { return results; });
    },

    /* Remove an image's backing data (a media doc, or a legacy Storage file). */
    deleteImage: function (image) {
      if (!image) return Promise.resolve();
      if (store.isFirebase() && image.media) return deleteMedia(image.media);
      return Promise.resolve();
    },

    /* Auth (Firebase mode only) */
    onAuth: function (cb) {
      if (!store.isFirebase()) { cb(null); return function () {}; }
      return fb.auth.onAuthStateChanged(cb);
    },
    signIn: function (email, password) {
      if (!store.isFirebase()) return Promise.reject(new Error("not-configured"));
      return fb.auth.signInWithEmailAndPassword(email, password);
    },
    signOut: function () {
      if (!store.isFirebase()) return Promise.resolve();
      return fb.auth.signOut();
    },
    currentUser: function () {
      if (!store.isFirebase() || !fb.auth) return null;
      return fb.auth.currentUser;
    }
  };

  function publicDemo(opts) {
    var list = readDemo().map(function (p) { return normalize(p, p.id); });
    if (opts && opts.publishedOnly) list = list.filter(function (p) { return p.published; });
    return sortProjects(list);
  }

  function findDemo(slug, opts) {
    var list = publicDemo();
    for (var i = 0; i < list.length; i++) {
      if (list[i].slug === slug || list[i].id === slug) {
        if (opts && opts.publishedOnly && !list[i].published) return null;
        return list[i];
      }
    }
    return null;
  }

  K.store = store;
})(window.KYN);
