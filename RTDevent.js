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
// PORTRAIT SHARE CARD — mirrors popup exactly, line by line
// Layout (top → bottom):
//   [Gold top bar]
//   VIEW FULL DETAILS label + link (white pill)
//   [divider]
//   Event Title (large, wraps)
//   Organizer name
//   [section] 🔗 Links — available links listed
//   [section] 📋 Event Details — each field on its OWN line (label row + value row)
//   [section] 💰 Entry Fees — same stacked style
//   [section] 🎯 Tournament Director (if exists)
//   [section] ⚖️ Arbiters
//   [footer] Rated Events GJ • Gujarat Chess Club
//   [Gold bottom bar]
// ─────────────────────────────────────────────────────────────────────────────
async function generatePortraitCard(ev, deepLink) {
  const W    = 1080;
  const TALL = 3600; // oversized, we'll crop

  // ── off-screen content canvas ──
  const canvas = document.getElementById("shareCanvas");
  canvas.width  = W;
  canvas.height = TALL;
  const c = canvas.getContext("2d");

  // font helpers
  function setFont(size, weight, family) {
    c.font = `${weight} ${size}px ${family || "Arial, sans-serif"}`;
  }

  // ── CHESS BG (drawn on final canvas later) ──
  // Draw it here first so we have a BG for measuring
  drawChessBg(c, W, TALL);

  // CARD margin
  const CX  = 40;   // card left x
  const CW  = W - CX * 2; // card width
  const PAD = 32;   // inner padding

  // ── GOLD TOP BAR ──
  const goldGrad = c.createLinearGradient(0,0,W,0);
  goldGrad.addColorStop(0,"#FF8F00"); goldGrad.addColorStop(0.5,"#FFC107"); goldGrad.addColorStop(1,"#FF8F00");
  c.fillStyle = goldGrad; c.fillRect(0, 0, W, 14);

  let y = 36;

  // ── VIEW FULL DETAILS pill (top, before card) ──
  const pillH = 80;
  c.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(c, CX, y, CW, pillH, 14); c.fill();
  c.strokeStyle = "rgba(255,255,255,0.3)"; c.lineWidth = 1.5;
  roundRect(c, CX, y, CW, pillH, 14); c.stroke();

  c.textAlign = "center";
  setFont(20, "700");
  c.fillStyle = "rgba(255,255,255,0.75)";
  c.fillText("👆 VIEW FULL DETAILS", W/2, y + 28);
  setFont(18, "500");
  c.fillStyle = "#FFD54F";
  // Truncate link nicely
  const shortLink = deepLink.replace("https://","").replace("http://","");
  const dispLink  = shortLink.length > 52 ? shortLink.slice(0,50)+"…" : shortLink;
  c.fillText(dispLink, W/2, y + 56);
  y += pillH + 18;

  // ── WHITE CARD starts here ──
  const cardTopY = y;

  // We'll draw card BG after knowing total height
  // Draw content first, then redraw bg underneath

  y += 28; // top padding inside card

  // ── EVENT TITLE ──
  c.textAlign = "left";
  setFont(36, "800");
  c.fillStyle = "#0D2A6E";
  const nameLines = wrapTextLines(c, ev.eventName || "—", CX + PAD, CW - PAD*2, 36);
  nameLines.forEach(line => {
    c.fillText(line, CX + PAD, y);
    y += 46;
  });
  y += 4;

  // ── ORGANIZER ──
  setFont(22, "600");
  c.fillStyle = "#1565C0";
  c.fillText(`🏆 ${ev.organizerName || "—"}`, CX + PAD, y);
  y += 36;

  // Gold underline
  c.fillStyle = "#FFB300";
  c.fillRect(CX + PAD, y, 72, 4);
  y += 20;

  // ── LINKS SECTION ──
  const links = ev.links || {};
  const availLinks = [
    {label:"📄 Brochure",         url: links.brochure},
    {label:"♟ Chess Results",    url: links.chessResults},
    {label:"📍 Map Venue",        url: links.map},
    {label:"🎥 Live Games",       url: links.liveGames},
    {label:"🏆 Prize List",       url: links.prizeList},
    {label:"📝 Registration",     url: links.register},
    {label:"♟ Register via GCC", url: links.registerGcc},
    {label:"📸 Event Photos",     url: links.photographs},
  ];
  const hasLinks = availLinks.some(l => l.url);
  if (hasLinks) {
    y = drawSectionHeader(c, "🔗 LINKS", CX, y, CW);
    const active  = availLinks.filter(l => l.url);
    const inactive = availLinks.filter(l => !l.url);
    // Draw active links as chips in rows of 2
    const chipH = 38, chipGap = 10;
    const chipW = (CW - PAD*2 - chipGap) / 2;
    let cx2 = CX + PAD;
    active.forEach((lnk, i) => {
      if (i % 2 === 0 && i > 0) { y += chipH + chipGap; cx2 = CX + PAD; }
      c.fillStyle = "#E3F2FD";
      roundRect(c, cx2, y, chipW, chipH, 8); c.fill();
      setFont(16, "600");
      c.fillStyle = "#0D47A1";
      c.textAlign = "left";
      c.fillText(lnk.label, cx2 + 10, y + 25);
      cx2 += chipW + chipGap;
    });
    y += chipH + 12;
    // Inactive in grey
    if (inactive.length) {
      cx2 = CX + PAD;
      inactive.forEach((lnk, i) => {
        if (i % 2 === 0 && i > 0) { y += chipH + chipGap; cx2 = CX + PAD; }
        c.fillStyle = "rgba(0,0,0,0.05)";
        roundRect(c, cx2, y, chipW, chipH, 8); c.fill();
        setFont(15, "400");
        c.fillStyle = "rgba(0,0,0,0.28)";
        c.fillText(lnk.label, cx2 + 10, y + 25);
        cx2 += chipW + chipGap;
      });
      y += chipH + 12;
    }
    y += 8;
  }

  // ── EVENT DETAILS — one field per line ──
  y = drawSectionHeader(c, "📋 EVENT DETAILS", CX, y, CW);

  const fees = ev.entryFees || {};
  const eb   = fees.earlyBird || {}, ac = fees.actual || {}, le = fees.lateEntry || {};

  const detailFields = [
    {label:"Start Date",   value: ev.startDateDisplay || "—"},
    {label:"End Date",     value: ev.endDateDisplay   || "—"},
    {label:"District",     value: ev.district         || "—"},
    {label:"Venue",        value: ev.venue            || "To Be Announced"},
    {label:"System",       value: ev.system           || "—"},
    {label:"Format",       value: ev.format           || "—"},
    {label:"Time Control", value: ev.timeControl      || "—"},
    {label:"Prize Fund",   value: ev.prizeFund        || "To Be Announced"},
  ];

  detailFields.forEach((field, i) => {
    y = drawStackedField(c, field.label, field.value, CX + PAD, y, CW - PAD*2, i);
  });
  y += 6;

  // ── ENTRY FEES ──
  y = drawSectionHeader(c, "💰 ENTRY FEES", CX, y, CW);
  const feeFields = [];
  if (eb.fees && eb.fees !== "—") feeFields.push({label:`Early Bird (till ${eb.date||"—"})`, value: eb.fees});
  if (ac.fees) feeFields.push({label:"Actual Entry", value: ac.fees});
  if (le.fees && le.fees !== "—") feeFields.push({label:`Late Entry (from ${le.date||"—"})`, value: le.fees});
  if (!feeFields.length) feeFields.push({label:"Entry Fees", value:"To Be Announced"});
  feeFields.forEach((field, i) => {
    y = drawStackedField(c, field.label, field.value, CX + PAD, y, CW - PAD*2, i);
  });
  y += 6;

  // ── TOURNAMENT DIRECTOR ──
  const td = ev.tournamentDirector || {};
  if (td.name) {
    y = drawSectionHeader(c, "🎯 TOURNAMENT DIRECTOR", CX, y, CW);
    y = drawStackedField(c, "Name", td.name + (td.fideId ? `  (FIDE ID: ${td.fideId})` : ""), CX+PAD, y, CW-PAD*2, 0);
    y += 6;
  }

  // ── ARBITERS ──
  const arb = ev.arbiters || {};
  const arbFields = [];
  if (arb.chiefArbiter?.name)  arbFields.push({label:"Chief Arbiter",          value: arb.chiefArbiter.name  + (arb.chiefArbiter.fideId  ? `  (FIDE: ${arb.chiefArbiter.fideId})`  : "")});
  if (arb.deputyCA1?.name)     arbFields.push({label:"Deputy Chief Arbiter 1", value: arb.deputyCA1.name     + (arb.deputyCA1.fideId     ? `  (FIDE: ${arb.deputyCA1.fideId})`     : "")});
  if (arb.deputyCA2?.name)     arbFields.push({label:"Deputy Chief Arbiter 2", value: arb.deputyCA2.name     + (arb.deputyCA2.fideId     ? `  (FIDE: ${arb.deputyCA2.fideId})`     : "")});
  if (!arbFields.length)       arbFields.push({label:"Arbiters", value:"Not Announced"});

  y = drawSectionHeader(c, "⚖️ ARBITERS", CX, y, CW);
  arbFields.forEach((field, i) => {
    y = drawStackedField(c, field.label, field.value, CX+PAD, y, CW-PAD*2, i);
  });
  y += 16;

  // ── FOOTER ──
  setFont(19, "700");
  c.textAlign = "center";
  c.fillStyle = "#1565C0";
  c.fillText("Rated Events GJ  •  Gujarat Chess Club", W/2, y + 26);
  y += 50;

  const cardBtmY = y;
  const cardH    = cardBtmY - cardTopY;

  // ── GOLD BOTTOM BAR ──
  c.fillStyle = goldGrad;
  c.fillRect(0, y, W, 14);
  const finalH = y + 14;

  // ──────────────────────────────────────────────────────────
  // COMPOSITE: BG + card white + copy content on top
  // ──────────────────────────────────────────────────────────
  const final = document.createElement("canvas");
  final.width  = W;
  final.height = finalH;
  const fc = final.getContext("2d");

  // 1) Chess BG
  drawChessBg(fc, W, finalH);

  // 2) White card
  fc.shadowColor = "rgba(0,0,0,0.3)"; fc.shadowBlur = 40; fc.shadowOffsetY = 6;
  fc.fillStyle = "#FFFFFF";
  roundRect(fc, CX, cardTopY, CW, cardH, 20); fc.fill();
  fc.shadowBlur = 0; fc.shadowOffsetY = 0;
  // Blue top stripe on card
  fc.fillStyle = "#1565C0";
  roundRect(fc, CX, cardTopY, CW, 10, {tl:20,tr:20,bl:0,br:0}); fc.fill();

  // 3) Copy drawn content
  fc.drawImage(canvas, 0, 0, W, finalH, 0, 0, W, finalH);

  // 4) Gold bars on top
  const goldGrad2 = fc.createLinearGradient(0,0,W,0);
  goldGrad2.addColorStop(0,"#FF8F00"); goldGrad2.addColorStop(0.5,"#FFC107"); goldGrad2.addColorStop(1,"#FF8F00");
  fc.fillStyle = goldGrad2;
  fc.fillRect(0, 0, W, 14);
  fc.fillRect(0, finalH - 14, W, 14);

  return final.toDataURL("image/jpeg", 0.96);
}

// ── Draw stacked field: LABEL (small, blue) on top, VALUE (larger, dark) below ──
function drawStackedField(c, label, value, x, y, w, rowIndex) {
  const bgColor = rowIndex % 2 === 0 ? "#F0F4FF" : "#F8FAFF";
  // Measure value height for wrapping
  c.font = "500 20px Arial, sans-serif";
  const valueLines = wrapTextLines(c, String(value || "—"), x, w - 16, 20);
  const fieldH = 28 + valueLines.length * 28 + 14;

  // Background
  c.fillStyle = bgColor;
  c.fillRect(x - 16, y, w + 32, fieldH);

  // Left accent bar
  c.fillStyle = "#1565C0";
  c.fillRect(x - 16, y, 4, fieldH);

  // Bottom border
  c.strokeStyle = "#DDEEFF"; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x - 16, y + fieldH); c.lineTo(x - 16 + w + 32, y + fieldH); c.stroke();

  // Label
  c.font = "700 16px Arial, sans-serif";
  c.fillStyle = "#1565C0";
  c.textAlign = "left";
  c.fillText(label.toUpperCase(), x, y + 20);

  // Value
  c.font = "500 20px Arial, sans-serif";
  c.fillStyle = "#1A237E";
  let vy = y + 46;
  valueLines.forEach(line => { c.fillText(line, x, vy); vy += 28; });

  return y + fieldH + 2;
}

// ── Section header bar ──
function drawSectionHeader(c, title, cardX, y, cardW) {
  c.fillStyle = "#1565C0";
  c.fillRect(cardX, y, cardW, 42);
  c.font = "700 18px Arial, sans-serif";
  c.fillStyle = "#FFFFFF";
  c.textAlign = "left";
  c.fillText(title, cardX + 20, y + 28);
  return y + 52;
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
