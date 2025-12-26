// ============================================
// Supabase Client Configuration
// ============================================

const SUPABASE_URL = "https://accgscczuyspvjuznldn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjY2dzY2N6dXlzcHZqdXpubGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTgyNTAsImV4cCI6MjA4MjE5NDI1MH0.f4R8_qoKGLc_Dhw1GQrmC0ZK4NNpsUlBo3Hol7AonDI";

// Initialize Supabase client (UMD build exposes as window.supabase)
let supabase = null;

try {
  if (window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✓ Supabase initialized");
  } else {
    console.error("✗ Supabase library not loaded. window.supabase =", window.supabase);
  }
} catch (e) {
  console.error("✗ Supabase init error:", e);
}

// Get current session user
async function getSessionUser() {
  if (!supabase) {
    console.error("Supabase not available");
    return null;
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session?.user ?? null;
  } catch (err) {
    console.error("Session error:", err);
    return null;
  }
}

// ============================================
// Toast Notification System
// ============================================

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === "success" ? "✓" : "✕"}</span>
    <span class="toast-message">${message}</span>
    <button type="button" class="toast-close">×</button>
  `;

  container.appendChild(toast);
  toast.querySelector(".toast-close").onclick = () => toast.remove();
  setTimeout(() => toast.remove(), 4000);
  requestAnimationFrame(() => toast.classList.add("toast-visible"));
}
