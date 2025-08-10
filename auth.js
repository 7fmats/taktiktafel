// auth.js — Firebase Init + einfache Auth-Utilitys für alle Seiten

// >>>> Deine Firebase Config hier eintragen (wie bereits von dir erhalten) <<<<
const firebaseConfig = {
  apiKey: "AIzaSyD4NCsBAyV22M-ISurQOWEWi0ZyfuX6FYk",
  authDomain: "taktiktafel-582a9.firebaseapp.com",
  projectId: "taktiktafel-582a9",
  storageBucket: "taktiktafel-582a9.firebasestorage.app",
  messagingSenderId: "837580144249",
  appId: "1:837580144249:web:6752629889e593e8e25ea8"
};

// Wir nutzen die modularen v9-CDN-Module und kapseln alles in ein IIFE:
(function () {
  let app, auth;
  let authListeners = [];

  // Einmalige Initialisierung + Bereitstellen der API
  const ready = (async () => {
    // Module dynamisch laden (funktioniert auf GitHub Pages)
    const appMod  = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js');

    const { initializeApp } = appMod;
    const { getAuth, onAuthStateChanged, signInWithEmailAndPassword,
            createUserWithEmailAndPassword, signOut, updateProfile } = authMod;

    app  = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Globale Hilfsfunktionen:
    async function doSignOut() {
      await signOut(auth);
    }
    function onAuth(cb) {
      // Sofort feuern, wenn bereits bekannt:
      if (auth.currentUser) cb(auth.currentUser);
      authListeners.push(cb);
    }
    function requireAuth(loginUrl = 'auth.html') {
      onAuthStateChanged(auth, (user) => {
        // Weiterreichen an UI-Callbacks
        authListeners.forEach(fn => { try { fn(user); } catch (_) {} });
        // Guard:
        if (!user) {
          // nur weiterleiten, wenn wir nicht schon auf der Login-Seite sind
          if (!location.pathname.endsWith('/auth.html') && !location.pathname.endsWith('auth.html')) {
            const back = encodeURIComponent(location.pathname + location.search);
            location.replace(`auth.html?redirect=${back}`);
          }
        }
      });
    }
    function attachAuthListener() {
      // Stellt sicher, dass auch ohne requireAuth() die UI-Callbacks User-Änderungen bekommen
      onAuthStateChanged(auth, (user) => {
        authListeners.forEach(fn => { try { fn(user); } catch (_) {} });
      });
    }
    attachAuthListener();

    // Public API
    window.Auth = {
      // Promise, das erfüllt ist, wenn Firebase geladen ist
      ready: Promise.resolve(),
      // aktueller User (Getter)
      get currentUser() { return auth.currentUser || null; },
      // UI informiert halten
      onAuth,
      // Seiten schützen
      requireAuth,
      // Logout für Buttons
      signOut: doSignOut,

      // Optional: einfache Login/Signup-Helfer (falls du sie brauchst)
      async signIn(email, password) {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        return user;
      },
      async signUp(email, password, displayName) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await (await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'))
            .then(m => m.updateProfile(user, { displayName }));
        }
        return user;
      }
    };
  })().catch(err => {
    console.error('Firebase-Init fehlgeschlagen:', err);
    alert('Fehler bei der Anmeldung/Initialisierung. Bitte Seite neu laden.');
  });

  // Für Seiten, die auf Auth.ready warten:
  Object.defineProperty(window, 'Auth', {
    configurable: true,
    enumerable: true,
    get() {
      return {
        ready,
        onAuth: (...args) => ready.then(() => window.Auth.onAuth(...args)),
        requireAuth: (...args) => ready.then(() => window.Auth.requireAuth(...args)),
        signOut: (...args) => ready.then(() => window.Auth.signOut(...args)),
        get currentUser() { return null; }
      };
    },
    set(v) {
      Object.defineProperty(window, 'Auth', { value: v, writable: false, configurable: true });
    }
  });
})();
