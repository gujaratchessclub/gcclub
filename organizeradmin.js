// organizeradmin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc,
  doc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXrHcMJzQn3cxutg41LZs9oYwEfALe00s",
  authDomain: "ratedeventsgj.firebaseapp.com",
  projectId: "ratedeventsgj",
  storageBucket: "ratedeventsgj.firebasestorage.app",
  messagingSenderId: "527826897689",
  appId: "1:527826897689:web:fb0439fff04a695a599388"
};
const app=initializeApp(firebaseConfig);
const db=getFirestore(app);
const ADMIN_PASSWORD="270620";

let currentTab="pending";
let allRecords={pending:[],approved:[]};
let currentDocId=null;

// ── GATE ──────────────────────────────────────────────────
document.getElementById("gateBtn").addEventListener("click",checkPassword);
document.getElementById("adminPassword").addEventListener("keydown",e=>{ if(e.key==="Enter") checkPassword(); });

function checkPassword(){
  const val=document.getElementById("adminPassword").value;
  if(val===ADMIN_PASSWORD){
    document.getElementById("passwordGate").style.display="none";
    document.getElementById("adminPanel").style.display="block";
    loadRecords();
  }else{
    document.getElementById("gateError").textContent="Incorrect password.";
    document.getElementById("adminPassword").value="";
  }
}
function logout(){
  document.getElementById("adminPanel").style.display="none";
  document.getElementById("passwordGate").style.display="flex";
  document.getElementById("adminPassword").value="";
  document.getElementById("gateError").textContent="";
}
window.logout=logout;

// ── TABS ──────────────────────────────────────────────────
function switchTab(tab){
  currentTab=tab;
  document.getElementById("tab-pending").classList.toggle("active",tab==="pending");
  document.getElementById("tab-approved").classList.toggle("active",tab==="approved");
  renderRecords();
}
window.switchTab=switchTab;

// ── LOAD ──────────────────────────────────────────────────
async function loadRecords(){
  document.getElementById("loadingMsg").style.display="block";
  document.getElementById("recordsList").innerHTML="";
  try{
    const pendingSnap=await getDocs(collection(db,"organizeradmindb"));
    const pending=pendingSnap.docs.map(d=>({_id:d.id,_col:"organizeradmindb",...d.data()}));

    const approvedSnap=await getDocs(collection(db,"organizerdb"));
    let approved=approvedSnap.docs.map(d=>({_id:d.id,_col:"organizerdb",...d.data()}));
    // Sort approved: descending by organizerID
    approved.sort((a,b)=>(b.organizerID||"").localeCompare(a.organizerID||""));

    allRecords={pending,approved};
    document.getElementById("pendingCount").textContent=`⏳ ${pending.length} Pending`;
    document.getElementById("loadingMsg").style.display="none";
    renderRecords();
  }catch(err){
    document.getElementById("loadingMsg").textContent="Error: "+err.message;
  }
}

// ── RENDER ────────────────────────────────────────────────
function renderRecords(){
  const list=document.getElementById("recordsList");
  list.innerHTML="";
  const records=currentTab==="pending"?allRecords.pending:allRecords.approved;
  if(!records||records.length===0){
    document.getElementById("emptyMsg").style.display="block"; return;
  }
  document.getElementById("emptyMsg").style.display="none";
  records.forEach(rec=>{
    const editTag=rec.isEdit?'<span style="background:#FFF3E0;color:#E65100;font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;margin-left:6px;">EDIT</span>':"";
    const card=document.createElement("div");
    card.className="record-card";
    card.innerHTML=`
      <div class="record-info">
        <div class="record-id">${rec.organizerID||"—"}${editTag}</div>
        <div class="record-name">${rec.organizerName||"Unknown"}</div>
        <div class="record-meta">📍 ${rec.district||"—"} &nbsp;|&nbsp; 👤 ${rec.contactPerson1?.name||"—"}</div>
      </div>
      <div class="record-status">
        <span class="status-pill ${currentTab}">${currentTab==="pending"?"Pending":"Approved"}</span>
        <button class="view-btn" onclick="openModal('${rec._id}','${rec._col}')">View Details</button>
      </div>`;
    list.appendChild(card);
  });
}

// ── MODAL ─────────────────────────────────────────────────
window.openModal=function(docId,colName){
  currentDocId=docId;
  const list=colName==="organizeradmindb"?allRecords.pending:allRecords.approved;
  const d=list.find(r=>r._id===docId);
  if(!d) return;

  function contactBlock(label,cp){
    if(!cp||!cp.name) return "";
    return `<div class="contact-block">
      <div class="contact-block-title">${label}</div>
      <div class="info-grid">
        <div><div class="info-label">Name</div><div class="info-value">${cp.name||"—"}</div></div>
        <div><div class="info-label">Designation</div><div class="info-value">${cp.designation||"—"}</div></div>
        <div><div class="info-label">Contact</div><div class="info-value">${cp.contact||"—"}</div></div>
        <div><div class="info-label">WhatsApp</div><div class="info-value">${cp.whatsapp||"—"}</div></div>
        ${cp.email?`<div><div class="info-label">Email</div><div class="info-value">${cp.email}</div></div>`:""}
      </div></div>`;
  }

  document.getElementById("modalContent").innerHTML=`
    <div class="modal-org-id">${d.organizerID||"—"}${d.isEdit?'<span style="background:#FFF3E0;color:#E65100;font-size:11px;padding:2px 8px;border-radius:8px;margin-left:6px;">EDIT</span>':""}</div>
    <div class="modal-org-name">${d.organizerName||"—"}</div>
    <div class="modal-district">📍 ${d.district||"—"}</div>
    ${d.address?`<div style="margin-bottom:14px"><div class="info-label">Address</div><div class="info-value">${d.address}</div></div>`:""}
    <hr class="modal-divider"/>
    ${contactBlock("Contact Person 1",d.contactPerson1)}
    ${contactBlock("Contact Person 2",d.contactPerson2)}
    ${contactBlock("Contact Person 3",d.contactPerson3)}
    <hr class="modal-divider"/>
    <div style="background:#FFF8E1;border-radius:8px;padding:10px 12px;border:1px solid #FFE082;font-size:12px;color:#5D4037;">
      <strong>🔒 Admin Only</strong> &nbsp;|&nbsp; By: ${d.enteredBy||"—"} &nbsp;|&nbsp; Date: ${d.entryDate||"—"} &nbsp;|&nbsp; Time: ${d.entryTime||"—"} &nbsp;|&nbsp; PIN: ●●●●●●
    </div>`;

  const actions=document.getElementById("modalActions");
  if(colName==="organizeradmindb"){
    actions.innerHTML=`
      <button class="action-btn btn-close-modal" onclick="closeModal()">Close</button>
      <button class="action-btn btn-reject" onclick="rejectRecord('${docId}')">✕ Reject</button>
      <button class="action-btn btn-approve" onclick="approveRecord('${docId}')">✓ Approve</button>`;
  }else{
    actions.innerHTML=`<button class="action-btn btn-close-modal" onclick="closeModal()">Close</button>`;
  }
  document.getElementById("modalOverlay").classList.add("active");
};

window.closeModal=()=>{
  document.getElementById("modalOverlay").classList.remove("active");
  currentDocId=null;
};

// ── APPROVE ───────────────────────────────────────────────
window.approveRecord=async function(docId){
  if(!confirm("Approve this organizer?")) return;
  try{
    const rec=allRecords.pending.find(r=>r._id===docId);
    if(!rec) return;
    const {_id,_col,isEdit,...cleanData}=rec;
    cleanData.status="approved";
    if(isEdit){
      const q=query(collection(db,"organizerdb"),where("organizerID","==",rec.organizerID));
      const snap=await getDocs(q);
      if(!snap.empty) await deleteDoc(doc(db,"organizerdb",snap.docs[0].id));
    }
    await addDoc(collection(db,"organizerdb"),cleanData);
    await deleteDoc(doc(db,"organizeradmindb",docId));
    alert(`✅ "${rec.organizerName}" approved!`);
    closeModal(); await loadRecords();
  }catch(err){ alert("Error: "+err.message); }
};

// ── REJECT ────────────────────────────────────────────────
window.rejectRecord=async function(docId){
  const rec=allRecords.pending.find(r=>r._id===docId);
  if(!confirm(`Reject and delete "${rec?.organizerName}"?`)) return;
  try{
    await deleteDoc(doc(db,"organizeradmindb",docId));
    alert("❌ Rejected and deleted.");
    closeModal(); await loadRecords();
  }catch(err){ alert("Error: "+err.message); }
};

document.getElementById("modalOverlay").addEventListener("click",e=>{
  if(e.target.id==="modalOverlay") closeModal();
});
