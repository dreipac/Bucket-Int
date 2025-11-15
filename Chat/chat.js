// chat.js
import "../shared/supabase.js";

// Auf Supabase warten
const waitForSB = () =>
  new Promise((resolve) => {
    if (window.__SB_READY__) return resolve();
    window.addEventListener("sb-ready", resolve, { once: true });
  });

await waitForSB();
if (!window.__SB_USER__) {
  const returnTo = encodeURIComponent("/Chat/chat.html");
  location.replace(`../login/login.html?returnTo=${returnTo}`);
}

const sb = window.sb;
const me = window.__SB_USER__.id;

// DOM
const contactList = document.getElementById("contactList");
const messageList = document.getElementById("messageList");
const composer = document.getElementById("composer");
const input = document.getElementById("messageInput");
const titleEl = document.getElementById("activeChatName");


let activePeerId = null;
let subscription = null;

// Duplikate vermeiden (optimistisch + Realtime)
const renderedKeys = new Set();
function makeKey(msg) {
  // Bevorzugt echte DB-ID, sonst stabiler Fallback
  return msg.id ?? `${msg.sender_id}|${msg.receiver_id}|${msg.text}|${msg.created_at}`;
}


/* ---------- Kontakte ---------- */

async function loadContacts() {
  // Akzeptierte Beziehungen, bei denen ich beteiligt bin
  const { data, error } = await sb.rpc("get_contacts_for_user", { uid: me });
  if (error) return console.error(error);

  contactList.innerHTML = "";
  data.forEach((peerId) => {
    const li = document.createElement("li");
    li.textContent = peerId;
    li.dataset.peer = peerId;
    contactList.appendChild(li);
  });
}

/* ---------- Chat Auswahl ---------- */

contactList.addEventListener("click", async (e) => {
  const li = e.target.closest("li");
  if (!li) return;

  const peerId = li.dataset.peer;
  if (!peerId) return;

  await openChat(peerId);
});

async function openChat(peerId) {
  activePeerId = peerId;
  titleEl.textContent = `Chat mit ${peerId}`;
  messageList.innerHTML = "";
  renderedKeys.clear(); // <- NEU: Duplikat-Set pro Chat zurücksetzen


  // Alte Realtime unsub
  if (subscription) {
    sb.removeChannel(subscription);
    subscription = null;
  }

  // Historie laden
  const { data, error } = await sb
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${me},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${me})`)
    .order("created_at", { ascending: true });

  if (error) return alert("Fehler beim Laden der Nachrichten: " + error.message);
  data.forEach(renderMessage);

// Realtime-Subscription: höre auf ALLE Inserts und filtere im Callback auf dieses 1:1
subscription = sb
  .channel("room:" + [me, peerId].sort().join("-"))
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    (payload) => {
      const msg = payload.new;
      const isBetween =
        (msg.sender_id === me && msg.receiver_id === peerId) ||
        (msg.sender_id === peerId && msg.receiver_id === me);
      if (isBetween) renderMessage(msg);
    }
  )
  .subscribe();

}

/* ---------- Senden ---------- */

composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activePeerId) return alert("Bitte zuerst einen Kontakt auswählen.");
  const text = input.value.trim();
  if (!text) return;

  // Optional: Schreibrecht absichern (nur accepted Kontakte)
  const { data: related, error: relErr } = await sb
    .from("contacts")
    .select("id")
    .or(`and(requester_id.eq.${me},addressee_id.eq.${activePeerId}),and(requester_id.eq.${activePeerId},addressee_id.eq.${me})`)
    .eq("status", "accepted")
    .limit(1);

  if (relErr) return alert("Fehler: " + relErr.message);
  if (!related || !related.length) return alert("Ihr seid (noch) keine bestätigten Kontakte.");

const { data, error } = await sb
  .from("messages")
  .insert({ sender_id: me, receiver_id: activePeerId, text })
  .select("*")
  .single();

if (error) return alert("Senden fehlgeschlagen: " + error.message);

// Falls PostgREST kein Row-Data zurückgibt, trotzdem sofort anzeigen (optimistisches Echo)
const msg = data ?? {
  sender_id: me,
  receiver_id: activePeerId,
  text,
  created_at: new Date().toISOString(),
};
renderMessage(msg);

input.value = "";

});

/* ---------- Rendering ---------- */

function renderMessage(msg) {
  const key = makeKey(msg);
  if (renderedKeys.has(key)) return;
  renderedKeys.add(key);

  const li = document.createElement("li");
  li.className = "msg " + (msg.sender_id === me ? "me" : "them");
  li.innerHTML = `
    <div>${escapeHTML(msg.text)}</div>
    <div class="meta">${new Date(msg.created_at).toLocaleString()}</div>
  `;
  messageList.appendChild(li);
  messageList.scrollTop = messageList.scrollHeight;
}


function escapeHTML(s){
  return s.replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

/* ---------- Initial laden ---------- */
await loadContacts();
