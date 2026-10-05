/* ==========================================================================
   KYN — config.js
   Shared namespace, Firebase configuration placeholders and small utilities.
   Loaded first by every page.
   ========================================================================== */
window.KYN = window.KYN || {};

(function (K) {
  "use strict";

  /* ---------------------------------------------------------------------
     FIREBASE CONFIGURATION
     ---------------------------------------------------------------------
     Replace every "PASTE_..." value with your own Firebase web-app
     configuration (Firebase console → Project settings → Your apps).
     These are PUBLIC web credentials — they are safe to ship in a client.
     They are NOT admin secrets. Real access control lives in the Security
     Rules (see firestore.rules / storage.rules) and Firebase Authentication.

     Until these are filled in, the site runs on the built-in demo dataset
     and the admin dashboard runs in local demo mode. See SETUP.md.
     --------------------------------------------------------------------- */
  K.FIREBASE_CONFIG = {
    apiKey: "AIzaSyA9JMMBbawzzsEFbaRLJk251T-S2Kzd0yk",
    authDomain: "showcase-efd22.firebaseapp.com",
    projectId: "showcase-efd22",
    storageBucket: "showcase-efd22.firebasestorage.app",
    messagingSenderId: "1043678628674",
    appId: "1:1043678628674:web:39dcfb12cee741a23c96db",
    measurementId: "G-G15NNE3QG7"
  };

  /* Firestore collections used by the admin. Project documents stay small;
     image bytes live one-per-document in `media` so the whole app works on
     the free Spark plan (Cloud Storage requires the paid Blaze plan). */
  K.COLLECTION = "projects";
  K.MEDIA_COLLECTION = "media";

  /* Free-mode image limits. Each image is downscaled into a JPEG data URL and
     stored in its own `media` document, so it must fit well inside Firestore's
     1 MiB per-document limit. */
  K.MEDIA_MAX_DIM = 1600;          // longest edge in pixels before encoding
  K.MEDIA_MAX_BYTES = 300 * 1024;  // target binary size (base64 adds ~33%)

  /* Firebase JS SDK version (compat build so pages also work from file://). */
  K.FIREBASE_SDK = "10.12.2";

  /* ---------------------------------------------------------------------
     Firebase readiness — true only when real values are present.
     --------------------------------------------------------------------- */
  K.isFirebaseConfigured = function () {
    var c = K.FIREBASE_CONFIG || {};
    return ["apiKey", "authDomain", "projectId", "storageBucket", "appId"].every(function (key) {
      var v = c[key];
      return typeof v === "string" && v.length > 0 && v.indexOf("PASTE_") === -1;
    });
  };

  /* ---------------------------------------------------------------------
     Utilities
     --------------------------------------------------------------------- */
  K.escapeHtml = function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  K.slugify = function (str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  K.year = function (value) {
    if (!value) return "";
    var d = value.toDate ? value.toDate() : new Date(value);
    if (isNaN(d.getTime())) return "";
    return String(d.getFullYear());
  };

  K.formatDate = function (value) {
    if (!value) return "—";
    var d = value.toDate ? value.toDate() : new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  K.nowISO = function () { return new Date().toISOString(); };

  K.prefersReducedMotion = function () {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  K.loadScript = function (src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[data-src="' + src + '"]')) return resolve();
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.dataset.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(s);
    });
  };

  /* Toast notifications ---------------------------------------------------- */
  K.toast = function (message, kind) {
    var stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    var el = document.createElement("div");
    el.className = "toast";
    el.dataset.kind = kind || "info";
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity 240ms, transform 240ms";
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      setTimeout(function () { el.remove(); }, 260);
    }, 3200);
  };

  /* Clipboard copy with a graceful fallback -------------------------------- */
  K.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        resolve();
      } catch (err) { reject(err); }
    });
  };

  /* Turn a File into a downscaled JPEG data URL that is guaranteed to fit
     inside `maxBytes` (binary), stepping quality then dimensions down. This
     is what keeps free-mode uploads inside Firestore's document size limit.
     Transparency is flattened onto a dark background (the site's theme). */
  K.fileToBoundedDataURL = function (file, opts) {
    opts = opts || {};
    var maxDim = opts.maxDim || K.MEDIA_MAX_DIM || 1600;
    var maxBytes = opts.maxBytes || K.MEDIA_MAX_BYTES || 300 * 1024;
    var background = opts.background || "#0a0a0b";
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Could not read file")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("Could not decode image")); };
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) { reject(new Error("Image has no dimensions")); return; }
          var fit = Math.min(1, maxDim / Math.max(w, h));
          var baseW = Math.max(1, Math.round(w * fit));
          var baseH = Math.max(1, Math.round(h * fit));
          var baseMax = Math.max(baseW, baseH);
          var canvas = document.createElement("canvas");
          var ctx = canvas.getContext("2d");
          var quality = 0.82;
          var dim = baseMax;
          for (var guard = 0; guard < 14; guard++) {
            var s = dim / baseMax;
            var cw = Math.max(1, Math.round(baseW * s));
            var ch = Math.max(1, Math.round(baseH * s));
            canvas.width = cw; canvas.height = ch;
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, cw, ch);
            ctx.drawImage(img, 0, 0, cw, ch);
            var url = canvas.toDataURL("image/jpeg", quality);
            var comma = url.indexOf(",");
            var bytes = Math.ceil((url.length - comma - 1) * 3 / 4);
            if (bytes <= maxBytes || cw <= 2 || ch <= 2) { resolve(url); return; }
            if (quality > 0.5) quality = Math.max(0.5, quality - 0.12);
            else dim = Math.max(2, Math.round(dim * 0.82));
          }
          resolve(canvas.toDataURL("image/jpeg", 0.5));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  /* Turn a File into a downscaled JPEG data URL (used by demo-mode uploads). */
  K.fileToDataURL = function (file, maxSize) {
    maxSize = maxSize || 1600;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Could not read file")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("Could not decode image")); };
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, maxSize / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, cw, ch);
          var isPng = file.type === "image/png";
          try {
            resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.85));
          } catch (e) { reject(e); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };
})(window.KYN);
