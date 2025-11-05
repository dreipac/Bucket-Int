  import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

  // ⬇️ Deine Werte einsetzen
  const SUPABASE_URL = "https://fbzjlkwrlvcoqpgmvluw.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiempsa3dybHZjb3FwZ212bHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMzE2NDIsImV4cCI6MjA3NzkwNzY0Mn0.5hmwCz_i8JvZ0qvrh7OpOq2_CfaWgYQM6c1Czdzh3Bo";

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.sb = sb;

  // Session einmalig holen und global setzen
  const { data: { session } } = await sb.auth.getSession();
  window.__SB_USER__ = session?.user || null;

  // Signal: Supabase ist bereit
  window.__SB_READY__ = true;
  window.dispatchEvent(new Event("sb-ready"));

  // Auf spätere Änderungen reagieren (Login/Logout/Token-Refresh)
  sb.auth.onAuthStateChange((event, session) => {
    window.__SB_USER__ = session?.user || null;

    if (event === "SIGNED_OUT" || !session?.user) {
      // Bei Logout immer zurück zur Login-Seite
      if (!/login\.html$/i.test(location.pathname)) {
        location.href = "login.html";
      }
    }
  });
