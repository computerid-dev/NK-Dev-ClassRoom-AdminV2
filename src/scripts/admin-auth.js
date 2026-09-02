import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "./firebase-init.js";
import { ADMIN_EMAIL } from "./admin-config.js";

const $ = (sel) => document.querySelector(sel);

onAuthStateChanged(auth, (user) => {
  if (user && user.email === ADMIN_EMAIL) {
    window.location.href = "/dashboard.html";
  }
});

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = $("#login-error");
  errEl.hidden = true;
  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  const password = $("#password").value;

  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
    window.location.href = "/dashboard.html";
  } catch (err) {
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      // Belum ada akun admin sama sekali -> ini login pertama, langsung buatkan.
      try {
        await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, password);
        window.location.href = "/dashboard.html";
        return;
      } catch (createErr) {
        errEl.textContent = createErr.message || "Gagal membuat akun admin.";
        errEl.hidden = false;
      }
    } else if (err.code === "auth/wrong-password") {
      errEl.textContent = "Password salah.";
      errEl.hidden = false;
    } else {
      errEl.textContent = err.message || "Gagal masuk, coba lagi.";
      errEl.hidden = false;
    }
  } finally {
    submitBtn.disabled = false;
  }
});
