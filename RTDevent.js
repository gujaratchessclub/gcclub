// RTDevent.js — Enhanced with Chess Animations & Share Feature
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
let currentPopupDocId = null; // track which event popup is open

// ── DATE ──────────────────────────────────────────────────
const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
const now = new Date();
const todayStr = now.toISOString().split("T")[0];
document.getElementById("datePill").textContent =
  `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

// ── CHESS CANVAS ANIMATION ────────────────────────────────
(function initChessCanvas() {
  const canvas = document.getElementById("chessCanvas");
  const header = canvas.parentElement;
  const ctx = canvas.getContext("2d");

  const PIECES = ["♔","♕","♖","♗","♘","♙","♚","♛","♜","♝","♞","♟"];

  function resize() {
    canvas.width = header.offsetWidth;
    canvas.height = header.offsetHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  // Create floating piece objects
  const pieces = Array.from({length: 18}, () => ({
    piece: PIECES[Math.floor(Math.random() * PIECES.length)],
    x: Math.random() * 100,      // percent
    y: Math.random() * 100,
    vx: (Math.random() - 0.5) * 0.06,
    vy: (Math.random() - 0.5) * 0.04,
    size: 16 + Math.random() * 20,
    opacity: 0.05 + Math.random() * 0.1,
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 0.6,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;

    pieces.forEach(p => {
      // Gentle drift
      p.x += p.vx * p.speed;
      p.y += p.vy * p.speed;
      // Bounce off edges
      if (p.x < 0 || p.x > 100) p.vx *= -1;
      if (p.y < 0 || p.y > 100) p.vy *= -1;

      // Breathe opacity
      const breathe = Math.sin(frame * 0.012 + p.phase) * 0.03;
      ctx.globalAlpha = Math.max(0.02, p.opacity + breathe);
      ctx.font = `${p.size}px serif`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(p.piece, (p.x / 100) * canvas.width, (p.y / 100) * canvas.height);
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg, duration = 2600) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

// ── LOAD ──────────────────────────────────────────────────
async function loadEvents() {
  try {
    const snap = await getDocs(collection(db, "RTDeventdb"));
    allEvents = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    allEvents.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

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

    // Check for deep link: ?event=docId
    const params = new URLSearchParams(window.location.search);
    const deepId = params.get("event");
    if (deepId) {
      setTimeout(() => openPopup(deepId), 400);
    }
  } catch (err) {
    document.getElementById("loadingMsg").innerHTML =
      `<div style="text-align:center;padding:48px;color:#C62828;">⚠️ Error: ${err.message}</div>`;
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
  document.getElementById("countBadge").textContent =
    `${data.length} Event${data.length !== 1 ? "s" : ""}`;

  const total = data.length;
  data.forEach((ev, idx) => {
    const srNo = total - idx;
    const isUpcoming = ev.startDate && ev.startDate >= todayStr;
    const formatClass = (ev.format || "").toLowerCase();
    const row = document.createElement("tr");
    if (isUpcoming) row.classList.add("upcoming-row");
    // Staggered animation
    row.style.animationDelay = `${idx * 35}ms`;

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
  currentPopupDocId = docId;

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
    const fideLink = td.fideId
      ? ` <a href="https://ratings.fide.com/profile/${td.fideId}/arbiter_organizer" target="_blank" style="color:var(--blue);font-size:11px;">(FIDE: ${td.fideId})</a>` : "";
    tdHtml = `<div class="popup-section-title">🎯 Tournament Director</div>
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

  // Build deep link for this event
  const deepLink = `${window.location.origin}${window.location.pathname}?event=${docId}`;

  document.getElementById("popupContent").innerHTML = `
    <div class="popup-event-name">${ev.eventName || "—"}</div>
    <div class="popup-organizer">🏆 ${ev.organizerName || "—"}</div>

    <button class="share-event-btn" onclick="shareEvent('${docId}')">
      <span class="share-icon">📤</span> Share Event
    </button>
    <div class="share-result-area" id="shareResultArea"></div>

    <div class="popup-section-title">🔗 Links</div>
    <div class="popup-links">
      ${linkBtn("Brochure","📄","brochure",links.brochure)}
      ${linkBtn("Chess Results","♟","chess",links.chessResults)}
      ${linkBtn("Map Venue","📍","map",links.map)}
      ${linkBtn("Live Games","🎥","live",links.liveGames)}
      ${linkBtn("Prize List","🏆","prize",links.prizeList)}
      ${linkBtn("Registration Link","📝","register",links.register)}
      ${linkBtn("Register through GCC","♟","gcc",links.registerGcc)}
      ${linkBtn("Event Photos","📸","photos",links.photographs)}
    </div>

    <div class="popup-section-title">📋 Event Details</div>
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

    <div class="popup-section-title">💰 Entry Fees</div>
    <table class="popup-detail-table">${feesHtml}</table>

    ${tdHtml}

    <div class="popup-section-title">⚖️ Arbiters</div>
    <table class="popup-detail-table">${arbHtml}</table>
  `;
  document.getElementById("popupOverlay").classList.add("active");
};

window.closePopup = () => {
  document.getElementById("popupOverlay").classList.remove("active");
  currentPopupDocId = null;
};
document.getElementById("popupOverlay").addEventListener("click", e => {
  if (e.target.id === "popupOverlay") closePopup();
});

// ── SHARE EVENT ───────────────────────────────────────────
window.shareEvent = async function(docId) {
  const ev = allEvents.find(e => e._id === docId);
  if (!ev) return;

  const area = document.getElementById("shareResultArea");
  area.classList.add("visible");
  area.innerHTML = `<div class="share-generating"><div class="share-spinner"></div>Generating share image…</div>`;

  // Small delay for UX feel
  await new Promise(r => setTimeout(r, 350));

  try {
    const dataURL = await generateShareCard(ev);
    const deepLink = `${window.location.origin}${window.location.pathname}?event=${docId}`;

    area.innerHTML = `
      <img src="${dataURL}" class="share-img-preview" alt="Event share card"/>
      <div class="share-link-row">
        <span class="share-link-text" title="${deepLink}">${deepLink}</span>
        <button class="copy-link-btn" id="copyLinkBtn" onclick="copyDeepLink('${deepLink}')">Copy Link</button>
      </div>
      <div class="share-actions-row">
        <a class="share-dl-btn" id="shareDownloadBtn" download="${(ev.eventName||'event').replace(/\s+/g,'-')}-GCC.jpg">
          ⬇️ Download JPG
        </a>
        <button class="share-dl-btn" onclick="copyShareImage('${docId}')">📋 Copy Image</button>
      </div>
      <div style="font-size:11px;color:#78909C;margin-top:10px;line-height:1.5;">
        💡 Save the image, then share on WhatsApp with this link as caption — viewers can tap it to open event details directly.
      </div>
    `;

    // Set download href
    document.getElementById("shareDownloadBtn").href = dataURL;

    // Scroll to share area
    area.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    area.innerHTML = `<div style="color:#C62828;font-size:13px;padding:8px;">⚠️ Could not generate image: ${err.message}</div>`;
  }
};

window.copyDeepLink = function(url) {
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById("copyLinkBtn");
    if (btn) { btn.textContent = "✓ Copied!"; btn.classList.add("copied"); }
    showToast("✓ Link copied to clipboard!");
    setTimeout(() => {
      if (btn) { btn.textContent = "Copy Link"; btn.classList.remove("copied"); }
    }, 2000);
  }).catch(() => showToast("Could not copy — please copy manually."));
};

window.copyShareImage = async function(docId) {
  const ev = allEvents.find(e => e._id === docId);
  if (!ev) return;
  try {
    const dataURL = await generateShareCard(ev);
    const blob = await (await fetch(dataURL)).blob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    showToast("✓ Image copied to clipboard!");
  } catch {
    showToast("Copy image not supported — use Download instead.");
  }
};

// ── GENERATE SHARE CARD (HD Canvas → JPG) ─────────────────
async function generateShareCard(ev) {
  const W = 1080, H = 1080;
  const canvas = document.getElementById("shareCanvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d");

  // ── Background: chess board pattern + gradient ──
  // Dark squares chess pattern
  const sq = 90; // 12 squares across
  for (let row = 0; row < H / sq; row++) {
    for (let col = 0; col < W / sq; col++) {
      c.fillStyle = (row + col) % 2 === 0 ? "#0A2472" : "#0D47A1";
      c.fillRect(col * sq, row * sq, sq, sq);
    }
  }
  // Gradient overlay
  const grad = c.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "rgba(10,36,114,0.88)");
  grad.addColorStop(0.5, "rgba(13,71,161,0.82)");
  grad.addColorStop(1, "rgba(21,101,192,0.88)");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  // ── Decorative chess pieces (large, faint) ──
  c.globalAlpha = 0.06;
  c.fillStyle = "#ffffff";
  const bgPieces = [
    {p:"♔", x:60,  y:180, s:180},
    {p:"♛", x:780, y:80,  s:160},
    {p:"♜", x:20,  y:700, s:140},
    {p:"♝", x:820, y:780, s:160},
    {p:"♞", x:500, y:950, s:150},
    {p:"♟", x:900, y:400, s:130},
  ];
  bgPieces.forEach(({p, x, y, s}) => {
    c.font = `${s}px serif`;
    c.fillText(p, x, y);
  });
  c.globalAlpha = 1;

  // ── Top accent bar ──
  const accentGrad = c.createLinearGradient(0, 0, W, 0);
  accentGrad.addColorStop(0, "#FFB300");
  accentGrad.addColorStop(0.5, "#FFC107");
  accentGrad.addColorStop(1, "#FF8F00");
  c.fillStyle = accentGrad;
  c.fillRect(0, 0, W, 10);

  // ── GCC Logo & Header ──
  c.fillStyle = "#ffffff";
  c.font = "bold 62px serif";
  c.textAlign = "center";
  c.fillText("♟", W/2, 120);

  c.font = "800 38px Lexend, Arial, sans-serif";
  c.fillStyle = "#ffffff";
  c.fillText("Gujarat Chess Club", W/2, 175);

  c.font = "500 22px Lexend, Arial, sans-serif";
  c.fillStyle = "rgba(255,255,255,0.7)";
  c.fillText("Rated Events GJ", W/2, 212);

  // ── Divider ──
  c.strokeStyle = "rgba(255,179,0,0.6)";
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(60, 240); c.lineTo(W-60, 240); c.stroke();

  // ── White card area ──
  const cardX = 48, cardY = 264, cardW = W-96, cardH = 680;
  c.fillStyle = "rgba(255,255,255,0.97)";
  roundRect(c, cardX, cardY, cardW, cardH, 24);
  c.fill();
  // Card top accent
  c.fillStyle = "#1565C0";
  roundRect(c, cardX, cardY, cardW, 8, {tl:24, tr:24, bl:0, br:0});
  c.fill();

  // ── Event Name ──
  c.fillStyle = "#1A237E";
  c.textAlign = "left";
  const eventName = ev.eventName || "—";
  const fontSize = eventName.length > 42 ? 30 : eventName.length > 28 ? 34 : 40;
  c.font = `800 ${fontSize}px Lexend, Arial, sans-serif`;
  wrapText(c, eventName, cardX+36, cardY+82, cardW-72, fontSize+10);

  // ── Organizer ──
  c.font = "500 24px Lexend, Arial, sans-serif";
  c.fillStyle = "#1565C0";
  c.fillText(`🏆 ${ev.organizerName || "—"}`, cardX+36, cardY+160);

  // ── Info rows ──
  const infoRows = [
    ["📅 Dates",   `${ev.startDateDisplay || "—"}  →  ${ev.endDateDisplay || "—"}`],
    ["📍 District", ev.district || "—"],
    ["🏟 Venue",   ev.venue || "To Be Announced"],
    ["🎮 Format",  ev.format || "—"],
    ["⏱ Time",    ev.timeControl || "—"],
    ["♟ System",  ev.system || "—"],
    ["🏆 Prize",   ev.prizeFund || "To Be Announced"],
  ];

  let iy = cardY + 210;
  infoRows.forEach(([label, val], i) => {
    // Alternating row bg
    if (i % 2 === 0) {
      c.fillStyle = "#F0F4FF";
      c.fillRect(cardX+24, iy-22, cardW-48, 44);
    }
    c.font = "700 18px Lexend, Arial, sans-serif";
    c.fillStyle = "#1565C0";
    c.fillText(label, cardX+36, iy+6);
    c.font = "500 18px Lexend, Arial, sans-serif";
    c.fillStyle = "#37474F";
    c.textAlign = "right";
    const truncVal = val.length > 38 ? val.substring(0, 36) + "…" : val;
    c.fillText(truncVal, cardX+cardW-36, iy+6);
    c.textAlign = "left";
    iy += 46;
  });

  // ── Bottom accent in card ──
  c.fillStyle = "#1565C0";
  c.font = "600 19px Lexend, Arial, sans-serif";
  c.textAlign = "center";
  c.fillStyle = "#1A237E";
  c.fillText("ratedeventsgj.web.app", W/2, cardY+cardH-30);

  // ── Bottom accent bar ──
  c.fillStyle = accentGrad;
  c.fillRect(0, H-10, W, 10);

  // Convert to JPG
  return canvas.toDataURL("image/jpeg", 0.96);
}

// Canvas helpers
function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === "number") r = {tl:r, tr:r, bl:r, br:r};
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r.tr);
  ctx.lineTo(x+w, y+h-r.br);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r.br, y+h);
  ctx.lineTo(x+r.bl, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r.bl);
  ctx.lineTo(x, y+r.tl);
  ctx.quadraticCurveTo(x, y, x+r.tl, y);
  ctx.closePath();
}
function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  let ly = y;
  words.forEach(word => {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, ly);
      line = word + " ";
      ly += lineH;
    } else { line = test; }
  });
  ctx.fillText(line.trim(), x, ly);
}

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
  document.getElementById(id).addEventListener(
    id === "searchInput" ? "input" : "change", applyFilters
  );
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
  document.getElementById(id).addEventListener("click", e => {
    if (e.target.id === id) closeModal(id);
  });
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
    document.getElementById("eventListSubtitle").textContent =
      `${orgData.organizerName} — ${myEvents.length} event(s)`;
    buildEventList(myEvents, false);
    document.getElementById("eventListModal").classList.add("active");
  } catch (err) { errEl.textContent = "Error: " + err.message; }
};

// ── BUILD EVENT LIST ──────────────────────────────────────
function buildEventList(events, isAdmin) {
  const container = document.getElementById("eventListContent");
  container.innerHTML = "";
  if (events.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:#78909C;padding:24px;">No events found.</div>`;
    return;
  }
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
    showToast("✅ Event deleted successfully.");
    closeModal("eventListModal");
    renderTable(allEvents);
  } catch (err) { alert("Error: " + err.message); }
};

// Digits only
document.getElementById("adminPinInput").addEventListener("input", function() {
  this.value = this.value.replace(/\D/g,"");
});
document.getElementById("orgLoginPin").addEventListener("input", function() {
  this.value = this.value.replace(/\D/g,"");
});
document.getElementById("adminPinInput").addEventListener("keydown", e => {
  if (e.key==="Enter") verifyAdminPin();
});
document.getElementById("orgLoginPin").addEventListener("keydown", e => {
  if (e.key==="Enter") verifyOrgLogin();
});

loadEvents();
