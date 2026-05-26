// organizerform.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc,
  getDocs, doc, query, where
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

// ── STATE ─────────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const editDocId   = urlParams.get("editDocId")  || "";
const editSource  = urlParams.get("source")     || ""; // "admin" | "organizer" | ""
const editOrgID   = urlParams.get("orgID")      || "";
let existingPin   = "";
let isEditMode    = !!editDocId;

// ── HELPERS ───────────────────────────────────────────────
const $  = id => document.getElementById(id);
const gv = id => $(id)?.value.trim() || "";
const sv = (id,v) => { if($(id)) $(id).value = v||""; };
function isPhone(v){ return /^\d{10}$/.test(v); }
function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function isPin(v)  { return /^\d{6}$/.test(v); }
function showErr(id,msg){
  const e=$("err-"+id); if(e) e.textContent=msg;
  const i=$(id); if(i) i.classList.add("error");
}
function clearErrors(){
  document.querySelectorAll(".field-error").forEach(e=>e.textContent="");
  document.querySelectorAll(".field-input").forEach(e=>e.classList.remove("error"));
}

// ── COLLAPSIBLE CP2 / CP3 ─────────────────────────────────
function setupToggle(btnId, bodyId, titleId){
  const btn=$(btnId), body=$(bodyId), title=$(titleId);
  if(!btn||!body||!title) return;
  btn.addEventListener("click",()=>{
    const open = body.style.display==="block";
    body.style.display = open?"none":"block";
    btn.textContent = open?"＋":"✕";
    btn.classList.toggle("active",!open);
    title.classList.toggle("open",!open);
  });
}
setupToggle("cp2PlusBtn","cp2Body","cp2Toggle");
setupToggle("cp3PlusBtn","cp3Body","cp3Toggle");

// ── SHOW CORRECT PIN BLOCK ────────────────────────────────
function showPinBlock(blockId){
  ["pinBlock-newAdmin","pinBlock-newOrg","pinBlock-editAdmin","pinBlock-editOrg"]
    .forEach(id=>{ if($(id)) $(id).style.display="none"; });
  if($(blockId)) $(blockId).style.display="block";
}

// ── ENTRY TYPE SWITCH (new form only) ─────────────────────
document.querySelectorAll('input[name="enteredBy"]').forEach(r=>{
  r.addEventListener("change",()=>{
    if(!isEditMode){
      showPinBlock(r.value==="Admin"?"pinBlock-newAdmin":"pinBlock-newOrg");
    }
  });
});

// ── INIT ──────────────────────────────────────────────────
async function init(){
  if(!isEditMode){
    // New form — nothing pre-filled, wait for radio click
    return;
  }

  // Edit mode
  document.getElementById("formSubtitle").textContent = "Edit Organizer Details";
  $("submitBtn").querySelector(".btn-text").textContent = "Update Details";
  $("entryTypeSection").style.display = "none"; // hide entry type

  // Load existing data
  const snap = await getDocs(collection(db,"organizerdb"));
  const found = snap.docs.find(d=>d.id===editDocId);
  if(found){
    existingPin = found.data().pin || "";
    fillForm(found.data());
  }

  // Set up PIN block based on who is editing
  if(editSource==="admin"){
    // Pre-select Admin radio (hidden) so enteredBy = Admin
    const adminR = document.querySelector('input[name="enteredBy"][value="Admin"]');
    if(adminR) adminR.checked = true;
    showPinBlock("pinBlock-editAdmin");
  } else {
    // Organizer edit
    const orgR = document.querySelector('input[name="enteredBy"][value="Organizer"]');
    if(orgR) orgR.checked = true;
    showPinBlock("pinBlock-editOrg");
  }
}
init();

// ── FILL FORM ─────────────────────────────────────────────
function fillForm(d){
  sv("organizerName",d.organizerName); sv("district",d.district); sv("address",d.address);
  const cp1=d.contactPerson1||{};
  sv("cp1Name",cp1.name); sv("cp1Designation",cp1.designation);
  sv("cp1Contact",cp1.contact); sv("cp1Whatsapp",cp1.whatsapp); sv("cp1Email",cp1.email);
  const cp2=d.contactPerson2||{};
  if(cp2.name){
    $("cp2Body").style.display="block";
    $("cp2PlusBtn").textContent="✕"; $("cp2PlusBtn").classList.add("active");
    $("cp2Toggle").classList.add("open");
    sv("cp2Name",cp2.name); sv("cp2Designation",cp2.designation);
    sv("cp2Contact",cp2.contact); sv("cp2Whatsapp",cp2.whatsapp); sv("cp2Email",cp2.email);
  }
  const cp3=d.contactPerson3||{};
  if(cp3.name){
    $("cp3Body").style.display="block";
    $("cp3PlusBtn").textContent="✕"; $("cp3PlusBtn").classList.add("active");
    $("cp3Toggle").classList.add("open");
    sv("cp3Name",cp3.name); sv("cp3Designation",cp3.designation);
    sv("cp3Contact",cp3.contact); sv("cp3Whatsapp",cp3.whatsapp); sv("cp3Email",cp3.email);
  }
}

// ── GENERATE ORGANIZER ID ─────────────────────────────────
// Format: OGDDMMYYYY/serial
async function generateOrganizerID(){
  const n=new Date();
  const dd=String(n.getDate()).padStart(2,"0");
  const mm=String(n.getMonth()+1).padStart(2,"0");
  const yyyy=n.getFullYear();
  const prefix=`${dd}${mm}${yyyy}`;
  const q1=query(collection(db,"organizeradmindb"),where("orgIdPrefix","==",prefix));
  const q2=query(collection(db,"organizerdb"),where("orgIdPrefix","==",prefix));
  const [s1,s2]=await Promise.all([getDocs(q1),getDocs(q2)]);
  return `OG${prefix}/${s1.size+s2.size+1}`;
}

// ── VALIDATION ────────────────────────────────────────────
function validate(){
  let ok=true; clearErrors();

  // Entry type only on new form
  if(!isEditMode){
    if(!document.querySelector('input[name="enteredBy"]:checked')){
      $("err-enteredBy").textContent="Please select entry type."; ok=false;
    }
  }

  if(!gv("organizerName")){ showErr("organizerName","Organizer name required."); ok=false; }
  if(!gv("district"))     { showErr("district","Please select district.");       ok=false; }
  if(!gv("cp1Name"))      { showErr("cp1Name","Name required.");                 ok=false; }
  if(!gv("cp1Designation")){ showErr("cp1Designation","Designation required."); ok=false; }
  if(!gv("cp1Contact"))    { showErr("cp1Contact","Contact number required.");  ok=false; }
  else if(!isPhone(gv("cp1Contact"))){ showErr("cp1Contact","Enter valid 10-digit number."); ok=false; }
  if(!gv("cp1Whatsapp"))   { showErr("cp1Whatsapp","WhatsApp number required."); ok=false; }
  else if(!isPhone(gv("cp1Whatsapp"))){ showErr("cp1Whatsapp","Enter valid 10-digit number."); ok=false; }
  if(gv("cp2Contact")&&!isPhone(gv("cp2Contact"))){ showErr("cp2Contact","Enter valid 10-digit number."); ok=false; }
  if(gv("cp2Whatsapp")&&!isPhone(gv("cp2Whatsapp"))){ showErr("cp2Whatsapp","Enter valid 10-digit number."); ok=false; }
  if(gv("cp3Contact")&&!isPhone(gv("cp3Contact"))){ showErr("cp3Contact","Enter valid 10-digit number."); ok=false; }
  if(gv("cp3Whatsapp")&&!isPhone(gv("cp3Whatsapp"))){ showErr("cp3Whatsapp","Enter valid 10-digit number."); ok=false; }

  // PIN validation per block
  const isAdmin = document.querySelector('input[name="enteredBy"]:checked')?.value==="Admin";

  if(!isEditMode){
    if(isAdmin){
      if(!gv("newAdminPin"))         { showErr("newAdminPin","Admin PIN required."); ok=false; }
      if(!gv("newOrgPin"))           { showErr("newOrgPin","Create organizer PIN."); ok=false; }
      else if(!isPin(gv("newOrgPin"))){ showErr("newOrgPin","PIN must be 6 digits."); ok=false; }
      if(!gv("newOrgPinConfirm"))    { showErr("newOrgPinConfirm","Confirm PIN."); ok=false; }
      else if(gv("newOrgPin")!==gv("newOrgPinConfirm")){ showErr("newOrgPinConfirm","PINs do not match."); ok=false; }
    } else {
      if(!gv("orgPin"))              { showErr("orgPin","Create PIN."); ok=false; }
      else if(!isPin(gv("orgPin")))  { showErr("orgPin","PIN must be 6 digits."); ok=false; }
      if(!gv("orgPinConfirm"))       { showErr("orgPinConfirm","Confirm PIN."); ok=false; }
      else if(gv("orgPin")!==gv("orgPinConfirm")){ showErr("orgPinConfirm","PINs do not match."); ok=false; }
    }
  } else {
    if(editSource==="admin"){
      if(!gv("editAdminPin"))        { showErr("editAdminPin","Admin PIN required."); ok=false; }
      if(gv("editAdminNewOrgPin") && !isPin(gv("editAdminNewOrgPin")))
                                     { showErr("editAdminNewOrgPin","PIN must be 6 digits."); ok=false; }
      if(gv("editAdminNewOrgPin") && gv("editAdminNewOrgPin")!==gv("editAdminNewOrgPinConfirm"))
                                     { showErr("editAdminNewOrgPinConfirm","PINs do not match."); ok=false; }
    } else {
      if(!gv("editOrgCurrentPin"))   { showErr("editOrgCurrentPin","Current PIN required."); ok=false; }
      if(gv("editOrgNewPin") && !isPin(gv("editOrgNewPin")))
                                     { showErr("editOrgNewPin","PIN must be 6 digits."); ok=false; }
      if(gv("editOrgNewPin") && gv("editOrgNewPin")!==gv("editOrgNewPinConfirm"))
                                     { showErr("editOrgNewPinConfirm","PINs do not match."); ok=false; }
    }
  }
  return ok;
}

// ── SUBMIT ────────────────────────────────────────────────
$("organizerForm").addEventListener("submit", async e=>{
  e.preventDefault();
  if(!validate()) return;

  const btn=$("submitBtn");
  btn.disabled=true;
  btn.querySelector(".btn-text").textContent="Verifying...";

  try {
    const isAdmin = document.querySelector('input[name="enteredBy"]:checked')?.value==="Admin";
    const n=new Date();
    const dd=String(n.getDate()).padStart(2,"0");
    const mm=String(n.getMonth()+1).padStart(2,"0");
    const yyyy=n.getFullYear();
    const prefix=`${dd}${mm}${yyyy}`;
    const entryDate=`${dd}/${mm}/${yyyy}`;
    const entryTime=n.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    const enteredBy = isEditMode
      ? (editSource==="admin"?"Admin":"Organizer")
      : (isAdmin?"Admin":"Organizer");

    // ── PIN VERIFICATION ──────────────────────────────────
    let finalPin = existingPin;

    if(!isEditMode){
      if(isAdmin){
        // Verify admin PIN
        if(gv("newAdminPin")!==ADMIN_PIN){
          showErr("newAdminPin","Wrong Admin PIN. Please try again.");
          btn.disabled=false; btn.querySelector(".btn-text").textContent="Submit Registration";
          return;
        }
        finalPin = gv("newOrgPin");
      } else {
        finalPin = gv("orgPin");
      }
    } else {
      if(editSource==="admin"){
        if(gv("editAdminPin")!==ADMIN_PIN){
          showErr("editAdminPin","Wrong Admin PIN. Please try again.");
          btn.disabled=false; btn.querySelector(".btn-text").textContent="Update Details";
          return;
        }
        if(gv("editAdminNewOrgPin")) finalPin = gv("editAdminNewOrgPin");
      } else {
        // Organizer edit — verify current PIN
        if(gv("editOrgCurrentPin")!==existingPin){
          showErr("editOrgCurrentPin","Wrong PIN. Please try again.");
          btn.disabled=false; btn.querySelector(".btn-text").textContent="Update Details";
          return;
        }
        if(gv("editOrgNewPin")) finalPin = gv("editOrgNewPin");
      }
    }

    btn.querySelector(".btn-text").textContent="Saving...";

    // ── BUILD DATA ────────────────────────────────────────
    const buildOrgData = async ()=>({
      organizerID: isEditMode ? editOrgID : await generateOrganizerID(),
      orgIdPrefix: prefix,
      enteredBy, entryDate, entryTime,
      pin: finalPin,
      organizerName: gv("organizerName"),
      district:      gv("district"),
      address:       gv("address"),
      contactPerson1:{ name:gv("cp1Name"), designation:gv("cp1Designation"), contact:gv("cp1Contact"), whatsapp:gv("cp1Whatsapp"), email:gv("cp1Email") },
      contactPerson2:{ name:gv("cp2Name"), designation:gv("cp2Designation"), contact:gv("cp2Contact"), whatsapp:gv("cp2Whatsapp"), email:gv("cp2Email") },
      contactPerson3:{ name:gv("cp3Name"), designation:gv("cp3Designation"), contact:gv("cp3Contact"), whatsapp:gv("cp3Whatsapp"), email:gv("cp3Email") },
      status:"approved",
    });

    // ── SAVE ──────────────────────────────────────────────
    let orgID="";

    if(!isEditMode){
      const data = await buildOrgData();
      orgID = data.organizerID;
      if(isAdmin){
        // Admin: directly to organizerdb
        await addDoc(collection(db,"organizerdb"), data);
        $("overlayTitle").textContent="Organizer Registered!";
        $("overlayNote").textContent="Entry saved directly to Organizer List.";
      } else {
        // Organizer: goes to organizeradmindb for review
        data.status="pending";
        await addDoc(collection(db,"organizeradmindb"), data);
        $("overlayTitle").textContent="Registration Submitted!";
        $("overlayNote").textContent="Your registration is under review. You will be notified once approved.";
      }
    } else {
      const data = await buildOrgData();
      orgID = data.organizerID;
      if(editSource==="admin"){
        // Admin edit: delete old, save new directly to organizerdb
        await deleteDoc(doc(db,"organizerdb",editDocId));
        await addDoc(collection(db,"organizerdb"), data);
        $("overlayTitle").textContent="Details Updated!";
        $("overlayNote").textContent="Organizer details updated directly.";
      } else {
        // Organizer edit: send to organizeradmindb for review
        data.status="pending";
        data.isEdit=true;
        await addDoc(collection(db,"organizeradmindb"), data);
        $("overlayTitle").textContent="Update Submitted!";
        $("overlayNote").textContent="Your changes are under review. Updates appear after approval.";
      }
    }

    $("displayOrgID").textContent = orgID;
    $("successOverlay").classList.add("active");

  } catch(err){
    alert("Error: "+err.message); console.error(err);
  } finally {
    btn.disabled=false;
    btn.querySelector(".btn-text").textContent = isEditMode?"Update Details":"Submit Registration";
  }
});

// ── DIGITS ONLY ───────────────────────────────────────────
document.querySelectorAll('input[type="tel"]').forEach(i=>{
  i.addEventListener("input",()=>{ i.value=i.value.replace(/\D/g,""); });
});
document.querySelectorAll(".pin-input").forEach(i=>{
  i.addEventListener("input",()=>{ i.value=i.value.replace(/\D/g,""); });
});
