/* ══════════════════════════════════════════
   IP DATABASE — IP.js   (Gujarat Chess Club)
══════════════════════════════════════════ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, deleteDoc, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
/* Firebase Storage removed — photos stored as base64 in Firestore */

const firebaseConfig = {
  apiKey: "AIzaSyBXrHcMJzQn3cxutg41LZs9oYwEfALe00s",
  authDomain: "ratedeventsgj.firebaseapp.com",
  projectId: "ratedeventsgj",
  storageBucket: "ratedeventsgj.firebasestorage.app",
  messagingSenderId: "527826897689",
  appId: "1:527826897689:web:fb0439fff04a695a599388"
};
const fbApp   = initializeApp(firebaseConfig);
const db      = getFirestore(fbApp);
/* storage = removed, using Firestore base64 instead */

const DB_NAME   = "IPdatabase";
const ADMIN_PIN = "270620";
const PAGE_SIZE = 100;

const ALL_FIELDS = [
  "aicfId","arbiterTitle","arenaTitle","birthYear","blitzRating",
  "chesscomId","contactNo","district","dob","dobRaw","email",
  "fideArbiter","fideId","fideTrainer","gender","ipId","ipPin",
  "lichessId","name","pageURL","rapidRating","ratedPlayer",
  "stdRating","status","title","trainerTitle"
];

let allData        = [];
let filtered       = [];
let dupDocIds      = new Set();
let adminMode      = false;
let currentProfile = null;
let selectedIds    = new Set();
let currentPage    = 1;
let pickedFile     = null; /* file chosen for upload, held in memory */

let activeFilters = {
  titledPlayer:false, fideArbiter:false, fideTrainer:false,
  arenaTitled:false,  ratedPlayer:false,  noName:false, dupEntry:false
};

const DAYS  =["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];

function setDatePill(){
  const d=new Date();
  document.getElementById("datePill").textContent=
    `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function showToast(msg,ms=2600){
  const t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),ms);
}
function isFideNum(id){ return id?/^\d+$/.test(id.trim()):false; }
function maskLast(v,keep=3){ return v?"•".repeat(Math.max(3,v.length-keep))+v.slice(-keep):"—"; }
function maskEmail(v){
  if(!v) return "—";
  const at=v.indexOf("@"); if(at<0) return "•••@•••";
  return "•••"+v.slice(Math.max(0,at-2),at)+v.slice(at);
}

/* ════════════════════════
   LOAD
════════════════════════ */
async function loadData(){
  document.getElementById("tbody").innerHTML=
    `<tr class="loading-row"><td colspan="11"><div class="spinner"></div><br>Loading IP Database…</td></tr>`;
  try{
    const snap=await getDocs(collection(db,DB_NAME));
    allData=snap.docs.map(d=>({_docId:d.id,...d.data()}));
    detectDups(); populateDistricts(); applyFilter();
  }catch(e){
    document.getElementById("tbody").innerHTML=
      `<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--red);">⚠️ Load error: ${e.message}</td></tr>`;
  }
}
function detectDups(){
  dupDocIds.clear(); const map={};
  allData.forEach(r=>{
    const fid=(r.fideId||"").trim();
    if(!fid||fid.toUpperCase().startsWith("IP")) return;
    (map[fid]=map[fid]||[]).push(r._docId);
  });
  Object.values(map).forEach(ids=>{ if(ids.length>1) ids.forEach(id=>dupDocIds.add(id)); });
  const btn=document.getElementById("dupAlert");
  if(dupDocIds.size>0){btn.textContent=`⚠️ ${dupDocIds.size} Duplicates`;btn.classList.add("on");}
  else btn.classList.remove("on");
}
function populateDistricts(){
  const list=[...new Set(allData.map(r=>(r.district||"").toUpperCase().trim()).filter(Boolean))].sort();
  const sel=document.getElementById("fDistrict");
  sel.innerHTML=`<option value="">All Districts</option>`;
  list.forEach(d=>{const o=document.createElement("option");o.value=d;o.textContent=d;sel.appendChild(o);});
}

/* ════════════════════════
   FILTER
════════════════════════ */
window.toggleFilterBtn=function(key){
  activeFilters[key]=!activeFilters[key];
  const ids={titledPlayer:"btnTitledPlayer",fideArbiter:"btnFideArbiter",fideTrainer:"btnFideTrainer",
    arenaTitled:"btnArenaTitled",ratedPlayer:"btnRatedPlayer",noName:"btnNoName",dupEntry:"btnDupEntry"};
  document.getElementById(ids[key]).classList.toggle("active",activeFilters[key]);
  currentPage=1; applyFilter();
};

function applyFilter(){
  const search=(document.getElementById("fSearch").value||"").trim().toLowerCase();
  const district=(document.getElementById("fDistrict").value||"");
  const gender=(document.getElementById("fGender").value||"");
  const status=(document.getElementById("fStatus").value||"");
  const byFrom=parseInt(document.getElementById("fBirthFrom").value||"0")||0;
  const byTo=parseInt(document.getElementById("fBirthTo").value||"9999")||9999;
  let data=[...allData];
  if(activeFilters.dupEntry) data=data.filter(r=>dupDocIds.has(r._docId));
  data=data.filter(r=>{
    if(search&&![(r.name||""),(r.fideId||""),(r.ipId||""),(r.aicfId||"")]
      .map(v=>v.toLowerCase()).some(v=>v.includes(search))) return false;
    if(district&&(r.district||"").toUpperCase()!==district) return false;
    if(gender&&(r.gender||"").toUpperCase()!==gender) return false;
    if(status&&(r.status||"").toUpperCase()!==status) return false;
    const by=parseInt(r.birthYear)||0;
    if(byFrom&&by&&by<byFrom) return false;
    if(byTo&&by&&by>byTo) return false;
    return true;
  });
  if(activeFilters.titledPlayer) data=data.filter(r=>(r.title||"").trim());
  if(activeFilters.fideArbiter)  data=data.filter(r=>(r.arbiterTitle||"").trim());
  if(activeFilters.fideTrainer)  data=data.filter(r=>(r.trainerTitle||"").trim());
  if(activeFilters.arenaTitled)  data=data.filter(r=>(r.arenaTitle||"").trim());
  if(activeFilters.ratedPlayer)  data=data.filter(r=>
    (r.stdRating||"").trim()||(r.rapidRating||"").trim()||(r.blitzRating||"").trim());
  if(activeFilters.noName) data=data.filter(r=>!(r.name||"").trim());
  data.sort((a,b)=>{
    const an=(a.name||"").trim(),bn=(b.name||"").trim();
    if(an&&!bn)return -1; if(!an&&bn)return 1; return an.localeCompare(bn);
  });
  filtered=data;
  document.getElementById("resultCount").textContent=`${filtered.length} records`;
  const tp=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  if(currentPage>tp) currentPage=tp;
  renderTable(); renderPagination();
}

window.clearFilters=function(){
  ["fSearch","fBirthFrom","fBirthTo"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  ["fGender","fDistrict","fStatus"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  Object.keys(activeFilters).forEach(k=>activeFilters[k]=false);
  ["btnTitledPlayer","btnFideArbiter","btnFideTrainer","btnArenaTitled",
   "btnRatedPlayer","btnNoName","btnDupEntry"].forEach(id=>{
    const b=document.getElementById(id);if(b)b.classList.remove("active");
  });
  currentPage=1; applyFilter();
};

/* ════════════════════════
   TABLE
════════════════════════ */
function renderTable(){
  const tbody=document.getElementById("tbody");
  tbody.innerHTML="";
  if(!filtered.length){
    tbody.innerHTML=`<tr><td colspan="11" style="text-align:center;padding:48px;color:var(--muted);">No records found.</td></tr>`;
    return;
  }
  const start=(currentPage-1)*PAGE_SIZE;
  filtered.slice(start,Math.min(start+PAGE_SIZE,filtered.length)).forEach((row,i)=>{
    const sr=filtered.length-(start+i);
    const tr=document.createElement("tr");
    if(dupDocIds.has(row._docId)) tr.classList.add("dup-row");
    if(selectedIds.has(row._docId)) tr.classList.add("sel-row");
    const photoInner=row.pageURL
      ?`<img src="${row.pageURL}" class="photo-thumb" alt="Photo" onclick="openLightbox('${row.pageURL}')">`
      :`<div class="photo-placeholder">👤</div>`;
    const rawId=row.ipId||row.fideId||"";
    const idHTML=isFideNum(rawId)
      ?`<a class="fide-link" href="https://ratings.fide.com/profile/${rawId}" target="_blank" rel="noopener">${rawId}</a>`
      :`<span class="ip-id-badge">${rawId||"—"}</span>`;
    tr.innerHTML=`
      <td class="chk-td"><input type="checkbox" class="row-check" ${selectedIds.has(row._docId)?"checked":""} onchange="toggleSelect('${row._docId}',this.checked)"></td>
      <td class="photo-cell"><div class="photo-wrap">${photoInner}<div class="plus-btn" onclick="openProfile('${row._docId}',true)" title="Upload photo">+</div></div></td>
      <td class="sr-cell">${sr}</td>
      <td class="id-cell">${idHTML}</td>
      <td>${buildTitles(row)}</td>
      <td class="name-cell">${row.name||'<span style="color:var(--muted);font-style:italic;">—</span>'}</td>
      <td>${row.birthYear||"—"}</td>
      <td>${row.gender||"—"}</td>
      <td class="roles-cell">${buildRoles(row)}</td>
      <td>${row.district||"—"}</td>
      <td class="action-cell"><button class="profile-btn" onclick="openProfile('${row._docId}',false)">👤 Profile</button></td>
    `;
    tbody.appendChild(tr);
  });
}
function buildTitles(r){
  const p=[];
  if(r.title)        p.push(`<span class="t-badge player">${r.title}</span>`);
  if(r.arbiterTitle) p.push(`<span class="t-badge arbiter">${r.arbiterTitle}</span>`);
  if(r.trainerTitle) p.push(`<span class="t-badge trainer">${r.trainerTitle}</span>`);
  if(r.arenaTitle)   p.push(`<span class="t-badge arena">${r.arenaTitle}</span>`);
  return p.length?`<div class="title-badges">${p.join("")}</div>`:"—";
}
function buildRoles(r){
  const p=[];
  if((r.ratedPlayer||"").toUpperCase()==="YES") p.push(`<span class="role-tag rated">Rated</span>`);
  if((r.fideArbiter||"").toUpperCase()==="YES") p.push(`<span class="role-tag arbiter">Arbiter</span>`);
  if((r.fideTrainer||"").toUpperCase()==="YES") p.push(`<span class="role-tag trainer">Trainer</span>`);
  return p.length?p.join(""):"—";
}

/* ════════════════════════
   PAGINATION
════════════════════════ */
function renderPagination(){
  const bar=document.getElementById("paginationBar");
  const tp=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  if(tp<=1){bar.innerHTML="";return;}
  let h=`<button class="page-btn nav" onclick="goPage(${currentPage-1})" ${currentPage===1?"disabled":""}>‹ Prev</button>`;
  h+=pb(1);
  if(currentPage>4) h+=`<span class="page-ellipsis">…</span>`;
  for(let p=Math.max(2,currentPage-2);p<=Math.min(tp-1,currentPage+2);p++) h+=pb(p);
  if(currentPage<tp-3) h+=`<span class="page-ellipsis">…</span>`;
  if(tp>1) h+=pb(tp);
  h+=`<button class="page-btn nav" onclick="goPage(${currentPage+1})" ${currentPage===tp?"disabled":""}>Next ›</button>`;
  bar.innerHTML=h;
}
function pb(p){return `<button class="page-btn ${p===currentPage?"active":""}" onclick="goPage(${p})">Page ${p}</button>`;}
window.goPage=function(p){
  const tp=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  if(p<1||p>tp) return;
  currentPage=p; renderTable(); renderPagination();
  document.querySelector(".table-wrapper").scrollIntoView({behavior:"smooth",block:"start"});
};

/* ══════════════════════════════════════════════════
   PROFILE MODAL
   openProfile(docId, scrollToUpload)
   — scrollToUpload=true when + button is clicked
     so it jumps straight to the upload section
══════════════════════════════════════════════════ */
window.openProfile=function(docId, scrollToUpload=false){
  const row=allData.find(r=>r._docId===docId);
  if(!row) return;
  currentProfile=row;
  pickedFile=null;
  renderProfile(row, false, false);
  document.getElementById("profileModal").classList.add("active");
  if(scrollToUpload){
    /* small delay so modal renders first, then trigger file pick */
    setTimeout(()=>{ document.getElementById("profileFileInput").click(); },200);
  }
};

function renderProfile(row, adminOpen, ipOpen){
  const unlocked=adminOpen||ipOpen;

  /* photo square — clickable to pick file, + button also triggers */
  const photoContent=row.pageURL
    ?`<img id="profPhotoImg" src="${row.pageURL}" class="profile-photo-sq" alt="Photo" onclick="openLightbox('${row.pageURL}')" title="Click to view">`
    :`<div class="profile-photo-placeholder" id="profPhotoPlaceholder">👤</div>`;

  const fields=[
    {l:"IP ID",         v:row.ipId||"—"},
    {l:"FIDE ID",       v:isFideNum(row.fideId||"")?`<a class="fide-link-lg" href="https://ratings.fide.com/profile/${row.fideId}" target="_blank">${row.fideId}</a>`:(row.fideId||"—")},
    {l:"AICF ID",       v:row.aicfId||"—"},
    {l:"Birth Year",    v:row.birthYear||"—"},
    {l:"Gender",        v:row.gender||"—"},
    {l:"District",      v:row.district||"—"},
    {l:"Status",        v:row.status||"—"},
    {l:"Std Rating",    v:row.stdRating||"—"},
    {l:"Rapid Rating",  v:row.rapidRating||"—"},
    {l:"Blitz Rating",  v:row.blitzRating||"—"},
    {l:"Title",         v:row.title||"—"},
    {l:"Arbiter Title", v:row.arbiterTitle||"—"},
    {l:"Trainer Title", v:row.trainerTitle||"—"},
    {l:"Arena Title",   v:row.arenaTitle||"—"},
    {l:"Date of Birth", v:unlocked?(row.dobRaw||row.dob||"—"):(row.dobRaw||row.dob?"••/••/••••":"—")},
    {l:"Contact No",    v:unlocked?(row.contactNo||"—"):maskLast(row.contactNo,3)},
    {l:"Email",         v:unlocked?(row.email||"—"):maskEmail(row.email)},
    {l:"Lichess ID",    v:unlocked?(row.lichessId||"—"):maskLast(row.lichessId,2)},
    {l:"Chess.com ID",  v:unlocked?(row.chesscomId||"—"):maskLast(row.chesscomId,2)},
    {l:"IP PIN",        v:unlocked?(row.ipPin||"—"):"••••••"},
  ];

  const badges=[];
  if(row.title)        badges.push(`<span class="t-badge player">${row.title}</span>`);
  if(row.arbiterTitle) badges.push(`<span class="t-badge arbiter">${row.arbiterTitle}</span>`);
  if(row.trainerTitle) badges.push(`<span class="t-badge trainer">${row.trainerTitle}</span>`);
  if(row.arenaTitle)   badges.push(`<span class="t-badge arena">${row.arenaTitle}</span>`);

  /* ── VIEW DETAILS login panels (below fields) ── */
  const loginSection=!unlocked?`
    <hr class="profile-divider">
    <div class="login-panel">
      <div class="login-panel-title">🔐 Admin Login — View Full Details</div>
      <div class="login-row">
        <input type="password" id="profAdminPin" class="login-input" placeholder="Admin PIN" maxlength="6" inputmode="numeric">
        <button class="login-btn" onclick="profileAdminLogin()">Enter</button>
      </div>
      <div class="login-err" id="profAdminErr"></div>
    </div>
    <div class="login-panel">
      <div class="login-panel-title">👤 IP Login — View Your Details</div>
      <div class="login-row">
        <input id="profIpId" class="login-input" placeholder="Your IP ID" style="letter-spacing:1px;" maxlength="20">
        <input type="password" id="profIpPin" class="login-input" placeholder="IP PIN" maxlength="6" inputmode="numeric">
        <button class="login-btn" onclick="profileIpLogin()">Enter</button>
      </div>
      <div class="login-err" id="profIpErr"></div>
    </div>
  `:"";

  document.getElementById("profileContent").innerHTML=`

    <!-- Hidden file input — triggered by square or + button -->
    <input type="file" id="profileFileInput" accept=".jpg,.jpeg" style="display:none" onchange="profileFilePicked(this)">

    <!-- TOP: Photo square + name -->
    <div class="profile-top">
      <div class="profile-photo-wrap">
        <!-- The square: click to pick file for upload -->
        <div class="prof-photo-square" onclick="document.getElementById('profileFileInput').click()" title="Tap to upload photo">
          ${photoContent}
          <div class="prof-photo-overlay">📷 Tap to Upload</div>
        </div>
        <!-- + button outside square -->
        <div class="profile-plus-btn" onclick="document.getElementById('profileFileInput').click()" title="Upload photo">+</div>
      </div>
      <div class="profile-info-main">
        <div class="profile-name">${row.name||"—"}</div>
        <div class="profile-badges">${badges.join("")}</div>
      </div>
    </div>

    <!-- UPLOAD PANEL — hidden until file is picked -->
    <div class="prof-upload-panel" id="profUploadPanel" style="display:none">
      <div class="prof-preview-row">
        <img id="profUploadPreview" src="" class="prof-preview-img" alt="Preview">
        <div class="prof-upload-info">
          <div class="prof-file-name" id="profFileName"></div>
          <div class="prof-upload-hint">JPG / JPEG · max 30 KB · 1 file</div>
          <button class="change-file-btn" onclick="document.getElementById('profileFileInput').click()">🔄 Change Photo</button>
        </div>
      </div>
      <div class="prof-pin-row">
        <input type="password" id="upAdminPin" class="pin-input-sm" placeholder="Admin PIN" maxlength="6" inputmode="numeric" autocomplete="off">
        <span class="pin-or">or</span>
        <input type="password" id="upIpPin" class="pin-input-sm" placeholder="IP PIN" maxlength="6" inputmode="numeric" autocomplete="off">
      </div>
      <div class="prof-pin-hint">Enter Admin PIN  —or—  your own IP PIN to confirm upload</div>
      <div class="prof-prog-wrap" id="profProgWrap" style="display:none">
        <div class="prof-prog-bar" id="profProgBar"></div>
      </div>
      <button class="upload-now-btn" id="profUploadBtn" onclick="doProfileUpload('${row._docId}')">⬆ Upload Photo</button>
      <div class="prof-upload-status" id="profUploadStatus"></div>
    </div>

    <!-- FIELDS -->
    <div class="profile-fields">${fields.map(f=>`<div class="pf-item"><span class="pf-label">${f.l}</span><span class="pf-val">${f.v}</span></div>`).join("")}</div>

    <!-- VIEW DETAILS LOGIN (below fields — separate from upload) -->
    ${loginSection}
  `;
}

/* File picked from profile photo square */
window.profileFilePicked=function(input){
  const statusEl=document.getElementById("profUploadStatus");
  if(statusEl) statusEl.textContent="";

  const file=input.files[0];
  if(!file) return;

  /* validate type */
  const ext=file.name.toLowerCase();
  if(!ext.endsWith(".jpg")&&!ext.endsWith(".jpeg")){
    alert("❌ Only JPG / JPEG files allowed.");
    input.value=""; pickedFile=null; return;
  }
  /* validate size — max 30 KB */
  if(file.size>30720){
    alert(`❌ File is ${(file.size/1024).toFixed(1)} KB — must be under 30 KB. Please reduce size.`);
    input.value=""; pickedFile=null; return;
  }

  pickedFile=file;

  /* show preview in panel */
  const reader=new FileReader();
  reader.onload=e=>{
    const panel=document.getElementById("profUploadPanel");
    const preview=document.getElementById("profUploadPreview");
    const fname=document.getElementById("profFileName");
    if(panel&&preview){
      preview.src=e.target.result;
      if(fname) fname.textContent=file.name;
      panel.style.display="block";
      panel.scrollIntoView({behavior:"smooth",block:"nearest"});
    }
  };
  reader.readAsDataURL(file);
};

window.doProfileUpload=async function(docId){
  const statusEl =document.getElementById("profUploadStatus");
  const progWrap =document.getElementById("profProgWrap");
  const progBar  =document.getElementById("profProgBar");
  const btn      =document.getElementById("profUploadBtn");

  statusEl.textContent=""; statusEl.className="prof-upload-status";

  if(!pickedFile){
    statusEl.textContent="❌ Please choose a photo first.";
    statusEl.className="prof-upload-status err"; return;
  }

  /* validate PIN */
  const adminPin=(document.getElementById("upAdminPin").value||"").trim();
  const ipPin   =(document.getElementById("upIpPin").value||"").trim();
  const row=allData.find(r=>r._docId===docId);
  if(!row){statusEl.textContent="❌ Record not found.";statusEl.className="prof-upload-status err";return;}

  const adminOk=adminPin===ADMIN_PIN;
  const ipOk   =ipPin!==""&&ipPin===(row.ipPin||"").trim();

  if(!adminOk&&!ipOk){
    statusEl.textContent="❌ Wrong PIN. Enter Admin PIN or your own IP PIN.";
    statusEl.className="prof-upload-status err"; return;
  }

  /* ── UI: start progress ── */
  btn.disabled=true;
  progWrap.style.display="block";
  progBar.style.width="0%";
  statusEl.textContent="⏳ Uploading… 0%";
  statusEl.className="prof-upload-status info";

  /* Min display time: 5–10 s so it feels deliberate */
  const totalDuration=5000+Math.random()*5000;
  const startTime=Date.now();

  /* Smooth ticker — runs independently, caps at 88% until done */
  let uploadDone=false;
  const tickInterval=setInterval(()=>{
    const elapsed=Date.now()-startTime;
    const cap=uploadDone?100:88;
    const pct=Math.min(Math.round(elapsed/totalDuration*100),cap);
    progBar.style.width=pct+"%";
    statusEl.textContent=`⏳ Uploading… ${pct}%`;
  },150);

  try{
    /* Read file as base64 data URL — stored directly in Firestore.
       No Firebase Storage needed, no CORS, no rules, always works. */
    const base64url=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=e=>resolve(e.target.result);
      reader.onerror=()=>reject(new Error("Failed to read file"));
      reader.readAsDataURL(pickedFile);
    });

    /* Simulate realistic upload progress over the minimum duration */
    await new Promise(r=>setTimeout(r,totalDuration));
    uploadDone=true;
    clearInterval(tickInterval);
    progBar.style.width="100%";
    statusEl.textContent="⏳ Saving… 100%";

    /* Save base64 string as pageURL in Firestore */
    await updateDoc(doc(db,DB_NAME,docId),{pageURL:base64url});

    /* Update in-memory cache */
    const idx=allData.findIndex(r=>r._docId===docId);
    if(idx>=0) allData[idx].pageURL=base64url;
    if(currentProfile&&currentProfile._docId===docId) currentProfile.pageURL=base64url;

    statusEl.textContent="✅ Photo uploaded successfully!";
    statusEl.className="prof-upload-status ok";
    pickedFile=null;

    /* Swap the photo square in the modal */
    const sq=document.querySelector(".prof-photo-square");
    if(sq){
      sq.innerHTML=`<img id="profPhotoImg" src="${base64url}" class="profile-photo-sq" alt="Photo" onclick="openLightbox('${base64url}')" title="Click to view"><div class="prof-photo-overlay">📷 Tap to Upload</div>`;
    }

    renderTable();
    showToast("✅ Photo uploaded!");

  }catch(err){
    clearInterval(tickInterval);
    progBar.style.width="0%";
    progWrap.style.display="none";
    statusEl.textContent="❌ Upload failed: "+(err.message||"Unknown error");
    statusEl.className="prof-upload-status err";
    console.error("Upload error:",err);
  }finally{
    btn.disabled=false;
  }
};

window.profileAdminLogin=function(){
  const pin=(document.getElementById("profAdminPin").value||"").trim();
  if(pin===ADMIN_PIN) renderProfile(currentProfile,true,false);
  else document.getElementById("profAdminErr").textContent="❌ Wrong Admin PIN.";
};
window.profileIpLogin=function(){
  const id=(document.getElementById("profIpId").value||"").trim();
  const pin=(document.getElementById("profIpPin").value||"").trim();
  const match=allData.find(r=>(r.ipId||"").trim()===id&&(r.ipPin||"").trim()===pin);
  if(match&&match._docId===currentProfile._docId) renderProfile(currentProfile,false,true);
  else document.getElementById("profIpErr").textContent="❌ Wrong IP ID or PIN.";
};

/* ════════════════════════
   LIGHTBOX
════════════════════════ */
window.openLightbox=function(url){
  document.getElementById("lightboxImg").src=url;
  document.getElementById("lightbox").classList.add("active");
};
window.closeLightbox=function(){
  document.getElementById("lightbox").classList.remove("active");
};

/* ════════════════════════
   ADMIN MODE
════════════════════════ */
window.toggleAdminMode=function(){
  if(!adminMode){
    document.getElementById("adminModePinModal").classList.add("active");
    document.getElementById("adminModePinInput").value="";
    document.getElementById("adminModePinErr").textContent="";
    setTimeout(()=>document.getElementById("adminModePinInput").focus(),80);
  } else {
    logoutAdmin();
  }
};
window.logoutAdmin=function(){
  adminMode=false; selectedIds.clear();
  document.getElementById("adminBtn").textContent="🔐 Admin";
  document.getElementById("adminBtn").classList.remove("active");
  document.getElementById("adminToolbar").classList.remove("on");
  document.getElementById("adminExtraBtns").classList.remove("on");
  document.getElementById("logoutBtn").classList.remove("on");
  document.body.classList.remove("admin-mode");
  updateSelUI(); renderTable();
};
window.confirmAdminMode=function(){
  const pin=document.getElementById("adminModePinInput").value.trim();
  if(pin===ADMIN_PIN){
    adminMode=true;
    document.getElementById("adminModePinModal").classList.remove("active");
    document.getElementById("adminBtn").textContent="🔓 Admin ON";
    document.getElementById("adminBtn").classList.add("active");
    document.getElementById("adminToolbar").classList.add("on");
    document.getElementById("adminExtraBtns").classList.add("on");
    document.getElementById("logoutBtn").classList.add("on");
    document.body.classList.add("admin-mode");
    renderTable();
  } else {
    document.getElementById("adminModePinErr").textContent="❌ Wrong Admin PIN.";
  }
};

/* ════════════════════════
   SELECT & DELETE
════════════════════════ */
window.toggleSelectPage=function(checked){
  const start=(currentPage-1)*PAGE_SIZE;
  filtered.slice(start,Math.min(start+PAGE_SIZE,filtered.length))
    .forEach(r=>{ if(checked) selectedIds.add(r._docId); else selectedIds.delete(r._docId); });
  updateSelUI(); renderTable();
};
window.toggleSelectAll=function(checked){
  selectedIds.clear();
  if(checked) allData.forEach(r=>selectedIds.add(r._docId));
  updateSelUI(); renderTable();
};
window.toggleSelect=function(docId,checked){
  if(checked) selectedIds.add(docId); else selectedIds.delete(docId);
  updateSelUI();
};
function updateSelUI(){
  const n=selectedIds.size;
  document.getElementById("selCount").textContent=`${n} selected`;
  const b=document.getElementById("deleteSelBtn");
  if(n>0) b.classList.add("on"); else b.classList.remove("on");
}
window.initiateDelete=function(){
  if(!selectedIds.size) return;
  document.getElementById("deleteCount").textContent=selectedIds.size;
  document.getElementById("confirmDeleteModal").classList.add("active");
};
window.confirmDelete=function(){
  document.getElementById("confirmDeleteModal").classList.remove("active");
  document.getElementById("deletePinModal").classList.add("active");
  document.getElementById("deletePinInput").value="";
  document.getElementById("deletePinErr").textContent="";
  setTimeout(()=>document.getElementById("deletePinInput").focus(),80);
};
window.executeDelete=async function(){
  const pin=document.getElementById("deletePinInput").value.trim();
  if(pin!==ADMIN_PIN){document.getElementById("deletePinErr").textContent="❌ Wrong Admin PIN.";return;}
  document.getElementById("deletePinModal").classList.remove("active");
  for(const id of [...selectedIds]){
    try{await deleteDoc(doc(db,DB_NAME,id));}catch(e){console.error(e);}
  }
  allData=allData.filter(r=>!selectedIds.has(r._docId));
  selectedIds.clear(); detectDups(); applyFilter(); updateSelUI();
  showToast("✅ Deleted successfully.");
};

/* ════════════════════════
   COPY
════════════════════════ */
window.copyPageData=function(){
  const start=(currentPage-1)*PAGE_SIZE;
  const lines=filtered.slice(start,Math.min(start+PAGE_SIZE,filtered.length))
    .map(r=>(r.ipId||r.fideId||"").trim()).filter(Boolean);
  clipWrite(lines.join("\n"),`✅ Copied ${lines.length} IDs (this page).`);
};
window.copyAllData=function(){
  const lines=filtered.map(r=>(r.ipId||r.fideId||"").trim()).filter(Boolean);
  clipWrite(lines.join("\n"),`✅ Copied ${lines.length} IDs (all filtered).`);
};
function clipWrite(text,toast){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>showToast(toast)).catch(()=>clipFb(text,toast));
  } else clipFb(text,toast);
}
function clipFb(text,toast){
  const ta=document.createElement("textarea");
  ta.value=text; ta.style.cssText="position:fixed;opacity:0;top:0;left:0;";
  document.body.appendChild(ta); ta.focus(); ta.select();
  try{document.execCommand("copy");showToast(toast);}
  catch(e){showToast("❌ Copy failed.");}
  document.body.removeChild(ta);
}

/* ════════════════════════
   DOWNLOAD JSON
════════════════════════ */
window.downloadJson=function(){
  const data=allData.map(r=>{
    const out={};
    ALL_FIELDS.forEach(k=>{out[k]=(r[k]!==undefined&&r[k]!==null)?r[k]:"";});
    Object.keys(r).filter(k=>k!=="_docId"&&!ALL_FIELDS.includes(k)).sort().forEach(k=>{out[k]=r[k];});
    const sorted={};
    Object.keys(out).sort().forEach(k=>{sorted[k]=out[k];});
    return sorted;
  });
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`IPdatabase_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast(`✅ Downloaded ${data.length} records.`);
};

window.closeModal=function(id){document.getElementById(id).classList.remove("active");};

/* ════════════════════════
   INIT
════════════════════════ */
function init(){
  setDatePill();
  loadData();
  ["fSearch","fBirthFrom","fBirthTo"].forEach(id=>{
    document.getElementById(id).addEventListener("input",()=>{currentPage=1;applyFilter();});
  });
  ["fGender","fDistrict","fStatus"].forEach(id=>{
    document.getElementById(id).addEventListener("change",()=>{currentPage=1;applyFilter();});
  });
  ["adminModePinInput","deletePinInput"].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener("input",function(){this.value=this.value.replace(/\D/g,"");});
    el.addEventListener("keydown",e=>{
      if(e.key==="Enter"){if(id==="adminModePinInput")window.confirmAdminMode();else window.executeDelete();}
    });
  });
  document.getElementById("dupAlert").onclick=()=>{
    activeFilters.dupEntry=true;
    document.getElementById("btnDupEntry").classList.add("active");
    currentPage=1; applyFilter();
    document.querySelector(".filter-bar").scrollIntoView({behavior:"smooth"});
  };
}

document.addEventListener("DOMContentLoaded",init);
