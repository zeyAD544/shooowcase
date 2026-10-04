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

  /* Firestore collection + Storage folder used by the admin. */
  K.COLLECTION = "projects";
  K.STORAGE_DIR = "projects";

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
