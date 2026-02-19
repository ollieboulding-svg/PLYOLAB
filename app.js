// Plyo Lab v2 (single-page app) — baseline/retest/history/chart/pdf/how-to-test

const STORAGE_KEY = "plyolab_assessments_v2";
let chartInstance = null;

// ----- Age groups 12–30 in 2-year bands (plus 12–13) -----
const AGE_GROUPS = [
  "12-13","14-15","16-17","18-19","20-21","22-23","24-25","26-27","28-29","30"
];

// ----- DATA (practical field standards) -----
// NOTE: These are starter benchmark tables. You can refine with your own dataset later.
// Each entry: { red, amber, green } thresholds.
// For sprint/run: lower is better. For jumps/pushups: higher is better.
const STANDARDS = {
  female: {
    "12-13": { sprint20:[4.0, 3.6, 3.3], vert:[20, 26, 32], broad:[140, 165, 185], pushups:[8, 15, 25], run1k:[6.3, 5.2, 4.4] },
    "14-15": { sprint20:[3.8, 3.5, 3.2], vert:[22, 28, 34], broad:[150, 175, 195], pushups:[10, 18, 28], run1k:[6.1, 5.0, 4.3] },
    "16-17": { sprint20:[3.7, 3.4, 3.15], vert:[24, 30, 36], broad:[155, 180, 205], pushups:[12, 20, 32], run1k:[6.0, 4.9, 4.2] },
    "18-19": { sprint20:[3.65,3.35,3.1], vert:[24, 31, 37], broad:[155, 185, 210], pushups:[12, 22, 34], run1k:[5.9, 4.85, 4.15] },
    "20-21": { sprint20:[3.65,3.35,3.1], vert:[24, 31, 37], broad:[155, 185, 210], pushups:[12, 22, 34], run1k:[5.9, 4.85, 4.15] },
    "22-23": { sprint20:[3.7, 3.4, 3.15], vert:[23, 30, 36], broad:[150, 180, 205], pushups:[10, 20, 32], run1k:[6.0, 4.9, 4.2] },
    "24-25": { sprint20:[3.75,3.45,3.2], vert:[22, 29, 35], broad:[145, 175, 200], pushups:[10, 18, 30], run1k:[6.1, 5.0, 4.3] },
    "26-27": { sprint20:[3.8, 3.5, 3.25], vert:[21, 28, 34], broad:[140, 170, 195], pushups:[8, 16, 28], run1k:[6.2, 5.1, 4.4] },
    "28-29": { sprint20:[3.85,3.55,3.3], vert:[20, 27, 33], broad:[138, 168, 192], pushups:[8, 15, 26], run1k:[6.3, 5.2, 4.5] },
    "30":    { sprint20:[3.9, 3.6, 3.35], vert:[19, 26, 32], broad:[135, 165, 190], pushups:[7, 14, 24], run1k:[6.4, 5.3, 4.6] }
  },
  male: {
    "12-13": { sprint20:[3.8, 3.4, 3.1], vert:[24, 32, 40], broad:[160, 190, 220], pushups:[10, 20, 35], run1k:[5.8, 4.9, 4.2] },
    "14-15": { sprint20:[3.6, 3.3, 3.0], vert:[26, 35, 44], broad:[170, 205, 235], pushups:[12, 25, 40], run1k:[5.6, 4.8, 4.1] },
    "16-17": { sprint20:[3.5, 3.2, 2.95], vert:[28, 38, 48], broad:[175, 215, 245], pushups:[15, 28, 45], run1k:[5.5, 4.7, 4.0] },
    "18-19": { sprint20:[3.45,3.15,2.9], vert:[29, 39, 50], broad:[180, 220, 250], pushups:[16, 30, 48], run1k:[5.4, 4.6, 3.95] },
    "20-21": { sprint20:[3.45,3.15,2.9], vert:[29, 39, 50], broad:[180, 220, 250], pushups:[16, 30, 48], run1k:[5.4, 4.6, 3.95] },
    "22-23": { sprint20:[3.5, 3.2, 2.95], vert:[28, 38, 48], broad:[175, 215, 245], pushups:[15, 28, 45], run1k:[5.5, 4.7, 4.05] },
    "24-25": { sprint20:[3.55,3.25,3.0], vert:[27, 37, 47], broad:[170, 210, 240], pushups:[14, 26, 42], run1k:[5.6, 4.8, 4.15] },
    "26-27": { sprint20:[3.6, 3.3, 3.05], vert:[26, 36, 46], broad:[165, 205, 235], pushups:[12, 24, 38], run1k:[5.7, 4.9, 4.25] },
    "28-29": { sprint20:[3.65,3.35,3.1], vert:[25, 34, 44], broad:[160, 200, 230], pushups:[12, 22, 36], run1k:[5.8, 5.0, 4.35] },
    "30":    { sprint20:[3.7, 3.4, 3.15], vert:[24, 33, 43], broad:[158, 198, 228], pushups:[10, 20, 34], run1k:[5.9, 5.1, 4.45] }
  }
};

// ----- Helpers -----
function $(id){ return document.getElementById(id); }

function parseRun1k(val){
  if(!val) return NaN;
  const s = String(val).trim();
  if(s.includes(":")){
    const [m,sec]=s.split(":");
    const mm=Number(m), ss=Number(sec);
    if(Number.isFinite(mm)&&Number.isFinite(ss)) return mm + (ss/60);
    return NaN;
  }
  // mm.ss format
  const parts = s.split(".");
  if(parts.length===1){
    const mm=Number(parts[0]);
    return Number.isFinite(mm) ? mm : NaN;
  }
  const mm=Number(parts[0]);
  const ss=Number(parts[1]);
  if(!Number.isFinite(mm) || !Number.isFinite(ss)) return NaN;
  return mm + (ss/60);
}

function formatRun1kMinutes(mins){
  if(!Number.isFinite(mins)) return "--";
  const totalSec = Math.round(mins*60);
  const m = Math.floor(totalSec/60);
  const s = String(totalSec%60).padStart(2,"0");
  return `${m}:${s}`;
}

function scoreHigherBetter(value, red, amber, green){
  if(value >= green) return 3;
  if(value >= amber) return 2;
  if(value >= red) return 1;
  return 1;
}
function scoreLowerBetter(value, red, amber, green){
  // thresholds are [red, amber, green] but for lower-better: green is lowest
  if(value <= green) return 3;
  if(value <= amber) return 2;
  if(value <= red) return 1;
  return 1;
}

function scoreToLabel(score){
  return score===3 ? "Green" : score===2 ? "Amber" : "Red";
}
function scoreToColor(score){
  return score===3 ? getCss("--green") : score===2 ? getCss("--amber") : getCss("--red");
}
function getCss(varName){
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function score100(scores){
  const pts = scores.map(s => (s-1)*50); // 1->0, 2->50, 3->100
  return Math.round(pts.reduce((a,b)=>a+b,0)/pts.length);
}
function levelLabel(score){
  if(score>=80) return "High Performance";
  if(score>=50) return "Age Standard";
  return "Developing";
}
function nowStr(){
  return new Date().toISOString();
}
function niceDate(iso){
  return new Date(iso).toLocaleString();
}

function loadAssessments(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    return raw?JSON.parse(raw):[];
  }catch{ return []; }
}
function saveAssessments(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ----- UI Setup -----
function initAgeGroups(){
  const sel=$("ageGroup");
  sel.innerHTML = AGE_GROUPS.map(a => `<option value="${a}">${a}</option>`).join("");
}

function showTab(tab){
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab===tab));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("show"));
  $("panel-"+tab).classList.add("show");
}

function dotHtml(score){
  const color=scoreToColor(score);
  const label=scoreToLabel(score);
  return `
    <span class="dot" style="background:${color}"></span>
    <span class="badge">${label}</span>
  `;
}

// ----- Core calculation -----
function computeFromInputs(){
  const gender=$("gender").value;
  const age=$("ageGroup").value;
  const sport=$("sport").value;
  const name=$("athleteName").value.trim() || "Athlete";

  const sprint20=Number($("sprint20").value);
  const vert=Number($("vert").value);
  const broad=Number($("broad").value);
  const pushups=Number($("pushups").value);
  const run1k=parseRun1k($("run1k").value);

  if(!Number.isFinite(sprint20) || !Number.isFinite(vert) || !Number.isFinite(broad) || !Number.isFinite(pushups) || !Number.isFinite(run1k)){
    throw new Error("Please fill in all test fields with valid numbers (1km as mm.ss or m:ss).");
  }

  const std = STANDARDS[gender][age];

  const sprintScore = scoreLowerBetter(sprint20, ...std.sprint20);
  const vertScore   = scoreHigherBetter(vert, ...std.vert);
  const broadScore  = scoreHigherBetter(broad, ...std.broad);
  const pushScore   = scoreHigherBetter(pushups, ...std.pushups);
  const runScore    = scoreLowerBetter(run1k, ...std.run1k);

  const scores=[sprintScore, vertScore, broadScore, pushScore, runScore];

  // age standard values = amber threshold
  const ageStandard = {
    sprint20: std.sprint20[1],
    vert: std.vert[1],
    broad: std.broad[1],
    pushups: std.pushups[1],
    run1k: std.run1k[1]
  };

  // rough percentile estimate from 1–3 score
  const pct = scores.map(s => s===3?75 : s===2?50 : 25);

  return {
    meta:{name,gender,age,sport},
    raw:{sprint20,vert,broad,pushups,run1k},
    ageStandard,
    scores,
    percentiles:pct,
    score100: score100(scores),
    level: levelLabel(score100(scores))
  };
}

// ----- Rendering -----
function renderTraffic(result){
  const items=[
    { key:"Sprint (20m)", score: result.scores[0] },
    { key:"Vertical Power", score: result.scores[1] },
    { key:"Broad Power", score: result.scores[2] },
    { key:"Strength (Push-ups)", score: result.scores[3] },
    { key:"Endurance (1km)", score: result.scores[4] }
  ];
  $("trafficList").innerHTML = items.map(it => `
    <div class="trafficItem">
      <div class="leftRow">
        <span class="dot" style="background:${scoreToColor(it.score)}"></span>
        <div><b>${it.key}</b></div>
      </div>
      <span class="badge">${scoreToLabel(it.score)}</span>
    </div>
  `).join("");
}

function buildComparisonTable(result){
  const tbody = $("compareTable").querySelector("tbody");
  const m = result.raw;
  const s = result.ageStandard;
  const p = result.percentiles;

  const rows=[
    ["20m Sprint", `${m.sprint20.toFixed(2)}s`, `${s.sprint20.toFixed(2)}s`, `${p[0]}th`],
    ["Vertical Jump", `${m.vert.toFixed(1)} cm`, `${s.vert.toFixed(1)} cm`, `${p[1]}th`],
    ["Broad Jump", `${m.broad.toFixed(1)} cm`, `${s.broad.toFixed(1)} cm`, `${p[2]}th`],
    ["Push-ups", `${m.pushups} reps`, `${s.pushups} reps`, `${p[3]}th`],
    ["1km Run", `${formatRun1kMinutes(m.run1k)}`, `${formatRun1kMinutes(s.run1k)}`, `${p[4]}th`]
  ];

  tbody.innerHTML = rows.map(r => `
    <tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>
  `).join("");

  // also for PDF
  $("pdfTable").innerHTML = $("compareTable").outerHTML;
}

function buildRecommendations(result){
  const areas=["Speed","Vertical Power","Horizontal Power","Strength","Endurance"];
  const scores=result.scores;
  const paired=areas.map((a,i)=>({a, s:scores[i]}));
  paired.sort((x,y)=>x.s - y.s);

  const top2=paired.slice(0,2);
  const best=paired[paired.length-1];

  const recHtml = `
    <div><b>Priority 1:</b> ${top2[0].a} — build this 2× per week for 4–6 weeks.</div>
    <div><b>Priority 2:</b> ${top2[1].a} — include 1–2 focused drills weekly.</div>
    <div style="margin-top:10px; opacity:.85">
      <b>Strength:</b> ${best.a} is currently your best area — maintain it while improving priorities.
    </div>
    <div style="margin-top:10px; opacity:.85">
      Suggested approach: 6-week block → retest → compare against baseline.
    </div>
  `;
  $("recommendations").innerHTML = recHtml;
  $("pdfRecs").innerHTML = recHtml;
}

function yLabelsByAge(age){
  const map={
    "12-13": {1:"Foundation",2:"Age Standard",3:"Excelling"},
    "14-15": {1:"Developing",2:"Age Standard",3:"High Performance"},
    "16-17": {1:"Developing",2:"Performance",3:"Elite"},
  };
  return map[age] || {1:"Developing",2:"Age Standard",3:"Excelling"};
}

function drawChart(result, baselineResult=null){
  const ctx = $("performanceChart").getContext("2d");
  const labels=["Sprint","Vertical","Broad","Strength","Endurance"];
  const yLabels = yLabelsByAge(result.meta.age);

  if(chartInstance) chartInstance.destroy();

  const athleteColors = result.scores.map(s => s===3 ? getCss("--green") : s===2 ? getCss("--amber") : getCss("--red"));

  const datasets = [
    {
      label: "Athlete (current)",
      data: result.scores,
      backgroundColor: athleteColors
    },
    {
      label: "Age Standard",
      data: [2,2,2,2,2],
      backgroundColor: "rgba(255,255,255,.18)"
    }
  ];

  if(baselineResult){
    datasets.push({
      label: "Baseline",
      data: baselineResult.scores,
      backgroundColor: "rgba(124,92,255,.35)"
    });
  }

  chartInstance = new Chart(ctx,{
    type:"bar",
    data:{ labels, datasets },
    options:{
      responsive:false,
      scales:{
        y:{
          beginAtZero:true,
          min:0,
          max:3,
          ticks:{
            stepSize:1,
            callback:(v)=> yLabels[v] || ""
          }
        }
      }
    }
  });

  // update PDF chart image
  const chartCanvas = $("performanceChart");
  $("chartImage").src = chartCanvas.toDataURL("image/png", 1.0);
}

function updatePdfMeta(result){
  const {name,gender,age,sport}=result.meta;
  $("pdfMeta").textContent = `${name} • ${gender} • Age ${age} • ${sport} • ${new Date().toLocaleDateString()}`;
  $("pdfScoreBadge").textContent = `${result.score100}`;
  $("pdfTraffic").innerHTML = [
    ["Sprint (20m)", result.scores[0]],
    ["Vertical", result.scores[1]],
    ["Broad", result.scores[2]],
    ["Push-ups", result.scores[3]],
    ["1km Run", result.scores[4]]
  ].map(([k,s]) => `
    <div class="pdfTrafficRow">
      <div class="leftRow">
        <span class="dot" style="background:${scoreToColor(s)}"></span>
        <b>${k}</b>
      </div>
      <span class="badge">${scoreToLabel(s)}</span>
    </div>
  `).join("");
}

// ----- Save / Load -----
function saveEntry(type, result){
  const list=loadAssessments();
  const entry={
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    type,
    ts: nowStr(),
    result
  };
  list.unshift(entry);
  saveAssessments(list);
}

function latestBaseline(){
  const list=loadAssessments();
  return list.find(x=>x.type==="baseline")?.result || null;
}

function renderDashboard(){
  const list=loadAssessments();
  const latest=list[0]?.result || null;

  if(!latest){
    $("dashScore").textContent="--";
    $("dashLevel").textContent="No Assessment Yet";
    $("dashSummary").textContent="Run a baseline to see your results.";
    $("dashNextFocus").textContent="Complete a baseline to unlock priorities.";
    $("dashLastTest").textContent="No tests saved yet.";
    $("historyList").innerHTML = `<div class="small">Your past assessments will appear here.</div>`;
    return;
  }

  const greens=latest.scores.filter(s=>s===3).length;
  const ambers=latest.scores.filter(s=>s===2).length;
  const reds=latest.scores.filter(s=>s===1).length;

  $("dashScore").textContent=String(latest.score100);
  $("dashLevel").textContent=latest.level;
  $("dashSummary").textContent=`${greens} Green • ${ambers} Amber • ${reds} Red`;
  const lastTs = loadAssessments()[0]?.ts;
  $("dashLastTest").textContent = `Last saved: ${niceDate(lastTs)}`;

  // focus
  const areas=["Speed","Vertical Power","Horizontal Power","Strength","Endurance"];
  const minScore=Math.min(...latest.scores);
  const idx=latest.scores.indexOf(minScore);
  $("dashNextFocus").textContent=`Primary focus: ${areas[idx]}`;

  // history list
  $("historyList").innerHTML = list.slice(0,10).map(item=>{
    const r=item.result;
    return `
      <div class="historyItem">
        <div class="historyTop">
          <b>${item.type.toUpperCase()}</b>
          <span class="small">${niceDate(item.ts)}</span>
        </div>
        <div class="small">${r.meta.name} • ${r.meta.gender} • ${r.meta.age} • ${r.meta.sport}</div>
        <div class="small">Score ${r.score100} • ${r.level}</div>
      </div>
    `;
  }).join("");
}

async function exportPdf(){
  const el = $("pdfContent");
  if(!el){ alert("Nothing to export yet."); return; }

  try{
    const { jsPDF } = window.jspdf;

    // 1) Force chart update and create a fresh PNG for the PDF
    if (chartInstance) {
      chartInstance.update();
      await new Promise(r => setTimeout(r, 150)); // let canvas paint
    }
    const chartCanvas = $("performanceChart");
    if (chartCanvas) {
      $("chartImage").src = chartCanvas.toDataURL("image/png", 1.0);
      await new Promise(r => setTimeout(r, 150)); // let <img> load
    }

    // 2) Capture the PDF content AFTER the chart image is ready
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#0b0b10",
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: 1200,
      scrollY: -window.scrollY
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p","mm","a4");

    const pageWidth=210, pageHeight=297, margin=6;
    const imgWidth=pageWidth - margin*2;
    const imgHeight=(canvas.height*imgWidth)/canvas.width;

    let remaining=imgHeight;
    pdf.addImage(imgData,"PNG",margin,margin,imgWidth,imgHeight);
    remaining -= (pageHeight - margin*2);

    while(remaining>0){
      pdf.addPage();
      const offsetY = margin - (imgHeight - remaining);
      pdf.addImage(imgData,"PNG",margin,offsetY,imgWidth,imgHeight);
      remaining -= (pageHeight - margin*2);
    }

    const latest=loadAssessments()[0]?.result;
    const name=(latest?.meta?.name || "Athlete").replace(/\s+/g,"_");
    const dateStr=new Date().toISOString().slice(0,10);
    const fileName=`PlyoLab_${name}_${dateStr}.pdf`;

    // iOS fallback
    if(/iPad|iPhone|iPod/.test(navigator.userAgent)){
      const blob=pdf.output("blob");
      const url=URL.createObjectURL(blob);
      window.open(url,"_blank");
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }else{
      pdf.save(fileName);
    }
  }catch(e){
    console.error(e);
    alert("PDF export failed. Try desktop if on mobile, or ensure popups are allowed.");
  }
}


// ----- Events -----
function bind(){
  // tabs
  document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click",()=> showTab(btn.dataset.tab));
  });

  $("goAssessment").addEventListener("click",()=> showTab("assessment"));

  $("resetInputsBtn").addEventListener("click",()=>{
    ["sprint20","vert","broad","pushups","run1k"].forEach(id=> $(id).value="");
  });

  $("resetAllBtn").addEventListener("click",()=>{
    if(confirm("Reset all saved data?")){
      localStorage.removeItem(STORAGE_KEY);
      renderDashboard();
      showTab("dashboard");
      $("retestBtn").disabled = true;
    }
  });

  $("baselineBtn").addEventListener("click",()=>{
    try{
      const result=computeFromInputs();
      saveEntry("baseline", result);

      // render results
      renderTraffic(result);
      buildComparisonTable(result);
      buildRecommendations(result);
      drawChart(result, null);
      updatePdfMeta(result);

      // enable retest
      $("retestBtn").disabled = false;

      renderDashboard();
      alert("Baseline saved ✅");
    }catch(e){ alert(e.message || String(e)); }
  });

  $("retestBtn").addEventListener("click",()=>{
    try{
      const baseline = latestBaseline();
      if(!baseline){
        alert("Please save a baseline first.");
        return;
      }
      const result=computeFromInputs();
      saveEntry("retest", result);

      renderTraffic(result);
      buildComparisonTable(result);
      buildRecommendations(result);
      drawChart(result, baseline);
      updatePdfMeta(result);

      renderDashboard();
      alert("Retest saved ✅ (Baseline overlay added)");
    }catch(e){ alert(e.message || String(e)); }
  });

  $("pdfBtn").addEventListener("click", exportPdf);
  $("downloadPdfBtn").addEventListener("click", exportPdf);

  // on load: if baseline exists, enable retest
  const base=latestBaseline();
  $("retestBtn").disabled = !base;
}

// ----- Boot -----
(function(){
  initAgeGroups();
  bind();
  renderDashboard();
  showTab("dashboard");
})();
