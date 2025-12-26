// ============================================
// Authentication Logic
// ============================================

(function () {
  const $ = (id) => document.getElementById(id);

  function mapAuthError(msg) {
    const m = (msg || "").toLowerCase();
    if (m.includes("invalid login")) return "Incorrect email or password.";
    if (m.includes("email not confirmed")) return "Please confirm your email first.";
    if (m.includes("already registered")) return "Account already exists. Try logging in.";
    if (m.includes("password")) return "Password must be at least 6 characters.";
    if (m.includes("invalid email")) return "Please enter a valid email address.";
    return msg || "Authentication failed.";
  }

  function showError(msg) {
    const el = $("authError");
    const ok = $("authSuccess");
    if (ok) ok.style.display = "none";
    if (el) { el.textContent = msg; el.style.display = "block"; }
  }

  function showSuccess(msg) {
    const el = $("authSuccess");
    const err = $("authError");
    if (err) err.style.display = "none";
    if (el) { el.textContent = msg; el.style.display = "block"; }
  }

  function clearMessages() {
    const err = $("authError");
    const ok = $("authSuccess");
    if (err) { err.textContent = ""; err.style.display = "none"; }
    if (ok) { ok.textContent = ""; ok.style.display = "none"; }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function redirectIfLoggedIn() {
    const user = await getSessionUser();
    if (user) {
      window.location.replace("dashboard.html");
      return true;
    }
    return false;
  }

  // LOGIN
  async function handleLogin(email, password) {
    clearMessages();

    if (!supabase) {
      showError("Connection error. Please refresh the page.");
      return;
    }

    if (!email || !password) {
      showError("Please enter email and password.");
      return;
    }

    if (!isValidEmail(email)) {
      showError("Please enter a valid email address.");
      return;
    }

    const btn = $("loginBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Signing in..."; }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        showError(mapAuthError(error.message));
        return;
      }

      showToast("Welcome back!", "success");
      setTimeout(() => window.location.replace("dashboard.html"), 500);
    } catch (err) {
      showError("Login failed: " + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Sign In"; }
    }
  }

  // REGISTER
  async function handleRegister(email, password, confirmPassword) {
    clearMessages();

    if (!supabase) {
      showError("Connection error. Please refresh the page.");
      return;
    }

    if (!email || !password) {
      showError("Please enter email and password.");
      return;
    }

    if (!isValidEmail(email)) {
      showError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    const btn = $("registerBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Creating account..."; }

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        showError(mapAuthError(error.message));
        return;
      }

      if (data?.user?.identities?.length === 0) {
        showError("Account already exists. Try logging in.");
        return;
      }

      showSuccess("🎉 Account created! Redirecting to login...");
      showToast("Account created!", "success");
      setTimeout(() => window.location.replace("login.html"), 1500);
    } catch (err) {
      showError("Registration failed: " + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Create Account"; }
    }
  }

  // INIT
  document.addEventListener("DOMContentLoaded", async () => {
    // Check if supabase loaded
    if (!supabase) {
      showError("Failed to load. Please refresh the page.");
      return;
    }

    if (await redirectIfLoggedIn()) return;

    const emailInput = $("authEmail");
    const passInput = $("authPassword");
    const confirmInput = $("authConfirmPassword");
    const pwToggle = $("pwToggle");

    // Clear on input
    emailInput?.addEventListener("input", clearMessages);
    passInput?.addEventListener("input", clearMessages);
    confirmInput?.addEventListener("input", clearMessages);

    // Password toggle
    if (pwToggle && passInput) {
      pwToggle.onclick = (e) => {
        e.preventDefault();
        const show = passInput.type === "password";
        passInput.type = show ? "text" : "password";
        if (confirmInput) confirmInput.type = show ? "text" : "password";
        pwToggle.textContent = show ? "🙈" : "👁";
      };
    }

    // Login handlers
    const loginBtn = $("loginBtn");
    const loginForm = $("loginForm");
    if (loginBtn) loginBtn.onclick = (e) => { e.preventDefault(); handleLogin(emailInput?.value.trim(), passInput?.value); };
    if (loginForm) loginForm.onsubmit = (e) => { e.preventDefault(); handleLogin(emailInput?.value.trim(), passInput?.value); };

    // Register handlers
    const registerBtn = $("registerBtn");
    const registerForm = $("registerForm");
    if (registerBtn) registerBtn.onclick = (e) => { e.preventDefault(); handleRegister(emailInput?.value.trim(), passInput?.value, confirmInput?.value); };
    if (registerForm) registerForm.onsubmit = (e) => { e.preventDefault(); handleRegister(emailInput?.value.trim(), passInput?.value, confirmInput?.value); };
  });
})();
