// stateselectiongj.js — Chess Vibes + WhatsApp Share
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

// ── DATE PILL ──────────────────────────────────────────────
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const now      = new Date();
const todayStr = now.toISOString().split("T")[0];
document.getElementById("datePill").textContent =
  `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

// ── CHESS CANVAS (ambient header animation) ────────────────
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
      ctx.globalAlpha = Math.max(0.02, p.opacity + Math.sin(frame * 0.012 + p.phase) * 0.025);
      ctx.font = `${p.size}px serif`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(p.piece, (p.x/100)*canvas.width, (p.y/100)*canvas.height);
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── TOAST ──────────────────────────────────────────────────
function showToast(msg, ms = 2800) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
}

// ── LOAD EVENTS ────────────────────────────────────────────
async function loadEvents() {
  try {
    const snap = await getDocs(collection(db, "stateselectiongjdb"));
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

// ── RENDER TABLE ───────────────────────────────────────────
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

// ── POPUP ──────────────────────────────────────────────────
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
      ${linkBtn("Map","📍","map",links.map)}
      ${linkBtn("Live Games","🎥","live",links.liveGames)}
      ${linkBtn("Prize List","🏆","prize",links.prizeList)}
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

// ── SHARE TO WHATSAPP ──────────────────────────────────────
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
    const dataURL  = await generateShareCard(ev, deepLink);

    // Build WhatsApp caption
    const fees2 = ev.entryFees || {};
    const eb2 = fees2.earlyBird || {}, ac2 = fees2.actual || {}, le2 = fees2.lateEntry || {};
    const arb2 = ev.arbiters || {};
    let caption = `👆 *View Full Details:*\n${deepLink}`;
    caption += `\n\n*Tournament Name:*\n${ev.eventName || "—"}`;
    caption += `\n\n*Organizer:*\n${ev.organizerName || "—"}`;
    caption += `\n\n*Start Date:*\n${ev.startDateDisplay || "—"}`;
    caption += `\n\n*End Date:*\n${ev.endDateDisplay || "—"}`;
    caption += `\n\n*District:*\n${ev.district || "—"}`;
    caption += `\n\n*Venue:*\n${ev.venue || "To Be Announced"}`;
    caption += `\n\n*System:*\n${ev.system || "—"}`;
    caption += `\n\n*Format:*\n${ev.format || "—"}`;
    caption += `\n\n*Time Control:*\n${ev.timeControl || "—"}`;
    caption += `\n\n*Prize Fund:*\n${ev.prizeFund || "To Be Announced"}`;
    if (eb2.fees && eb2.fees !== "—") caption += `\n\n*Early Bird Entry (till ${eb2.date||"—"}):*\n${eb2.fees}`;
    if (ac2.fees) caption += `\n\n*Actual Entry:*\n${ac2.fees}`;
    if (le2.fees && le2.fees !== "—") caption += `\n\n*Late Entry (from ${le2.date||"—"}):*\n${le2.fees}`;
    if (arb2.chiefArbiter?.name) caption += `\n\n*Chief Arbiter:*\n${arb2.chiefArbiter.name}`;
    if (arb2.deputyCA1?.name)    caption += `\n\n*Deputy Chief Arbiter 1:*\n${arb2.deputyCA1.name}`;
    if (arb2.deputyCA2?.name)    caption += `\n\n*Deputy Chief Arbiter 2:*\n${arb2.deputyCA2.name}`;
    caption += `\n\n_State Selection GJ — Gujarat Chess Club_`;

    const blob = await (await fetch(dataURL)).blob();
    const file = new File([blob], `${(ev.eventName||"event").replace(/\s+/g,"-")}.jpg`, { type: "image/jpeg" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: ev.eventName || "Chess Event", text: caption });
      restoreShareBtn(); return;
    }
    showShareFallback(dataURL, caption, deepLink, ev);
  } catch (err) {
    if (err.name !== "AbortError") {
      const s = document.getElementById("shareStatus");
      s.style.display = "block";
      s.innerHTML = `<div style="color:#C62828;font-size:12px;padding:6px 0;">⚠️ ${err.message}</div>`;
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
        <div class="fallback-step">📋 Attach image in WhatsApp and paste this link as caption:</div>
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

// ── SHARE CARD: 1080×1350, HD 3x, white bg, exact popup mirror, no links ──
async function generateShareCard(ev, deepLink) {
  const OUT_W = 1080, OUT_H = 1350;
  const S = 3;
  const W = OUT_W * S, H = OUT_H * S;

  const fees = ev.entryFees || {};
  const eb = fees.earlyBird || {}, ac = fees.actual || {}, le = fees.lateEntry || {};
  const fRows = [];
  if (eb.fees && eb.fees !== "—") fRows.push([`Early Bird (till ${eb.date||"—"})`, eb.fees]);
  if (ac.fees) fRows.push(["Actual Entry", ac.fees]);
  if (le.fees && le.fees !== "—") fRows.push([`Late Entry (from ${le.date||"—"})`, le.fees]);
  if (!fRows.length) fRows.push(["Entry Fees", "To Be Announced"]);

  const arb = ev.arbiters || {};
  const aRows = [];
  if (arb.chiefArbiter?.name) aRows.push(["Chief Arbiter",          arb.chiefArbiter.name + (arb.chiefArbiter.fideId ? ` (FIDE: ${arb.chiefArbiter.fideId})` : "")]);
  if (arb.deputyCA1?.name)    aRows.push(["Deputy Chief Arbiter 1", arb.deputyCA1.name    + (arb.deputyCA1.fideId    ? ` (FIDE: ${arb.deputyCA1.fideId})`    : "")]);
  if (arb.deputyCA2?.name)    aRows.push(["Deputy Chief Arbiter 2", arb.deputyCA2.name    + (arb.deputyCA2.fideId    ? ` (FIDE: ${arb.deputyCA2.fideId})`    : "")]);
  if (!aRows.length)          aRows.push(["Arbiters", "Not Announced"]);

  const td = ev.tournamentDirector || {};
  const tdRows = td.name ? [["Name", td.name + (td.fideId ? ` (FIDE: ${td.fideId})` : "")]] : [];

  const detRows = [
    ["Start Date",   ev.startDateDisplay || "—"],
    ["End Date",     ev.endDateDisplay   || "—"],
    ["District",     ev.district         || "—"],
    ["Venue",        ev.venue            || "To Be Announced"],
    ["System",       ev.system           || "—"],
    ["Format",       ev.format           || "—"],
    ["Time Control", ev.timeControl      || "—"],
    ["Prize Fund",   ev.prizeFund        || "To Be Announced"],
  ];

  const PAD      = 44 * S;
  const TW       = W - PAD * 2;
  const LW_RATIO = 0.40;
  const SEC_H    = 36 * S;
  const ROW_H    = 44 * S;
  const LABEL_SZ = 11 * S;
  const VAL_SZ   = 14 * S;
  const NAME_SZ  = (ev.eventName||"").length > 55 ? 22*S : (ev.eventName||"").length > 38 ? 26*S : 30*S;
  const ORG_SZ   = 14 * S;
  const FOOT_SZ  = 11 * S;
  const GAP      = 14 * S;
  const DIV_GAP  = 16 * S;

  const measure = document.createElement("canvas");
  measure.width = W; measure.height = 100;
  const mc = measure.getContext("2d");

  function measureRowH(ctx, value, tw) {
    ctx.font = `400 ${VAL_SZ}px Arial, sans-serif`;
    const lines = imgWrap(ctx, String(value || "—"), tw * (1 - LW_RATIO) - 20*S, VAL_SZ);
    return Math.max(ROW_H, lines.length * (VAL_SZ + 6*S) + 16*S);
  }
  function sectionH(ctx, rows, tw) {
    let h = SEC_H;
    rows.forEach(([,v]) => { h += measureRowH(ctx, v, tw); });
    return h;
  }

  mc.font = `800 ${NAME_SZ}px Arial, sans-serif`;
  const nameLines = imgWrap(mc, ev.eventName || "—", TW, NAME_SZ);
  const nameH = nameLines.length * (NAME_SZ + 10*S);

  let contentH = 0;
  contentH += nameH + 4*S;
  contentH += ORG_SZ + 16*S;
  contentH += DIV_GAP + 1 + DIV_GAP;
  contentH += sectionH(mc, detRows, TW) + GAP;
  contentH += sectionH(mc, fRows,   TW) + GAP;
  if (tdRows.length) contentH += sectionH(mc, tdRows, TW) + GAP;
  contentH += sectionH(mc, aRows,   TW) + GAP;
  contentH += DIV_GAP + FOOT_SZ + 24*S;

  const vPad = Math.max(32*S, Math.floor((H - contentH) / 2));

  const canvas = document.getElementById("shareCanvas");
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.fillStyle = "#FFFFFF";
  c.fillRect(0, 0, W, H);

  let y = vPad;

  // Event name
  c.textAlign = "left";
  c.font = `800 ${NAME_SZ}px Arial, sans-serif`;
  c.fillStyle = "#1A237E";
  nameLines.forEach(line => { c.fillText(line, PAD, y); y += NAME_SZ + 10*S; });
  y += 4*S;

  // Organizer
  c.font = `400 ${ORG_SZ}px Arial, sans-serif`;
  c.fillStyle = "#78909C";
  c.fillText("🏆 " + (ev.organizerName || "—"), PAD, y);
  y += ORG_SZ + DIV_GAP;

  // Divider
  c.strokeStyle = "#E0E0E0"; c.lineWidth = 1.5*S;
  c.beginPath(); c.moveTo(PAD, y); c.lineTo(W-PAD, y); c.stroke();
  y += DIV_GAP;

  function drawSection(title, rows) {
    c.fillStyle = "#1565C0";
    c.fillRect(PAD, y, TW, SEC_H);
    c.font = `700 ${13*S}px Arial, sans-serif`;
    c.fillStyle = "#FFFFFF";
    c.textAlign = "left";
    c.fillText(title, PAD + 14*S, y + SEC_H * 0.67);
    y += SEC_H;
    const tableStartY = y;
    rows.forEach(([label, value], i) => {
      const LW = Math.floor(TW * LW_RATIO);
      c.font = `400 ${VAL_SZ}px Arial, sans-serif`;
      const vLines = imgWrap(c, String(value || "—"), TW - LW - 18*S, VAL_SZ);
      const rH = Math.max(ROW_H, vLines.length * (VAL_SZ + 6*S) + 16*S);
      c.fillStyle = i % 2 === 0 ? "#FFFFFF" : "#F8FBFF";
      c.fillRect(PAD, y, TW, rH);
      c.fillStyle = "#EEF4FF";
      c.fillRect(PAD, y, LW, rH);
      if (i < rows.length - 1) {
        c.strokeStyle = "#DDEEFF"; c.lineWidth = S;
        c.beginPath(); c.moveTo(PAD, y+rH); c.lineTo(PAD+TW, y+rH); c.stroke();
      }
      c.strokeStyle = "#DDEEFF"; c.lineWidth = S;
      c.beginPath(); c.moveTo(PAD+LW, y); c.lineTo(PAD+LW, y+rH); c.stroke();
      c.font = `700 ${LABEL_SZ}px Arial, sans-serif`;
      c.fillStyle = "#1565C0";
      c.textAlign = "left";
      c.fillText(label.toUpperCase(), PAD + 12*S, y + rH/2 + LABEL_SZ*0.38);
      c.font = `400 ${VAL_SZ}px Arial, sans-serif`;
      c.fillStyle = "#37474F";
      let vy = y + (rH - vLines.length*(VAL_SZ+6*S))/2 + VAL_SZ;
      vLines.forEach(line => { c.fillText(line, PAD+LW+12*S, vy); vy += VAL_SZ+6*S; });
      y += rH;
    });
    c.strokeStyle = "#BBDEFB"; c.lineWidth = 1.5*S;
    c.strokeRect(PAD, tableStartY, TW, y - tableStartY);
    y += GAP;
  }

  drawSection("📋 Event Details", detRows);
  drawSection("💰 Entry Fees",    fRows);
  if (tdRows.length) drawSection("🎯 Tournament Director", tdRows);
  drawSection("⚖️ Arbiters",      aRows);

  // Footer pinned to bottom
  y = H - vPad + DIV_GAP;
  c.strokeStyle = "#E0E0E0"; c.lineWidth = S;
  c.beginPath(); c.moveTo(PAD, y); c.lineTo(W-PAD, y); c.stroke();
  y += 14*S;
  c.font = `400 ${FOOT_SZ}px Arial, sans-serif`;
  c.fillStyle = "#90A4AE";
  c.textAlign = "center";
  c.fillText("State Selection GJ  •  Gujarat Chess Club", W/2, y + FOOT_SZ);

  const fin = document.createElement("canvas");
  fin.width = OUT_W; fin.height = OUT_H;
  const fc = fin.getContext("2d");
  fc.imageSmoothingEnabled = true;
  fc.imageSmoothingQuality = "high";
  fc.fillStyle = "#FFFFFF";
  fc.fillRect(0, 0, OUT_W, OUT_H);
  fc.drawImage(canvas, 0, 0, W, H, 0, 0, OUT_W, OUT_H);
  return fin.toDataURL("image/jpeg", 1.0);
}

// ── imgWrap helper ────────────────────────────────────────
function imgWrap(c, text, maxW, fontSize) {
  const words = String(text || "—").split(" ");
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
  } catch(err) { errEl.textContent = "Error: " + err.message; }
};

function buildEventList(events) {
  const cont = document.getElementById("eventListContent");
  cont.innerHTML = "";
  if (!events.length) {
    cont.innerHTML = `<div style="text-align:center;color:#78909C;padding:24px;">No events found.</div>`;
    return;
  }
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

window.editEvent = docId => { closeModal("eventListModal"); window.location.href=`stateselectiongjform.html?editDocId=${docId}`; };

window.deleteEvent = async function(docId, eventName) {
  if (!confirm(`Delete "${eventName}"? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db,"stateselectiongjdb",docId));
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
