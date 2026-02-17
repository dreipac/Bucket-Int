import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
const REACT_LOGIN_URL = "https://dreipac.github.io/straton-login/";


const SUPABASE_URL = "https://fbzjlkwrlvcoqpgmvluw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiempsa3dybHZjb3FwZ212bHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMzE2NDIsImV4cCI6MjA3NzkwNzY0Mn0.5hmwCz_i8JvZ0qvrh7OpOq2_CfaWgYQM6c1Czdzh3Bo";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

/* ---------- Helpers ---------- */

// Login-URL absolut (bezogen auf Projektbasis) + next=...
function buildLoginHref() {
  const here = location.pathname + location.search + location.hash;

  const url = new URL(REACT_LOGIN_URL);
  url.searchParams.set("next", here); // wohin nach Login zurück
  return url.toString();
}





/* ---------- Session initialisieren ---------- */

const { data: { session } } = await sb.auth.getSession();
window.__SB_USER__ = session?.user || null;

// Supabase ready
window.__SB_READY__ = true;
window.dispatchEvent(new Event("sb-ready"));

/* ---------- Auth-Events ---------- */

sb.auth.onAuthStateChange((event, session) => {
  window.__SB_USER__ = session?.user || null;

  if (event === "SIGNED_OUT" || !session?.user) {
    const href = buildLoginHref();   // gibt auf login.html -> null zurück
    if (href) location.href = href;  // nur redirecten, wenn wir *nicht* schon auf login.html sind
    return;
  }





