// RTDevent.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, deleteDoc, doc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXrHcMJzQn3cxutg41LZs9oYwEfALe00s",
  authDomain: "ratedeventsgj.firebaseapp.com",
  projectId: "ratedeventsgj",
  storageBucket: "ratedeventsgj.firebasestorage.app",
  messagingSenderId: "527826897689",
  appId: "1:527826897689:web:fb0439fff04a695a599388"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const ADMIN_PIN = "270620";

let allEvents = [];
let currentFilteredEvents = [];
let loggedInOrgID = null;

// ── DATE ──────────────────────────────────────────────────
const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
const now = new Date();
const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
document.getElementById("datePill").textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

// ── LOAD ──────────────────────────────────────────────────
async function loadEvents() {
  try {
    const snap = await getDocs(collection(db, "RTDeventdb"));
    allEvents = snap.docs.map(d => ({ _id: d.id, ...d.data() }));

    // Sort descending by startDate (latest first)
    allEvents.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

    // Populate organizer filter
    const orgNames = [...new Set(allEvents.map(e => e.organizerName).filter(Boolean))].sort();
    const orgFilter = document.getElementById("organizerFilter");
    orgNames.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      orgFilter.appendChild(opt);
    });

    document.getElementById("loadingMsg").style.display = "none";
    if (allEvents.length === 0) {
      document.getElementById("emptyMsg").style.display = "block";
      document.getElementById("countBadge").textContent = "0 Events";
      return;
    }
    currentFilteredEvents = allEvents;
    renderTable(allEvents);
  } catch (err) {
    document.getElementById("loadingMsg").textContent = "Error: " + err.message;
  }
}

// ── RENDER ────────────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById("eventTableBody");
  const table = document.getElementById("eventTable");
  tbody.innerHTML = "";

  if (data.length === 0) {
    table.style.display = "none";
    document.getElementById("emptyMsg").style.display = "block";
    document.getElementById("countBadge").textContent = "0 Events";
    return;
  }
  document.getElementById("emptyMsg").style.display = "none";
  table.style.display = "table";
  document.getElementById("countBadge").textContent = `${data.length} Event${data.length !== 1 ? "s" : ""}`;

  const total = data.length;
  data.forEach((ev, idx) => {
    const srNo = total - idx; // descending: first row gets highest number
    const isUpcoming = ev.startDate && ev.startDate >= todayStr;
    const formatClass = (ev.format || "").toLowerCase();
    const row = document.createElement("tr");
    if (isUpcoming) row.classList.add("upcoming-row");

    const upcomingBadge = isUpcoming ? `<span class="upcoming-badge">UPCOMING</span>` : "";
    row.innerHTML = `
      <td>${srNo}</td>
      <td>${ev.startDateDisplay || ev.startDate || "—"}${upcomingBadge}</td>
      <td class="event-name-cell">${ev.eventName || "—"}</td>
      <td>${ev.organizerName || "—"}</td>
      <td>${ev.district || "—"}</td>
      <td>${ev.prizeFund || "To Be Announced"}</td>
      <td>${ev.system || "—"}</td>
      <td><span class="format-pill ${formatClass}">${ev.format || "—"}</span></td>
      <td>${ev.timeControl || "—"}</td>
      <td><button class="more-btn" onclick="openPopup('${ev._id}')">More Details</button></td>
    `;
    tbody.appendChild(row);
  });
  currentFilteredEvents = data;
}

// ── POPUP ─────────────────────────────────────────────────
window.openPopup = function(docId) {
  const ev = allEvents.find(e => e._id === docId);
  if (!ev) return;

  const fees = ev.entryFees || {};
  const eb = fees.earlyBird || {}; const ac = fees.actual || {}; const le = fees.lateEntry || {};
  let feesHtml = "";
  if (eb.fees && eb.fees !== "—") feesHtml += `<tr><td>Early Bird (till ${eb.date || "—"})</td><td>${eb.fees}</td></tr>`;
  if (ac.fees) feesHtml += `<tr><td>Actual Entry</td><td>${ac.fees}</td></tr>`;
  if (le.fees && le.fees !== "—") feesHtml += `<tr><td>Late Entry (from ${le.date || "—"})</td><td>${le.fees}</td></tr>`;
  if (!feesHtml) feesHtml = `<tr><td colspan="2">To Be Announced</td></tr>`;

  // Tournament Director
  const td = ev.tournamentDirector || {};
  let tdHtml = "";
  if (td.name) {
    const fideLink = td.fideId ? ` <a href="https://ratings.fide.com/profile/${td.fideId}/arbiter_organizer" target="_blank" style="color:var(--blue);font-size:11px;">(FIDE: ${td.fideId})</a>` : "";
    tdHtml = `<div class="popup-section-title">Tournament Director</div>
    <table class="popup-detail-table"><tr><td>Name</td><td>${td.name}${fideLink}</td></tr></table>`;
  }

  // Arbiters
  const arb = ev.arbiters || {};
  const ca = arb.chiefArbiter || {}; const d1 = arb.deputyCA1 || {}; const d2 = arb.deputyCA2 || {};
  let arbRows = "";
  function arbRow(label, person) {
    if (!person.name) return "";
    const fideLink = person.fideId
      ? ` <a href="https://ratings.fide.com/profile/${person.fideId}/arbiter_organizer" target="_blank" style="color:var(--blue);font-size:11px;">(FIDE: ${person.fideId})</a>` : "";
    return `<tr><td>${label}</td><td>${person.name}${fideLink}</td></tr>`;
  }
  arbRows += arbRow("Chief Arbiter", ca);
  arbRows += arbRow("Deputy Chief Arbiter 1", d1);
  arbRows += arbRow("Deputy Chief Arbiter 2", d2);
  const arbHtml = arbRows || `<tr><td colspan="2">Not Announced</td></tr>`;

  const links = ev.links || {};
  function linkBtn(label, icon, cls, url) {
    if (!url) return `<span class="link-btn ${cls} disabled">${icon} ${label}</span>`;
    return `<a class="link-btn ${cls}" href="${url}" target="_blank" rel="noopener">${icon} ${label}</a>`;
  }

  document.getElementById("popupContent").innerHTML = `
    <div class="popup-event-name">${ev.eventName || "—"}</div>
    <div class="popup-organizer">🏆 ${ev.organizerName || "—"}</div>

    <div class="popup-section-title">Links</div>
    <div class="popup-links">
      ${linkBtn("Brochure","📄","brochure",links.brochure)}
      ${linkBtn("Chess Results","♟","chess",links.chessResults)}
      ${linkBtn("Map","📍","map",links.map)}
      ${linkBtn("Live Games","🎥","live",links.liveGames)}
      ${linkBtn("Prize List","🏆","prize",links.prizeList)}
    </div>

    <div class="popup-section-title">Event Details</div>
    <table class="popup-detail-table">
      <tr><td>Start Date</td><td>${ev.startDateDisplay || "—"}</td></tr>
      <tr><td>End Date</td><td>${ev.endDateDisplay || "—"}</td></tr>
      <tr><td>District</td><td>${ev.district || "—"}</td></tr>
      <tr><td>Venue</td><td>${ev.venue || "DECLARE SOON / UPDATE SOON"}</td></tr>
      <tr><td>System</td><td>${ev.system || "—"}</td></tr>
      <tr><td>Format</td><td>${ev.format || "—"}</td></tr>
      <tr><td>Time Control</td><td>${ev.timeControl || "—"}</td></tr>
      <tr><td>Prize Fund</td><td>${ev.prizeFund || "To Be Announced"}</td></tr>
    </table>

    <div class="popup-section-title">Entry Fees</div>
    <table class="popup-detail-table">${feesHtml}</table>

    ${tdHtml}

    <div class="popup-section-title">Arbiters</div>
    <table class="popup-detail-table">${arbHtml}</table>
  `;
  document.getElementById("popupOverlay").classList.add("active");
};

window.closePopup = () => document.getElementById("popupOverlay").classList.remove("active");
document.getElementById("popupOverlay").addEventListener("click", e => { if (e.target.id === "popupOverlay") closePopup(); });

// ── SEARCH & FILTER ───────────────────────────────────────
function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase().trim();
  const district = document.getElementById("districtFilter").value;
  const format = document.getElementById("formatFilter").value;
  const organizer = document.getElementById("organizerFilter").value;
  const filtered = allEvents.filter(ev => {
    return (!district || ev.district === district) &&
           (!format || ev.format === format) &&
           (!organizer || ev.organizerName === organizer) &&
           (!search || (ev.eventName||"").toLowerCase().includes(search) ||
                       (ev.organizerName||"").toLowerCase().includes(search) ||
                       (ev.district||"").toLowerCase().includes(search));
  });
  renderTable(filtered);
}
["searchInput","districtFilter","formatFilter","organizerFilter"].forEach(id => {
  document.getElementById(id).addEventListener(id === "searchInput" ? "input" : "change", applyFilters);
});

// ── MODAL HELPERS ─────────────────────────────────────────
window.openAdminLogin = () => {
  document.getElementById("adminPinInput").value = "";
  document.getElementById("adminPinError").textContent = "";
  document.getElementById("adminLoginModal").classList.add("active");
};
window.openOrgLogin = () => {
  document.getElementById("orgLoginID").value = "";
  document.getElementById("orgLoginPin").value = "";
  document.getElementById("orgPinError").textContent = "";
  document.getElementById("orgLoginModal").classList.add("active");
};
window.closeModal = id => document.getElementById(id).classList.remove("active");
["adminLoginModal","orgLoginModal","eventListModal"].forEach(id => {
  document.getElementById(id).addEventListener("click", e => { if (e.target.id === id) closeModal(id); });
});

// ── ADMIN PIN ─────────────────────────────────────────────
window.verifyAdminPin = () => {
  const pin = document.getElementById("adminPinInput").value.trim();
  if (pin === ADMIN_PIN) {
    closeModal("adminLoginModal");
    showAdminEventList();
  } else {
    document.getElementById("adminPinError").textContent = "Wrong PIN.";
    document.getElementById("adminPinInput").value = "";
  }
};

function showAdminEventList() {
  document.getElementById("eventListTitle").textContent = "All Events (Admin)";
  document.getElementById("eventListSubtitle").textContent = "Edit or delete any event.";
  buildEventList(allEvents, true);
  document.getElementById("eventListModal").classList.add("active");
}

// ── ORGANIZER LOGIN ───────────────────────────────────────
window.verifyOrgLogin = async () => {
  const orgID = document.getElementById("orgLoginID").value.trim();
  const pin = document.getElementById("orgLoginPin").value.trim();
  const errEl = document.getElementById("orgPinError");
  errEl.textContent = "";
  if (!orgID) { errEl.textContent = "Enter your Organizer ID."; return; }
  if (!pin) { errEl.textContent = "Enter your PIN."; return; }
  try {
    const q = query(collection(db, "organizerdb"), where("organizerID", "==", orgID));
    const snap = await getDocs(q);
    if (snap.empty) { errEl.textContent = "Organizer ID not found."; return; }
    const orgData = snap.docs[0].data();
    if (orgData.pin !== pin) { errEl.textContent = "Wrong PIN."; return; }
    loggedInOrgID = orgID;
    closeModal("orgLoginModal");
    const myEvents = allEvents.filter(e => e.organizerID === orgID || e.organizerName === orgData.organizerName);
    document.getElementById("eventListTitle").textContent = "My Events";
    document.getElementById("eventListSubtitle").textContent = `${orgData.organizerName} — ${myEvents.length} event(s)`;
    buildEventList(myEvents, false);
    document.getElementById("eventListModal").classList.add("active");
  } catch (err) { errEl.textContent = "Error: " + err.message; }
};

// ── BUILD EVENT LIST ──────────────────────────────────────
function buildEventList(events, isAdmin) {
  const container = document.getElementById("eventListContent");
  container.innerHTML = "";
  if (events.length === 0) { container.innerHTML = `<div style="text-align:center;color:#78909C;padding:24px;">No events found.</div>`; return; }
  events.forEach(ev => {
    const isPast = ev.endDate && ev.endDate < todayStr;
    const item = document.createElement("div");
    item.className = "event-list-item";
    item.innerHTML = `
      <div>
        <div class="event-list-name">${ev.eventName || "—"}</div>
        <div class="event-list-meta">📅 ${ev.startDateDisplay || "—"} → ${ev.endDateDisplay || "—"} &nbsp;|&nbsp; 📍 ${ev.district || "—"}</div>
      </div>
      <div class="event-list-actions">
        <button class="edit-btn" onclick="editEvent('${ev._id}')">✏️ Edit</button>
        <button class="delete-btn" ${isPast ? "disabled title='Cannot delete past events'" : ""} onclick="deleteEvent('${ev._id}', '${(ev.eventName||"").replace(/'/g,"\\'")}')">🗑 Delete</button>
      </div>`;
    container.appendChild(item);
  });
}

// ── EDIT EVENT ────────────────────────────────────────────
window.editEvent = function(docId) {
  closeModal("eventListModal");
  window.location.href = `RTDeventform.html?editDocId=${docId}`;
};

// ── DELETE EVENT ──────────────────────────────────────────
window.deleteEvent = async function(docId, eventName) {
  if (!confirm(`Delete "${eventName}"? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, "RTDeventdb", docId));
    allEvents = allEvents.filter(e => e._id !== docId);
    alert("✅ Event deleted.");
    closeModal("eventListModal");
    renderTable(allEvents);
  } catch (err) { alert("Error: " + err.message); }
};

// Digits only
document.getElementById("adminPinInput").addEventListener("input", function() { this.value = this.value.replace(/\D/g,""); });
document.getElementById("orgLoginPin").addEventListener("input", function() { this.value = this.value.replace(/\D/g,""); });
document.getElementById("adminPinInput").addEventListener("keydown", e => { if (e.key==="Enter") verifyAdminPin(); });
document.getElementById("orgLoginPin").addEventListener("keydown", e => { if (e.key==="Enter") verifyOrgLogin(); });

loadEvents();
