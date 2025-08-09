
/*! Auth.js – Firebase loader + helpers (no bundler required)
 *  - Dynamically loads Firebase compat SDKs
 *  - Initializes with your config
 *  - Exposes helpers via window.Auth
 */
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
    // Load compat SDKs in sequence to ensure order
    if (!window.firebase || !firebase?.apps?.length) {
      await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js");
      firebase.initializeApp(CONFIG);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();
    try { await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch(e) {}

    // Helpers
    async function register({email, password, username}){
      if(!email || !password) throw new Error("Email und Passwort erforderlich.");
      const snap = await db.collection('users').where('username','==', (username||'').trim()).limit(1).get();
      if(!username || !username.trim() || !snap.empty) throw new Error("Username leer oder bereits vergeben.");
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection('users').doc(cred.user.uid).set({
        username: username.trim(),
        email, createdAt: firebase.firestore.FieldValue.serverTimestamp()
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

  // Expose a ready promise immediately
  window.Auth = { ready: (async ()=>{ try { await init(); return true; } catch(e){ console.error(e); return false; } })() };
})();
