// RTDevent.js — Chess Vibes + WhatsApp Share
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
const db  = getFirestore(app);
const ADMIN_PIN = "270620";

let allEvents = [];
let currentFilteredEvents = [];
let loggedInOrgID = null;

// ── DATE PILL ─────────────────────────────────────────────
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const now      = new Date();
const todayStr = now.toISOString().split("T")[0];
document.getElementById("datePill").textContent =
  `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

// ── CHESS CANVAS (header ambient) ────────────────────────
(function initChessCanvas() {
  const canvas = document.getElementById("chessCanvas");
  const header = canvas.parentElement;
  const ctx    = canvas.getContext("2d");
  const PIECES = ["♔","♕","♖","♗","♘","♙","♚","♛","♜","♝","♞","♟"];
  function resize() { canvas.width = header.offsetWidth; canvas.height = header.offsetHeight; }
  resize();
  window.addEventListener("resize", resize);
  const pieces = Array.from({length: 20}, () => ({
    piece: PIECES[Math.floor(Math.random() * PIECES.length)],
    x: Math.random() * 100, y: Math.random() * 100,
    vx: (Math.random() - 0.5) * 0.06, vy: (Math.random() - 0.5) * 0.04,
    size: 14 + Math.random() * 22,
    opacity: 0.05 + Math.random() * 0.09,
    phase: Math.random() * Math.PI * 2,
    speed: 0.35 + Math.random() * 0.55,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    pieces.forEach(p => {
      p.x += p.vx * p.speed; p.y += p.vy * p.speed;
      if (p.x < 0 || p.x > 100) p.vx *= -1;
      if (p.y < 0 || p.y > 100) p.vy *= -1;
      const breathe = Math.sin(frame * 0.012 + p.phase) * 0.025;
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
function showToast(msg, ms = 2800) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
}

// ── LOAD EVENTS ───────────────────────────────────────────
async function loadEvents() {
  try {
    const snap = await getDocs(collection(db, "RTDeventdb"));
    allEvents = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    allEvents.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
    const orgNames = [...new Set(allEvents.map(e => e.organizerName).filter(Boolean))].sort();
    const orgFilter = document.getElementById("organizerFilter");
    orgNames.forEach(name => {
      const o = document.createElement("option");
      o.value = name; o.textContent = name;
      orgFilter.appendChild(o);
    });
    document.getElementById("loadingMsg").style.display = "none";
    if (!allEvents.length) {
      document.getElementById("emptyMsg").style.display = "block";
      document.getElementById("countBadge").textContent = "0 Events";
      return;
    }
    renderTable(allEvents);
    const params = new URLSearchParams(window.location.search);
    const deepId = params.get("event");
    if (deepId) setTimeout(() => openPopup(deepId), 400);
  } catch (err) {
    document.getElementById("loadingMsg").innerHTML =
      `<div style="text-align:center;padding:48px;color:#C62828;">⚠️ ${err.message}</div>`;
  }
}

// ── RENDER TABLE ──────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById("eventTableBody");
  const table = document.getElementById("eventTable");
  tbody.innerHTML = "";
  if (!data.length) {
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
    const isUpcoming  = ev.startDate && ev.startDate >= todayStr;
    const formatClass = (ev.format || "").toLowerCase();
    const row = document.createElement("tr");
    if (isUpcoming) row.classList.add("upcoming-row");
    row.style.animationDelay = `${idx * 30}ms`;
    const badge = isUpcoming ? `<span class="upcoming-badge">UPCOMING</span>` : "";
    row.innerHTML = `
      <td>${srNo}</td>
      <td>${ev.startDateDisplay || ev.startDate || "—"}${badge}</td>
      <td class="event-name-cell">${ev.eventName || "—"}</td>
      <td>${ev.organizerName || "—"}</td>
      <td>${ev.district || "—"}</td>
      <td>${ev.prizeFund || "To Be Announced"}</td>
      <td>${ev.system || "—"}</td>
      <td><span class="format-pill ${formatClass}">${ev.format || "—"}</span></td>
      <td>${ev.timeControl || "—"}</td>
      <td><button class="more-btn" onclick="openPopup('${ev._id}')">More Details</button></td>`;
    tbody.appendChild(row);
  });
  currentFilteredEvents = data;
}

// ── POPUP ─────────────────────────────────────────────────
window.openPopup = function(docId) {
  const ev = allEvents.find(e => e._id === docId);
  if (!ev) return;

  const fees = ev.entryFees || {};
  const eb = fees.earlyBird || {}, ac = fees.actual || {}, le = fees.lateEntry || {};
  let feesHtml = "";
  if (eb.fees && eb.fees !== "—") feesHtml += `<tr><td>Early Bird (till ${eb.date||"—"})</td><td>${eb.fees}</td></tr>`;
  if (ac.fees) feesHtml += `<tr><td>Actual Entry</td><td>${ac.fees}</td></tr>`;
  if (le.fees && le.fees !== "—") feesHtml += `<tr><td>Late Entry (from ${le.date||"—"})</td><td>${le.fees}</td></tr>`;
  if (!feesHtml) feesHtml = `<tr><td colspan="2">To Be Announced</td></tr>`;

  const td = ev.tournamentDirector || {};
  let tdHtml = "";
  if (td.name) {
    const fl = td.fideId ? ` <a href="https://ratings.fide.com/profile/${td.fideId}/arbiter_organizer" target="_blank" style="color:var(--blue);font-size:11px;">(FIDE: ${td.fideId})</a>` : "";
    tdHtml = `<div class="popup-section-title">🎯 Tournament Director</div>
      <table class="popup-detail-table"><tr><td>Name</td><td>${td.name}${fl}</td></tr></table>`;
  }

  const arb = ev.arbiters || {};
  const ca = arb.chiefArbiter || {}, d1 = arb.deputyCA1 || {}, d2 = arb.deputyCA2 || {};
  function arbRow(label, person) {
    if (!person.name) return "";
    const fl = person.fideId ? ` <a href="https://ratings.fide.com/profile/${person.fideId}/arbiter_organizer" target="_blank" style="color:var(--blue);font-size:11px;">(FIDE: ${person.fideId})</a>` : "";
    return `<tr><td>${label}</td><td>${person.name}${fl}</td></tr>`;
  }
  const arbRows = (arbRow("Chief Arbiter", ca) + arbRow("Deputy Chief Arbiter 1", d1) + arbRow("Deputy Chief Arbiter 2", d2))
    || `<tr><td colspan="2">Not Announced</td></tr>`;

  const links = ev.links || {};
  function linkBtn(label, icon, cls, url) {
    if (!url) return `<span class="link-btn ${cls} disabled">${icon} ${label}</span>`;
    return `<a class="link-btn ${cls}" href="${url}" target="_blank" rel="noopener">${icon} ${label}</a>`;
  }

  document.getElementById("popupContent").innerHTML = `
    <div class="popup-event-name">${ev.eventName || "—"}</div>
    <div class="popup-organizer">🏆 ${ev.organizerName || "—"}</div>

    <button class="share-wa-btn" id="shareWaBtn" onclick="shareToWhatsApp('${docId}')">
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" style="flex-shrink:0">
        <circle cx="16" cy="16" r="16" fill="#25D366"/>
        <path d="M23.5 8.5A10.4 10.4 0 0 0 16 5.5C10.2 5.5 5.5 10.2 5.5 16c0 1.84.48 3.63 1.4 5.22L5.5 26.5l5.42-1.37A10.43 10.43 0 0 0 16 26.5c5.8 0 10.5-4.7 10.5-10.5 0-2.8-1.09-5.43-3-7.5z" fill="#25D366"/>
        <path d="M16 24.5a8.42 8.42 0 0 1-4.28-1.16l-.31-.18-3.22.81.85-3.14-.2-.32A8.45 8.45 0 0 1 7.5 16c0-4.69 3.81-8.5 8.5-8.5S24.5 11.31 24.5 16 20.69 24.5 16 24.5zm4.65-6.33c-.25-.12-1.5-.74-1.73-.82-.23-.08-.4-.12-.57.12-.17.25-.65.82-.8.99-.14.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.88-.2-.49-.41-.42-.57-.43h-.49c-.16 0-.44.06-.67.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.11-.23-.17-.48-.29z" fill="white"/>
      </svg>
      Share to WhatsApp
    </button>
    <div id="shareStatus" style="display:none;"></div>

    <div class="popup-section-title">🔗 Links</div>
    <div class="popup-links">
      ${linkBtn("Brochure","📄","brochure",links.brochure)}
      ${linkBtn("Chess Results","♟","chess",links.chessResults)}
      ${linkBtn("Map Venue","📍","map",links.map)}
      ${linkBtn("Live Games","🎥","live",links.liveGames)}
      ${linkBtn("Prize List","🏆","prize",links.prizeList)}
      ${linkBtn("Registration","📝","register",links.register)}
      ${linkBtn("Register via GCC","♟","gcc",links.registerGcc)}
      ${linkBtn("Event Photos","📸","photos",links.photographs)}
    </div>

    <div class="popup-section-title">📋 Event Details</div>
    <table class="popup-detail-table">
      <tr><td>Start Date</td><td>${ev.startDateDisplay || "—"}</td></tr>
      <tr><td>End Date</td><td>${ev.endDateDisplay || "—"}</td></tr>
      <tr><td>District</td><td>${ev.district || "—"}</td></tr>
      <tr><td>Venue</td><td>${ev.venue || "To Be Announced"}</td></tr>
      <tr><td>System</td><td>${ev.system || "—"}</td></tr>
      <tr><td>Format</td><td>${ev.format || "—"}</td></tr>
      <tr><td>Time Control</td><td>${ev.timeControl || "—"}</td></tr>
      <tr><td>Prize Fund</td><td>${ev.prizeFund || "To Be Announced"}</td></tr>
    </table>

    <div class="popup-section-title">💰 Entry Fees</div>
    <table class="popup-detail-table">${feesHtml}</table>

    ${tdHtml}

    <div class="popup-section-title">⚖️ Arbiters</div>
    <table class="popup-detail-table">${arbRows}</table>
  `;

  document.getElementById("popupOverlay").classList.add("active");
};

window.closePopup = () => document.getElementById("popupOverlay").classList.remove("active");
document.getElementById("popupOverlay").addEventListener("click", e => {
  if (e.target.id === "popupOverlay") closePopup();
});

// ── SHARE TO WHATSAPP ─────────────────────────────────────
window.shareToWhatsApp = async function(docId) {
  const ev = allEvents.find(e => e._id === docId);
  if (!ev) return;
  const btn    = document.getElementById("shareWaBtn");
  const status = document.getElementById("shareStatus");
  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-block;width:18px;height:18px;border:3px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0;"></span> Generating…`;
  status.style.display = "none";
  try {
    const deepLink = `${window.location.origin}${window.location.pathname}?event=${docId}`;
    const dataURL  = await generatePortraitCard(ev, deepLink);
    const caption  =
`♟ *${ev.eventName || "Chess Event"}*
🏆 ${ev.organizerName || ""}

📅 ${ev.startDateDisplay || ""}  →  ${ev.endDateDisplay || ""}
📍 ${ev.district || ""}
🏟 ${ev.venue || "Venue TBA"}
🎮 ${ev.format || ""} | ⏱ ${ev.timeControl || ""}
🏆 Prize: ${ev.prizeFund || "TBA"}

👉 View Full Details:
${deepLink}

_Rated Events GJ — Gujarat Chess Club_`;

    const blob = await (await fetch(dataURL)).blob();
    const file = new File([blob], `${(ev.eventName||"event").replace(/\s+/g,"-")}.jpg`, { type: "image/jpeg" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: ev.eventName || "Chess Event", text: caption });
      restoreShareBtn(); return;
    }
    showShareFallback(dataURL, caption, deepLink, ev);
  } catch (err) {
    if (err.name !== "AbortError") {
      const status = document.getElementById("shareStatus");
      status.style.display = "block";
      status.innerHTML = `<div style="color:#C62828;font-size:12px;padding:6px 0;">⚠️ ${err.message}</div>`;
    }
  }
  restoreShareBtn();
};

function restoreShareBtn() {
  const btn = document.getElementById("shareWaBtn");
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 32 32" fill="none" style="flex-shrink:0"><circle cx="16" cy="16" r="16" fill="#25D366"/><path d="M23.5 8.5A10.4 10.4 0 0 0 16 5.5C10.2 5.5 5.5 10.2 5.5 16c0 1.84.48 3.63 1.4 5.22L5.5 26.5l5.42-1.37A10.43 10.43 0 0 0 16 26.5c5.8 0 10.5-4.7 10.5-10.5 0-2.8-1.09-5.43-3-7.5z" fill="#25D366"/><path d="M16 24.5a8.42 8.42 0 0 1-4.28-1.16l-.31-.18-3.22.81.85-3.14-.2-.32A8.45 8.45 0 0 1 7.5 16c0-4.69 3.81-8.5 8.5-8.5S24.5 11.31 24.5 16 20.69 24.5 16 24.5zm4.65-6.33c-.25-.12-1.5-.74-1.73-.82-.23-.08-.4-.12-.57.12-.17.25-.65.82-.8.99-.14.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.88-.2-.49-.41-.42-.57-.43h-.49c-.16 0-.44.06-.67.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.11-.23-.17-.48-.29z" fill="white"/></svg> Share to WhatsApp`;
}

function showShareFallback(dataURL, caption, deepLink, ev) {
  const status = document.getElementById("shareStatus");
  const waUrl  = `https://wa.me/?text=${encodeURIComponent(caption)}`;
  const a = document.createElement("a");
  a.href = dataURL; a.download = `${(ev.eventName||"event").replace(/\s+/g,"-")}.jpg`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  status.style.display = "block";
  status.innerHTML = `
    <div class="fallback-share-box">
      <img src="${dataURL}" class="fallback-preview" alt="Share card"/>
      <div class="fallback-steps">
        <div class="fallback-step">✅ Image saved to your Downloads</div>
        <div class="fallback-step">📋 Attach the image in WhatsApp and paste this link as caption:</div>
        <div class="fallback-link-row">
          <span class="fallback-link-text">${deepLink}</span>
          <button class="copy-link-btn" onclick="copyText('${deepLink}',this)">Copy</button>
        </div>
        <a class="wa-open-btn" href="${waUrl}" target="_blank" rel="noopener">Open WhatsApp Web →</a>
      </div>
    </div>`;
}

window.copyText = function(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "✓ Copied"; btn.style.background = "#43A047";
    setTimeout(() => { btn.textContent = "Copy"; btn.style.background = ""; }, 2000);
    showToast("✓ Link copied!");
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PORTRAIT SHARE CARD
// IMAGE = exact pixel mirror of the popup (name → organizer → links → details → fees → arbiters)
// WhatsApp caption text = "View Full Details\nlink\n\nfield\nvalue\nfield\nvalue..."
// ─────────────────────────────────────────────────────────────────────────────
async function generatePortraitCard(ev, deepLink) {
  const W    = 1080;
  const TALL = 4000; // oversized, cropped at end

  const canvas = document.getElementById("shareCanvas");
  canvas.width  = W;
  canvas.height = TALL;
  const c = canvas.getContext("2d");

  // Card geometry — same padding as popup
  const CX  = 36;          // card left margin
  const CW  = W - CX * 2;  // card width
  const IP  = 28;           // inner padding (matches popup ~24px padding)

  // Gold gradient reused
  const gold = c.createLinearGradient(0,0,W,0);
  gold.addColorStop(0,"#FF8F00"); gold.addColorStop(0.5,"#FFC107"); gold.addColorStop(1,"#FF8F00");

  // Draw chess BG first (will be covered by white card)
  drawChessBg(c, W, TALL);

  // ── GOLD TOP BAR ──
  c.fillStyle = gold; c.fillRect(0, 0, W, 12);

  let y = 24; // start y (card starts here)
  const cardTopY = y;

  // We draw all content (text) first on top of transparent; then composite:
  // final canvas = BG + white card + content copy

  y += IP + 8; // top inner padding

  // ══════════════════════════════════════════════════════
  // 1. EVENT NAME  (bold, dark blue, wraps — same as popup-event-name)
  // ══════════════════════════════════════════════════════
  c.textAlign = "left";
  const evName = ev.eventName || "—";
  const nameSz = evName.length > 55 ? 28 : evName.length > 38 ? 32 : 36;
  c.font = `800 ${nameSz}px Arial, sans-serif`;
  c.fillStyle = "#0D1B6E";
  const nameLines = wrapTextLines(c, evName, CX + IP, CW - IP*2, nameSz);
  nameLines.forEach(line => { c.fillText(line, CX + IP, y); y += nameSz + 10; });
  y += 4;

  // ══════════════════════════════════════════════════════
  // 2. ORGANIZER  (same as popup-organizer)
  // ══════════════════════════════════════════════════════
  c.font = "500 22px Arial, sans-serif";
  c.fillStyle = "#546E7A";
  c.fillText(`🏆 ${ev.organizerName || "—"}`, CX + IP, y);
  y += 36;

  // thin separator line
  c.strokeStyle = "#BBDEFB"; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(CX + IP, y); c.lineTo(CX + CW - IP, y); c.stroke();
  y += 18;

  // ══════════════════════════════════════════════════════
  // 3. LINKS  (same as popup links section)
  // ══════════════════════════════════════════════════════
  const links = ev.links || {};
  const allLinkDefs = [
    {label:"📄 Brochure",         url: links.brochure},
    {label:"♟ Chess Results",    url: links.chessResults},
    {label:"📍 Map Venue",        url: links.map},
    {label:"🎥 Live Games",       url: links.liveGames},
    {label:"🏆 Prize List",       url: links.prizeList},
    {label:"📝 Registration",     url: links.register},
    {label:"♟ Register via GCC", url: links.registerGcc},
    {label:"📸 Event Photos",     url: links.photographs},
  ];

  y = drawCardSectionHeader(c, "🔗 Links", CX, y, CW);

  // Draw link pills in rows of 3, same as popup
  const chipW = (CW - IP*2 - 16) / 3;
  const chipH = 40, chipGap = 8;
  let chipX = CX + IP;
  let rowStart = y;
  allLinkDefs.forEach((lnk, i) => {
    if (i > 0 && i % 3 === 0) { y += chipH + chipGap; chipX = CX + IP; }
    const active = !!lnk.url;
    c.fillStyle = active ? "#E3F2FD" : "rgba(200,210,220,0.25)";
    roundRect(c, chipX, y, chipW, chipH, 8); c.fill();
    if (active) { c.strokeStyle = "#90CAF9"; c.lineWidth = 1; roundRect(c, chipX, y, chipW, chipH, 8); c.stroke(); }
    c.font = `${active ? "600" : "400"} 15px Arial, sans-serif`;
    c.fillStyle = active ? "#0D47A1" : "rgba(100,120,140,0.5)";
    c.textAlign = "left";
    // clip text to chip width
    const maxLW = chipW - 16;
    let ltext = lnk.label;
    while (c.measureText(ltext).width > maxLW && ltext.length > 4) ltext = ltext.slice(0,-1);
    if (ltext !== lnk.label) ltext += "…";
    c.fillText(ltext, chipX + 8, y + 26);
    chipX += chipW + chipGap;
  });
  y += chipH + 14;
  c.textAlign = "left";

  // ══════════════════════════════════════════════════════
  // 4. EVENT DETAILS  (same table rows as popup)
  // ══════════════════════════════════════════════════════
  y = drawCardSectionHeader(c, "📋 Event Details", CX, y, CW);

  const detailRows = [
    ["Start Date",   ev.startDateDisplay || "—"],
    ["End Date",     ev.endDateDisplay   || "—"],
    ["District",     ev.district         || "—"],
    ["Venue",        ev.venue            || "To Be Announced"],
    ["System",       ev.system           || "—"],
    ["Format",       ev.format           || "—"],
    ["Time Control", ev.timeControl      || "—"],
    ["Prize Fund",   ev.prizeFund        || "To Be Announced"],
  ];
  detailRows.forEach(([lbl, val], i) => {
    y = drawPopupTableRow(c, lbl, val, CX + IP, y, CW - IP*2, i);
  });
  y += 10;

  // ══════════════════════════════════════════════════════
  // 5. ENTRY FEES
  // ══════════════════════════════════════════════════════
  const fees = ev.entryFees || {};
  const eb = fees.earlyBird || {}, ac = fees.actual || {}, le = fees.lateEntry || {};
  const feeRows = [];
  if (eb.fees && eb.fees !== "—") feeRows.push([`Early Bird (till ${eb.date||"—"})`, eb.fees]);
  if (ac.fees) feeRows.push(["Actual Entry", ac.fees]);
  if (le.fees && le.fees !== "—") feeRows.push([`Late Entry (from ${le.date||"—"})`, le.fees]);
  if (!feeRows.length) feeRows.push(["Entry Fees", "To Be Announced"]);

  y = drawCardSectionHeader(c, "💰 Entry Fees", CX, y, CW);
  feeRows.forEach(([lbl, val], i) => {
    y = drawPopupTableRow(c, lbl, val, CX + IP, y, CW - IP*2, i);
  });
  y += 10;

  // ══════════════════════════════════════════════════════
  // 6. TOURNAMENT DIRECTOR (if exists)
  // ══════════════════════════════════════════════════════
  const td = ev.tournamentDirector || {};
  if (td.name) {
    y = drawCardSectionHeader(c, "🎯 Tournament Director", CX, y, CW);
    y = drawPopupTableRow(c, "Name", td.name + (td.fideId ? `  (FIDE: ${td.fideId})` : ""), CX+IP, y, CW-IP*2, 0);
    y += 10;
  }

  // ══════════════════════════════════════════════════════
  // 7. ARBITERS
  // ══════════════════════════════════════════════════════
  const arb = ev.arbiters || {};
  const arbRows2 = [];
  if (arb.chiefArbiter?.name)  arbRows2.push(["Chief Arbiter",          arb.chiefArbiter.name + (arb.chiefArbiter.fideId ? `  (FIDE: ${arb.chiefArbiter.fideId})` : "")]);
  if (arb.deputyCA1?.name)     arbRows2.push(["Deputy Chief Arbiter 1", arb.deputyCA1.name    + (arb.deputyCA1.fideId    ? `  (FIDE: ${arb.deputyCA1.fideId})`    : "")]);
  if (arb.deputyCA2?.name)     arbRows2.push(["Deputy Chief Arbiter 2", arb.deputyCA2.name    + (arb.deputyCA2.fideId    ? `  (FIDE: ${arb.deputyCA2.fideId})`    : "")]);
  if (!arbRows2.length)        arbRows2.push(["Arbiters", "Not Announced"]);

  y = drawCardSectionHeader(c, "⚖️ Arbiters", CX, y, CW);
  arbRows2.forEach(([lbl, val], i) => {
    y = drawPopupTableRow(c, lbl, val, CX+IP, y, CW-IP*2, i);
  });
  y += 20;

  // ══════════════════════════════════════════════════════
  // 8. FOOTER — only branding, small
  // ══════════════════════════════════════════════════════
  c.font = "500 18px Arial, sans-serif";
  c.fillStyle = "#90A4AE";
  c.textAlign = "center";
  c.fillText("Rated Events GJ  •  Gujarat Chess Club", W/2, y + 22);
  y += 44;

  const cardBtmY = y;
  const cardH    = cardBtmY - cardTopY;

  // Gold bottom bar
  c.fillStyle = gold; c.fillRect(0, y, W, 12);
  const finalH = y + 12;

  // ── COMPOSITE ──
  const final = document.createElement("canvas");
  final.width  = W;
  final.height = finalH;
  const fc = final.getContext("2d");

  // 1) chess BG
  drawChessBg(fc, W, finalH);

  // 2) white card with subtle shadow
  fc.shadowColor = "rgba(0,0,0,0.28)"; fc.shadowBlur = 36; fc.shadowOffsetY = 8;
  fc.fillStyle = "#FFFFFF";
  roundRect(fc, CX, cardTopY, CW, cardH, 18); fc.fill();
  fc.shadowBlur = 0; fc.shadowOffsetY = 0;

  // 3) copy all drawn content
  fc.drawImage(canvas, 0, 0, W, finalH, 0, 0, W, finalH);

  // 4) gold bars last
  const gold2 = fc.createLinearGradient(0,0,W,0);
  gold2.addColorStop(0,"#FF8F00"); gold2.addColorStop(0.5,"#FFC107"); gold2.addColorStop(1,"#FF8F00");
  fc.fillStyle = gold2;
  fc.fillRect(0, 0, W, 12);
  fc.fillRect(0, finalH - 12, W, 12);

  return final.toDataURL("image/jpeg", 0.96);
}

// ── Table row exactly like popup-detail-table ──
// Left cell = label (blue, bold, UPPERCASE, ~38% width)
// Right cell = value (dark, normal, wraps)
function drawPopupTableRow(c, label, value, x, y, w, rowIndex) {
  const LABEL_W = Math.floor(w * 0.40);
  const VALUE_W = w - LABEL_W - 12;

  // measure value wrap
  c.font = "500 19px Arial, sans-serif";
  const valLines = wrapTextLines(c, String(value || "—"), x + LABEL_W + 12, VALUE_W, 19);
  const rowH = Math.max(44, valLines.length * 26 + 20);

  // alternating row bg
  c.fillStyle = rowIndex % 2 === 0 ? "#F0F4FF" : "#FFFFFF";
  c.fillRect(x - 8, y, w + 16, rowH);

  // bottom border
  c.strokeStyle = "#DDEEFF"; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x - 8, y + rowH); c.lineTo(x - 8 + w + 16, y + rowH); c.stroke();

  // LABEL cell bg (blue tint, same as popup td:first-child)
  c.fillStyle = "#EEF4FF";
  c.fillRect(x - 8, y, LABEL_W + 8, rowH);

  // label text
  c.font = "700 15px Arial, sans-serif";
  c.fillStyle = "#1565C0";
  c.textAlign = "left";
  const labelUp = label.toUpperCase();
  c.fillText(labelUp, x, y + rowH/2 + 6);

  // value text (wrapping)
  c.font = "500 19px Arial, sans-serif";
  c.fillStyle = "#37474F";
  const vx = x + LABEL_W + 12;
  let vy = y + (rowH - valLines.length * 26) / 2 + 20;
  valLines.forEach(line => { c.fillText(line, vx, vy); vy += 26; });

  return y + rowH;
}

// ── Section header — dark blue bar, white text, same as popup-section-title ──
function drawCardSectionHeader(c, title, cardX, y, cardW) {
  // Blue header bar
  c.fillStyle = "#1A237E";
  c.fillRect(cardX, y, cardW, 44);
  c.font = "700 18px Arial, sans-serif";
  c.fillStyle = "#FFFFFF";
  c.textAlign = "left";
  c.fillText(title, cardX + 20, y + 29);
  return y + 54;
}

// ── Chess board BG ──
function drawChessBg(ctx, w, h) {
  const SQ = 90;
  for (let row = 0; row < Math.ceil(h/SQ); row++) {
    for (let col = 0; col < Math.ceil(w/SQ); col++) {
      ctx.fillStyle = (row+col)%2===0 ? "#0A2472" : "#0D47A1";
      ctx.fillRect(col*SQ, row*SQ, SQ, SQ);
    }
  }
  const grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,   "rgba(10,36,114,0.93)");
  grad.addColorStop(0.4, "rgba(13,71,161,0.88)");
  grad.addColorStop(1,   "rgba(10,36,114,0.93)");
  ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
  // faint bg pieces
  ctx.globalAlpha = 0.05; ctx.fillStyle = "#fff";
  [{p:"♔",x:20,y:180,s:190},{p:"♛",x:800,y:80,s:170},{p:"♜",x:10,y:780,s:155},{p:"♝",x:850,y:900,s:155},{p:"♞",x:480,y:2400,s:165},{p:"♟",x:880,y:1700,s:145}]
    .forEach(({p,x,y,s})=>{ ctx.font=`${s}px serif`; ctx.fillText(p,x,y); });
  ctx.globalAlpha = 1;
}

// ── Wrap text into lines array ──
function wrapTextLines(c, text, x, maxW, fontSize) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  words.forEach(word => {
    const test = line + word + " ";
    if (c.measureText(test).width > maxW && line) {
      lines.push(line.trim()); line = word + " ";
    } else line = test;
  });
  if (line.trim()) lines.push(line.trim());
  return lines.length ? lines : ["—"];
}

// ── roundRect ──
function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === "number") r = {tl:r,tr:r,bl:r,br:r};
  ctx.beginPath();
  ctx.moveTo(x+r.tl, y);
  ctx.lineTo(x+w-r.tr, y);     ctx.quadraticCurveTo(x+w,y,   x+w,y+r.tr);
  ctx.lineTo(x+w, y+h-r.br);   ctx.quadraticCurveTo(x+w,y+h, x+w-r.br,y+h);
  ctx.lineTo(x+r.bl, y+h);     ctx.quadraticCurveTo(x,y+h,   x,y+h-r.bl);
  ctx.lineTo(x, y+r.tl);       ctx.quadraticCurveTo(x,y,     x+r.tl,y);
  ctx.closePath();
}

// ── SEARCH / FILTER ───────────────────────────────────────
function applyFilters() {
  const s = document.getElementById("searchInput").value.toLowerCase().trim();
  const d = document.getElementById("districtFilter").value;
  const f = document.getElementById("formatFilter").value;
  const o = document.getElementById("organizerFilter").value;
  renderTable(allEvents.filter(ev =>
    (!d || ev.district === d) && (!f || ev.format === f) && (!o || ev.organizerName === o) &&
    (!s || (ev.eventName||"").toLowerCase().includes(s) ||
           (ev.organizerName||"").toLowerCase().includes(s) ||
           (ev.district||"").toLowerCase().includes(s))
  ));
}
["searchInput","districtFilter","formatFilter","organizerFilter"].forEach(id =>
  document.getElementById(id).addEventListener(id==="searchInput"?"input":"change", applyFilters)
);

// ── MODALS ────────────────────────────────────────────────
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
["adminLoginModal","orgLoginModal","eventListModal"].forEach(id =>
  document.getElementById(id).addEventListener("click", e => { if(e.target.id===id) closeModal(id); })
);

window.verifyAdminPin = () => {
  const pin = document.getElementById("adminPinInput").value.trim();
  if (pin === ADMIN_PIN) {
    closeModal("adminLoginModal");
    document.getElementById("eventListTitle").textContent = "All Events (Admin)";
    document.getElementById("eventListSubtitle").textContent = "Edit or delete any event.";
    buildEventList(allEvents);
    document.getElementById("eventListModal").classList.add("active");
  } else {
    document.getElementById("adminPinError").textContent = "Wrong PIN.";
    document.getElementById("adminPinInput").value = "";
  }
};

window.verifyOrgLogin = async () => {
  const orgID = document.getElementById("orgLoginID").value.trim();
  const pin   = document.getElementById("orgLoginPin").value.trim();
  const errEl = document.getElementById("orgPinError");
  errEl.textContent = "";
  if (!orgID) { errEl.textContent = "Enter your Organizer ID."; return; }
  if (!pin)   { errEl.textContent = "Enter your PIN."; return; }
  try {
    const q    = query(collection(db,"organizerdb"), where("organizerID","==",orgID));
    const snap = await getDocs(q);
    if (snap.empty) { errEl.textContent = "Organizer ID not found."; return; }
    const orgData = snap.docs[0].data();
    if (orgData.pin !== pin) { errEl.textContent = "Wrong PIN."; return; }
    loggedInOrgID = orgID;
    closeModal("orgLoginModal");
    const myEvents = allEvents.filter(e => e.organizerID===orgID || e.organizerName===orgData.organizerName);
    document.getElementById("eventListTitle").textContent = "My Events";
    document.getElementById("eventListSubtitle").textContent = `${orgData.organizerName} — ${myEvents.length} event(s)`;
    buildEventList(myEvents);
    document.getElementById("eventListModal").classList.add("active");
  } catch(err) { errEl.textContent = "Error: "+err.message; }
};

function buildEventList(events) {
  const cont = document.getElementById("eventListContent");
  cont.innerHTML = "";
  if (!events.length) { cont.innerHTML=`<div style="text-align:center;color:#78909C;padding:24px;">No events found.</div>`; return; }
  events.forEach(ev => {
    const isPast = ev.endDate && ev.endDate < todayStr;
    const item   = document.createElement("div");
    item.className = "event-list-item";
    item.innerHTML = `
      <div>
        <div class="event-list-name">${ev.eventName||"—"}</div>
        <div class="event-list-meta">📅 ${ev.startDateDisplay||"—"} → ${ev.endDateDisplay||"—"} &nbsp;|&nbsp; 📍 ${ev.district||"—"}</div>
      </div>
      <div class="event-list-actions">
        <button class="edit-btn" onclick="editEvent('${ev._id}')">✏️ Edit</button>
        <button class="delete-btn" ${isPast?"disabled title='Cannot delete past events'":""} onclick="deleteEvent('${ev._id}','${(ev.eventName||"").replace(/'/g,"\\'")}')">🗑 Delete</button>
      </div>`;
    cont.appendChild(item);
  });
}

window.editEvent   = docId => { closeModal("eventListModal"); window.location.href=`RTDeventform.html?editDocId=${docId}`; };
window.deleteEvent = async function(docId, eventName) {
  if (!confirm(`Delete "${eventName}"? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db,"RTDeventdb",docId));
    allEvents = allEvents.filter(e => e._id !== docId);
    showToast("✅ Event deleted.");
    closeModal("eventListModal");
    renderTable(allEvents);
  } catch(err) { alert("Error: "+err.message); }
};

document.getElementById("adminPinInput").addEventListener("input", function(){ this.value=this.value.replace(/\D/g,""); });
document.getElementById("orgLoginPin").addEventListener("input",  function(){ this.value=this.value.replace(/\D/g,""); });
document.getElementById("adminPinInput").addEventListener("keydown", e=>{ if(e.key==="Enter") verifyAdminPin(); });
document.getElementById("orgLoginPin").addEventListener("keydown",  e=>{ if(e.key==="Enter") verifyOrgLogin(); });

loadEvents();
