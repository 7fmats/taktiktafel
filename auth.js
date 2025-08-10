
/*! Auth.js – Firebase loader + helpers (no bundler required) */
(function(){
  const CONFIG = {"apiKey": "AIzaSyD4NCsBAyV22M-ISurQOWEWi0ZyfuX6FYk", "authDomain": "taktiktafel-582a9.firebaseapp.com", "projectId": "taktiktafel-582a9", "storageBucket": "taktiktafel-582a9.firebasestorage.app", "messagingSenderId": "837580144249", "appId": "1:837580144249:web:6752629889e593e8e25ea8"};
  function loadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  async function init(){
    if (!window.firebase || !firebase?.apps?.length) {
      await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js");
      firebase.initializeApp(CONFIG);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();
    try { await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch(e) {}
    async function register({email, password, username}){
      if(!email || !password) throw new Error("Email und Passwort erforderlich.");
      if(!username || !username.trim()) throw new Error("Username erforderlich.");
      // 1) Create user first (become authenticated for rules)
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      const uid = cred.user.uid;
      // 2) Check username uniqueness (now allowed)
      const uname = username.trim();
      const snap = await db.collection('users').where('username','==', uname).limit(1).get();
      if(!snap.empty){
        try { await cred.user.delete(); } catch(e){}
        throw new Error("Username bereits vergeben. Bitte anderen wählen.");
      }
      // 3) Save profile
      await db.collection('users').doc(uid).set({
        username: uname,
        email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return cred.user;
    }
    function login({email, password}){
      if(!email || !password) throw new Error("Email und Passwort erforderlich.");
      return auth.signInWithEmailAndPassword(email, password);
    }
    function logout(){ return auth.signOut(); }
    function sendPasswordReset(email){
      if(!email) throw new Error("E‑Mail erforderlich.");
      return auth.sendPasswordResetEmail(email);
    }
    function onAuth(callback){ return auth.onAuthStateChanged(callback); }
    function requireAuth(redirect = "auth.html"){
      return auth.onAuthStateChanged(user => {
        if(!user){
          const here = location.pathname + location.search + location.hash;
          location.href = redirect + "?redirect=" + encodeURIComponent(here);
        }
      });
    }
    async function getUserProfile(uid){
      uid = uid || (auth.currentUser && auth.currentUser.uid);
      if(!uid) return null;
      const doc = await db.collection('users').doc(uid).get();
      return doc.exists ? ({ id: doc.id, ...doc.data() }) : null;
    }
    async function setUserProfile(uid, data){
      uid = uid || (auth.currentUser && auth.currentUser.uid);
      if(!uid) throw new Error("Kein Nutzer angemeldet.");
      await db.collection('users').doc(uid).set(data, { merge: true });
      return getUserProfile(uid);
    }
    window.Auth = {
      firebase, auth, db,
      register, login, logout,
      sendPasswordReset, onAuth, requireAuth,
      getUserProfile, setUserProfile,
      ready: Promise.resolve(true)
    };
  }
  window.Auth = { ready: (async ()=>{ try { await init(); return true; } catch(e){ console.error(e); return false; } })() };
// --- Logout-Funktion bereitstellen ---
;(function () {
  // Falls deine auth.js bereits ein "auth" (getAuth()) hat, nutze das.
  // Sonst laden wir sicherheitshalber die Funktion aus dem modularen SDK nach.
  async function doSignOut() {
    try {
      // modular v9:
      const mod = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js');
      const getAuth = mod.getAuth || window.getAuth;
      const signOut = mod.signOut || window.signOut;
      const auth = getAuth();
      await signOut(auth);
    } catch (e) {
      console.error('Logout fehlgeschlagen:', e);
      alert('Abmelden fehlgeschlagen. Bitte erneut versuchen.');
      throw e;
    }
  }

  // Falls es schon ein globales Auth-Objekt gibt, hängen wir die Methode dran:
  if (window.Auth) {
    window.Auth.signOut = doSignOut;
  } else {
    // Notfalls eines anlegen (falls deine auth.js das noch nicht tut)
    window.Auth = {
      ready: Promise.resolve(),
      requireAuth: () => {},
      onAuth: () => {},
      signOut: doSignOut
    };
  }
})();
