// organizer.js
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

let allOrganizers = [];
let isAdminLoggedIn = false;

// ── DATE ──────────────────────────────────────────────────
const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
const now=new Date();
document.getElementById("datePill").textContent=
  `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

// ── LOAD ──────────────────────────────────────────────────
async function loadOrganizers(){
  try{
    const snap=await getDocs(collection(db,"organizerdb"));
    allOrganizers=snap.docs.map(d=>({_docId:d.id,...d.data()}));
    // Sort alphabetically by organizerName
    allOrganizers.sort((a,b)=>(a.organizerName||"").localeCompare(b.organizerName||""));
    document.getElementById("loadingMsg").style.display="none";
    if(allOrganizers.length===0){
      document.getElementById("emptyMsg").style.display="block";
      document.getElementById("countBadge").textContent="0 Organizers";
      return;
    }
    renderTable(allOrganizers);
  }catch(err){
    document.getElementById("loadingMsg").textContent="Error: "+err.message;
  }
}

// ── RENDER ────────────────────────────────────────────────
function renderTable(data){
  const tbody=document.getElementById("orgTableBody");
  const table=document.getElementById("orgTable");
  tbody.innerHTML="";

  // Show/hide action column header
  document.getElementById("actionHeader").style.display = isAdminLoggedIn?"table-cell":"none";

  if(data.length===0){
    table.style.display="none";
    document.getElementById("emptyMsg").style.display="block";
    document.getElementById("countBadge").textContent="0 Organizers";
    return;
  }
  document.getElementById("emptyMsg").style.display="none";
  table.style.display="table";
  document.getElementById("countBadge").textContent=`${data.length} Organizer${data.length!==1?"s":""}`;

  const total=data.length;
  data.forEach((org,idx)=>{
    const srNo=total-idx; // descending Sr No
    const cp1=org.contactPerson1||{};
    const cp2=org.contactPerson2||{};
    const cp3=org.contactPerson3||{};
    const actionCell = isAdminLoggedIn
      ? `<td>
          <button class="edit-row-btn" onclick="adminEdit('${org._docId}','${org.organizerID||""}')">✏️ Edit</button>
          <button class="delete-row-btn" onclick="adminDelete('${org._docId}','${(org.organizerName||"").replace(/'/g,"\\'")}')">🗑</button>
        </td>`
      : "";
    const row=document.createElement("tr");
    row.innerHTML=`
      <td>${srNo}</td>
      <td>${org.organizerID||"—"}</td>
      <td>${org.organizerName||"—"}</td>
      <td>${org.district||"—"}</td>
      <td>${org.address||"—"}</td>
      <td>${cp1.name||"—"}</td>
      <td>${cp1.designation||"—"}</td>
      <td>${cp1.contact||"—"}</td>
      <td>${cp1.whatsapp||"—"}</td>
      <td>${cp1.email||"—"}</td>
      <td>${cp2.name||"—"}</td>
      <td>${cp2.designation||"—"}</td>
      <td>${cp2.contact||"—"}</td>
      <td>${cp3.name||"—"}</td>
      <td>${cp3.designation||"—"}</td>
      <td>${cp3.contact||"—"}</td>
      ${actionCell}
    `;
    tbody.appendChild(row);
  });
}

// ── SEARCH & FILTER ───────────────────────────────────────
function applyFilters(){
  const search=document.getElementById("searchInput").value.toLowerCase().trim();
  const district=document.getElementById("districtFilter").value;
  const filtered=allOrganizers.filter(org=>{
    return (!district||org.district===district)&&
           (!search||
             (org.organizerName||"").toLowerCase().includes(search)||
             (org.organizerID||"").toLowerCase().includes(search));
  });
  renderTable(filtered);
}
document.getElementById("searchInput").addEventListener("input",applyFilters);
document.getElementById("districtFilter").addEventListener("change",applyFilters);

// ── MODAL HELPERS ─────────────────────────────────────────
window.openAdminLogin=()=>{
  document.getElementById("adminPinInput").value="";
  document.getElementById("adminPinError").textContent="";
  document.getElementById("adminLoginModal").classList.add("active");
  setTimeout(()=>document.getElementById("adminPinInput").focus(),200);
};
window.openOrgLogin=()=>{
  document.getElementById("orgLoginID").value="";
  document.getElementById("orgLoginPin").value="";
  document.getElementById("orgPinError").textContent="";
  document.getElementById("orgLoginModal").classList.add("active");
  setTimeout(()=>document.getElementById("orgLoginID").focus(),200);
};
window.closeModal=id=>{
  document.getElementById(id).classList.remove("active");
};
["adminLoginModal","orgLoginModal"].forEach(id=>{
  document.getElementById(id).addEventListener("click",e=>{
    if(e.target.id===id) window.closeModal(id);
  });
});

// ── ADMIN PIN VERIFY ──────────────────────────────────────
window.verifyAdminPin=async()=>{
  const pin=document.getElementById("adminPinInput").value.trim();
  const errEl=document.getElementById("adminPinError");
  errEl.textContent="";
  if(!pin){ errEl.textContent="Please enter PIN."; return; }
  if(!/^\d{6}$/.test(pin)){ errEl.textContent="PIN must be 6 digits."; return; }
  if(pin===ADMIN_PIN){
    isAdminLoggedIn=true;
    window.closeModal("adminLoginModal");
    document.querySelector(".admin-login-btn").textContent="🛡 Admin ✓";
    document.querySelector(".admin-login-btn").style.background="rgba(255,255,255,0.35)";
    renderTable(allOrganizers);
  } else {
    errEl.textContent="Wrong Admin PIN. Please try again.";
    document.getElementById("adminPinInput").value="";
    document.getElementById("adminPinInput").focus();
  }
};

// ── ORGANIZER LOGIN VERIFY ────────────────────────────────
window.verifyOrgLogin=async()=>{
  const orgID=document.getElementById("orgLoginID").value.trim();
  const pin=document.getElementById("orgLoginPin").value.trim();
  const errEl=document.getElementById("orgPinError");
  errEl.textContent="";

  if(!orgID){ errEl.textContent="Please enter Organizer ID."; return; }
  if(!pin)  { errEl.textContent="Please enter your PIN."; return; }
  if(!/^\d{6}$/.test(pin)){ errEl.textContent="PIN must be 6 digits."; return; }

  try{
    // Search by organizerID field
    const q=query(collection(db,"organizerdb"),where("organizerID","==",orgID));
    const snap=await getDocs(q);
    if(snap.empty){ errEl.textContent="Organizer ID not found."; return; }
    const orgDoc=snap.docs[0];
    const storedPin=orgDoc.data().pin||"";
    if(storedPin!==pin){ errEl.textContent="Wrong PIN. Please try again."; return; }
    // Success
    window.closeModal("orgLoginModal");
    window.location.href=`organizerform.html?editDocId=${orgDoc.id}&source=organizer&orgID=${orgID}`;
  }catch(err){
    errEl.textContent="Error: "+err.message;
  }
};

// ── ADMIN EDIT ────────────────────────────────────────────
window.adminEdit=(docId,orgID)=>{
  window.location.href=`organizerform.html?editDocId=${docId}&source=admin&orgID=${orgID}`;
};

// ── ADMIN DELETE ──────────────────────────────────────────
window.adminDelete=async(docId,name)=>{
  if(!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try{
    await deleteDoc(doc(db,"organizerdb",docId));
    allOrganizers=allOrganizers.filter(o=>o._docId!==docId);
    renderTable(allOrganizers);
    alert("✅ Organizer deleted.");
  }catch(err){ alert("Error: "+err.message); }
};

// ── ENTER KEY SUPPORT ─────────────────────────────────────
document.getElementById("adminPinInput").addEventListener("keydown",e=>{ if(e.key==="Enter") window.verifyAdminPin(); });
document.getElementById("orgLoginPin").addEventListener("keydown",e=>{ if(e.key==="Enter") window.verifyOrgLogin(); });
document.getElementById("orgLoginID").addEventListener("keydown",e=>{ if(e.key==="Enter") document.getElementById("orgLoginPin").focus(); });

// ── DIGITS ONLY FOR PIN INPUTS ────────────────────────────
document.getElementById("adminPinInput").addEventListener("input",function(){ this.value=this.value.replace(/\D/g,""); });
document.getElementById("orgLoginPin").addEventListener("input",function(){ this.value=this.value.replace(/\D/g,""); });

loadOrganizers();
