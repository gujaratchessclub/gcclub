// rapidrankings.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const RATING_TYPE = "rapidRating"; // Rapid Rating key
let allPlayers = [];

// ── DATE ──────────────────────────────────────────────────
const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
const now = new Date();
document.getElementById("datePill").textContent =
  `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

// ── MASKING ───────────────────────────────────────────────
function maskPhone(n){ if(!n) return "—"; return "X".repeat(Math.max(0,n.length-3))+n.slice(-3); }
function maskEmail(e){
  if(!e) return "—";
  const at=e.indexOf("@"); if(at<0) return "XXXXXXXX";
  return e.substring(0,Math.min(3,at))+"X".repeat(Math.max(0,at-3))+e.substring(at);
}
function maskFull(v){ return v?"X".repeat(Math.min(8,v.length)):"—"; }

// ── LOAD ──────────────────────────────────────────────────
async function loadPlayers() {
  try {
    const snap = await getDocs(collection(db, "IPdb"));
    const all = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));

    // Filter: only players who have stdRating and are rated players
    allPlayers = all.filter(p =>
      p.roles?.ratedPlayer &&
      p.player?.[RATING_TYPE] &&
      String(p.player[RATING_TYPE]).trim() !== ""
    );

    // Sort by rating descending
    allPlayers.sort((a, b) =>
      parseInt(b.player[RATING_TYPE] || 0) - parseInt(a.player[RATING_TYPE] || 0)
    );

    document.getElementById("loadingMsg").style.display = "none";
    if (allPlayers.length === 0) {
      document.getElementById("emptyMsg").style.display = "block";
      document.getElementById("countBadge").textContent = "0 Players";
      return;
    }
    renderTable(allPlayers);
  } catch(err) {
    document.getElementById("loadingMsg").textContent = "Error: " + err.message;
  }
}

// ── RENDER ────────────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById("rankBody");
  const table = document.getElementById("rankTable");
  tbody.innerHTML = "";

  if (data.length === 0) {
    table.style.display = "none";
    document.getElementById("emptyMsg").style.display = "block";
    document.getElementById("countBadge").textContent = "0 Players";
    return;
  }
  document.getElementById("emptyMsg").style.display = "none";
  table.style.display = "table";
  document.getElementById("countBadge").textContent = `${data.length} Player${data.length!==1?"s":""}`;

  data.forEach((p, idx) => {
    const rank = idx + 1;
    const rating = p.player?.[RATING_TYPE] || "—";
    const title = p.player?.title && p.player.title !== "None" && p.player.title !== "" ? p.player.title : null;

    const rankClass = rank===1?"rank-1 top1":rank===2?"rank-2 top2":rank===3?"rank-3 top3":"rank-other";
    const rowClass = rank===1?"top1":rank===2?"top2":rank===3?"top3":"";
    const rankIcon = rank===1?"🥇":rank===2?"🥈":rank===3?"🥉":rank;

    const fideCell = p.hasFide && p.fideId
      ? `<a class="fide-link" href="https://ratings.fide.com/profile/${p.fideId}" target="_blank">${p.fideId} ↗</a>`
      : `<span class="no-fide">${p.ipId||"—"}</span>`;

    const titleCell = title
      ? `<span class="title-badge">${title}</span>`
      : `<span class="no-title">—</span>`;

    const tr = document.createElement("tr");
    if (rowClass) tr.className = rowClass;
    tr.innerHTML = `
      <td class="rank-cell ${rankClass}">${rankIcon}</td>
      <td class="rating-cell">${rating}</td>
      <td>${fideCell}</td>
      <td>${titleCell}</td>
      <td class="name-cell">${p.fullName||"—"}</td>
      <td>${p.birthYear||"—"}</td>
      <td>${p.gender||"—"}</td>
      <td>${p.district||"—"}</td>
      <td><button class="profile-btn" onclick="openProfile('${p._docId}')">Profile</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// ── PROFILE POPUP ─────────────────────────────────────────
window.openProfile = function(docId) {
  const p = allPlayers.find(r => r._docId === docId);
  if (!p) return;

  let photoHtml;
  if (p.photoLink) {
    photoHtml = `<div class="profile-photo-wrap"><img src="${p.photoLink}" class="profile-photo-square" alt="Photo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"/><div class="profile-photo-placeholder" style="display:none;">👤</div></div>`;
  } else {
    photoHtml = `<div class="profile-photo-wrap"><div class="profile-photo-placeholder">👤</div></div>`;
  }

  const idDisplay = p.hasFide && p.fideId
    ? `<a href="https://ratings.fide.com/profile/${p.fideId}" target="_blank" style="color:var(--blue);text-decoration:none;font-weight:700;">${p.fideId} ↗</a>`
    : (p.ipId||"—");

  const pl = p.player||{};
  const arb = p.arbiter||{};
  const tr = p.trainer||{};

  const playerContent = p.roles?.ratedPlayer ? `
    <div class="profile-detail-row"><span class="profile-detail-label">Rapid Rating</span><span class="profile-detail-value rating-highlight">${pl.stdRating||"—"}</span></div>
    <div class="profile-detail-row"><span class="profile-detail-label">Rapid Rating</span><span class="profile-detail-value">${pl.rapidRating||"—"}</span></div>
    <div class="profile-detail-row"><span class="profile-detail-label">Blitz Rating</span><span class="profile-detail-value">${pl.blitzRating||"—"}</span></div>
    <div class="profile-detail-row"><span class="profile-detail-label">Title</span><span class="profile-detail-value">${pl.title||"—"}</span></div>
    <div class="profile-detail-row"><span class="profile-detail-label">Arena Title</span><span class="profile-detail-value">${pl.arenaTitle||"—"}</span></div>
  ` : `<div class="empty-tab">No player details.</div>`;

  const arbContent = p.roles?.arbiter
    ? `<div class="profile-detail-row"><span class="profile-detail-label">Arbiter Title</span><span class="profile-detail-value">${arb.title||"—"}</span></div>`
    : `<div class="empty-tab">No arbiter details.</div>`;

  const trainerContent = p.roles?.trainer
    ? `<div class="profile-detail-row"><span class="profile-detail-label">Trainer Title</span><span class="profile-detail-value">${tr.title||"—"}</span></div>`
    : `<div class="empty-tab">No trainer details.</div>`;

  document.getElementById("profileContent").innerHTML = `
    ${photoHtml}
    <div class="profile-name">${p.fullName||"—"}</div>
    <div class="profile-id">${idDisplay}</div>
    <div class="profile-info-row"><span class="profile-info-label">Gender</span><span class="profile-info-value">${p.gender||"—"}</span></div>
    <div class="profile-info-row"><span class="profile-info-label">Birth Year</span><span class="profile-info-value">${p.birthYear||"—"}</span></div>
    <div class="profile-info-row"><span class="profile-info-label">District</span><span class="profile-info-value">${p.district||"—"}</span></div>
    <div class="profile-info-row"><span class="profile-info-label">WhatsApp</span><span class="profile-info-value masked">${maskPhone(p.whatsapp)}</span></div>
    <div class="profile-info-row"><span class="profile-info-label">Email</span><span class="profile-info-value masked">${maskEmail(p.email)}</span></div>
    <div class="profile-info-row"><span class="profile-info-label">Lichess</span><span class="profile-info-value masked">${p.lichessId?maskFull(p.lichessId):"—"}</span></div>
    <div class="profile-info-row"><span class="profile-info-label">Chess.com</span><span class="profile-info-value masked">${p.chesscomId?maskFull(p.chesscomId):"—"}</span></div>
    <div class="profile-tabs">
      <button class="profile-tab active" onclick="switchTab('player',this)">♟ Player</button>
      <button class="profile-tab" onclick="switchTab('arbiter',this)">⚖️ Arbiter</button>
      <button class="profile-tab" onclick="switchTab('trainer',this)">🎓 Trainer</button>
    </div>
    <div class="tab-content active" id="tab-player">${playerContent}</div>
    <div class="tab-content" id="tab-arbiter">${arbContent}</div>
    <div class="tab-content" id="tab-trainer">${trainerContent}</div>
  `;
  document.getElementById("profilePopup").classList.add("active");
};

window.switchTab = function(name, btn) {
  document.querySelectorAll(".profile-tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c=>c.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("tab-"+name).classList.add("active");
};
window.closeProfile = () => document.getElementById("profilePopup").classList.remove("active");
document.getElementById("profilePopup").addEventListener("click", e => { if(e.target.id==="profilePopup") closeProfile(); });

// ── FILTERS ───────────────────────────────────────────────
function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase().trim();
  const district = document.getElementById("districtFilter").value;
  const gender = document.getElementById("genderFilter").value;
  const fromVal = parseInt(document.getElementById("ratingFrom").value) || 0;
  const toVal = parseInt(document.getElementById("ratingTo").value) || 9999;

  const filtered = allPlayers.filter(p => {
    const rating = parseInt(p.player?.[RATING_TYPE] || 0);
    return (!district || p.district === district) &&
           (!gender || p.gender === gender) &&
           (rating >= fromVal && rating <= toVal) &&
           (!search ||
             (p.fullName||"").toLowerCase().includes(search) ||
             (p.fideId||"").includes(search) ||
             (p.ipId||"").toLowerCase().includes(search));
  });
  renderTable(filtered);
}

["searchInput","districtFilter","genderFilter"].forEach(id => {
  document.getElementById(id).addEventListener(id==="searchInput"?"input":"change", applyFilters);
});
["ratingFrom","ratingTo"].forEach(id => {
  document.getElementById(id).addEventListener("input", applyFilters);
});

loadPlayers();
