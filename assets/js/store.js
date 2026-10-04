/* ==========================================================================
   KYN — store.js
   One data API for the whole site. When Firebase is configured and reachable
   it reads/writes Firestore + Storage; otherwise it falls back to a local
   demo dataset persisted in localStorage so the prototype works offline.
   ========================================================================== */
window.KYN = window.KYN || {};

(function (K) {
  "use strict";

  var DEMO_KEY = "kyn.demo.projects.v1";
  var fb = { app: null, db: null, auth: null, storage: null, ready: false };

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

  function normalize(project, id) {
    var p = Object.assign({
      slug: "", title: "Untitled", description: "",
      coverImage: "", images: [], featured: false, published: false,
      software: [], tags: [], order: 9999,
      createdAt: K.nowISO(), updatedAt: K.nowISO()
    }, project);
    if (!p.id) p.id = id || ("p-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    p.software = Array.isArray(p.software) ? p.software : [];
    p.tags = Array.isArray(p.tags) ? p.tags : [];
    p.images = Array.isArray(p.images) ? p.images : [];
    if (!p.slug) p.slug = K.slugify(p.title) || p.id;
    if (!p.coverImage && p.images.length) p.coverImage = (p.images[0].url || p.images[0]);
    return p;
  }

  /* ------------------------------------------------------------ firebase */
  function ensureFirebase() {
    if (K._fbPromise) return K._fbPromise;
    K._fbPromise = new Promise(function (resolve, reject) {
      if (!K.isFirebaseConfigured()) return reject(new Error("not-configured"));
      var base = "https://www.gstatic.com/firebasejs/" + K.FIREBASE_SDK + "/";
      Promise.all([
        K.loadScript(base + "firebase-app-compat.js"),
        K.loadScript(base + "firebase-auth-compat.js"),
        K.loadScript(base + "firebase-firestore-compat.js"),
        K.loadScript(base + "firebase-storage-compat.js")
      ]).then(function () {
        try {
          if (!window.firebase.apps || !window.firebase.apps.length) {
            window.firebase.initializeApp(K.FIREBASE_CONFIG);
          }
          fb.db = window.firebase.firestore();
          fb.auth = window.firebase.auth();
          fb.storage = window.firebase.storage();
          fb.ready = true;
          resolve(fb);
        } catch (e) { reject(e); }
      }).catch(reject);
    });
    return K._fbPromise;
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
          return sortProjects(list);
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
            return p;
          }).catch(function () { return findDemo(slug, opts); });
      }
      return Promise.resolve(findDemo(slug, opts));
    },

    getProjectById: function (id) {
      if (store.isFirebase()) {
        return fb.db.collection(K.COLLECTION).doc(id).get().then(function (doc) {
          if (!doc.exists) return null;
          return normalize(Object.assign({ id: doc.id }, doc.data()), doc.id);
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
        return ref.set(Object.assign({}, payload), { merge: false }).then(function () { return p; });
      }
      var list = readDemo();
      var idx = -1;
      for (var i = 0; i < list.length; i++) if (list[i].id === p.id) { idx = i; break; }
      if (idx === -1) list.push(p); else list[idx] = p;
      var ok = writeDemo(list);
      if (!ok) return Promise.reject(new Error("This browser's local storage is full. Large demo uploads may exceed the quota — connect Firebase to store real media."));
      return Promise.resolve(p);
    },

    deleteProject: function (id) {
      if (store.isFirebase()) {
        return fb.db.collection(K.COLLECTION).doc(id).delete();
      }
      var list = readDemo().filter(function (p) { return p.id !== id; });
      writeDemo(list);
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

    /* Upload one or more files, returns [{ url, path, label }] */
    uploadImages: function (files, slug, onProgress) {
      files = Array.prototype.slice.call(files || []);
      if (store.isFirebase()) {
        var done = 0;
        var out = [];
        var chain = Promise.resolve();
        files.forEach(function (file) {
          chain = chain.then(function () {
            var safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            var path = K.STORAGE_DIR + "/" + (slug || "unfiled") + "/" + Date.now() + "-" + safe;
            var ref = fb.storage.ref(path);
            return ref.put(file).then(function (snap) {
              return snap.ref.getDownloadURL().then(function (url) {
                out.push({ url: url, path: path, label: file.name.replace(/\.[a-z0-9]+$/i, "") });
                done++;
                if (onProgress) onProgress(done, files.length);
              });
            });
          });
        });
        return chain.then(function () { return out; });
      }
      /* demo mode — downscale to data URLs */
      var results = [];
      var seq = files.reduce(function (acc, f) { return acc.then(function () {
        return K.fileToDataURL(f).then(function (dataUrl) {
          results.push({ url: dataUrl, path: null, label: f.name.replace(/\.[a-z0-9]+$/i, ""), dataUrl: true });
          if (onProgress) onProgress(results.length, files.length);
        });
      }); }, Promise.resolve());
      return seq.then(function () { return results; });
    },

    deleteImage: function (image) {
      if (store.isFirebase() && image && image.path) {
        return fb.storage.ref(image.path).delete().catch(function () { /* already gone */ });
      }
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
      return store.isFirebase() && fb.auth ? fb.auth.currentUser : null;
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
