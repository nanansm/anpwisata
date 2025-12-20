/**
 * ============================
 *  CONFIG
 * ============================
 * 1) Isi SHEET_WEBAPP_URL dengan URL Web App dari Google Apps Script (lihat tutorial di bawah).
 * 2) Isi SHEET_SECRET (opsional) agar endpoint tidak mudah disalahgunakan.
 */
const SHEET_WEBAPP_URL = "PASTE_YOUR_WEB_APP_URL_HERE";
const SHEET_SECRET = "OPTIONAL_SECRET_KEY"; // samakan dengan Apps Script. Kalau tidak pakai, kosongkan "".

/**
 * WhatsApp Contact (ganti dengan nomor admin kamu).
 * Format internasional tanpa + (Indonesia: 62xxxx).
 */
const WHATSAPP_NUMBER = "6281234567890";

// ---- Data konten (bisa kamu edit tanpa menyentuh HTML) ----
const HOUSES = [
  {
    name: "Balong",
    title: "Rumah Danau — Balong",
    desc: "Rumah Juragan yang berdiri di tepi air, di tengah alam.",
    vibe: "Danau",
    maps: "https://www.google.com/maps/search/?api=1&query=Balong+ANP+Wisata+Rasa",
  },
  {
    name: "Wacana",
    title: "Rumah Cerita — Wacana",
    desc: "Di rumah ini, makanan datang bersama cerita nostalgia.",
    vibe: "Cerita",
    maps: "https://www.google.com/maps/search/?api=1&query=Wacana+ANP+Wisata+Rasa",
  },
  {
    name: "Popondok",
    title: "Rumah Alam — Popondok",
    desc: "Rumah peristirahatan Juragan (alam, tenang, napas panjang).",
    vibe: "Alam",
    maps: "https://www.google.com/maps/search/?api=1&query=Popondok+ANP+Wisata+Rasa",
  },
  {
    name: "Kang Roti",
    title: "Rumah Wangi Roti — Kang Roti",
    desc: "Wangi roti panggang selalu memenuhi pagi.",
    vibe: "Roti",
    maps: "https://www.google.com/maps/search/?api=1&query=Kang+Roti+ANP+Wisata+Rasa",
  },
  {
    name: "Popotoan",
    title: "Rumah Memori — Popotoan",
    desc: "Rumah kecil Juragan yang penuh lampu dan frame.",
    vibe: "Memori",
    maps: "https://www.google.com/maps/search/?api=1&query=Popotoan+ANP+Wisata+Rasa",
  },
  {
    name: "Restorasa",
    title: "Rumah Rasa — Restorasa",
    desc: "Tempat Juragan menyimpan resep-resep kesayangannya: sajian Nusantara.",
    vibe: "Rasa",
    maps: "https://www.google.com/maps/search/?api=1&query=Restorasa+ANP+Wisata+Rasa",
  },
  {
    name: "Barbedek",
    title: "Rumah Asap — Barbedek",
    desc: "Di sini, Juragan menyalakan bara dan asap.",
    vibe: "Asap",
    maps: "https://www.google.com/maps/search/?api=1&query=Barbedek+ANP+Wisata+Rasa",
  },
];

const WEEKLY = {
  1: [
    "Pembukaan: ambil Kartu Jelajah + gelang di titik pendaftaran.",
    "Mulai dari rumah mana pun, beli Paket Jamuan, lalu minta stempel.",
    "Target realistis: 2–3 rumah dulu untuk pemanasan.",
  ],
  2: [
    "Balong: suasana teduh untuk start santai.",
    "Wacana: momen cerita + nongkrong (event menyesuaikan jadwal panitia).",
    "Ajak 1 teman: lebih gampang lanjut ke rumah berikutnya.",
  ],
  3: [
    "Barbedek: vibe asap / BBQ / malam seru (menyesuaikan jadwal panitia).",
    "Kang Roti: workshop / roti / wangi pagi (menyesuaikan jadwal panitia).",
    "Fokus: tambah stempel 2 rumah minggu ini.",
  ],
  4: [
    "Popondok: puncak perjalanan (menyesuaikan jadwal panitia).",
    "Selesaikan 7 stempel, lalu submit kartu penuh.",
    "Pantau pengumuman dan pastikan kontak kamu benar.",
  ],
};

// rute rekomendasi (opsional)
const ROUTES = {
  dekat: ["Balong", "Wacana", "Restorasa", "Popotoan", "Kang Roti", "Barbedek", "Popondok"],
  keluarga: ["Kang Roti", "Balong", "Restorasa", "Popotoan", "Wacana", "Popondok", "Barbedek"],
  malam: ["Wacana", "Restorasa", "Barbedek", "Popotoan", "Balong", "Popondok", "Kang Roti"],
};

// --- Helpers ---
function $(sel, parent = document) { return parent.querySelector(sel); }
function $all(sel, parent = document) { return Array.from(parent.querySelectorAll(sel)); }

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function normalizeIG(v){
  if(!v) return "";
  v = v.trim();
  if(!v) return "";
  return v.startsWith("@") ? v : `@${v}`;
}

function normalizeWA(v){
  // menerima 08xxx atau 62xxx
  v = (v || "").trim().replace(/\s+/g, "");
  if(!v) return "";
  if(v.startsWith("+")) v = v.slice(1);
  if(v.startsWith("0")) return "62" + v.slice(1);
  if(v.startsWith("62")) return v;
  // fallback: anggap sudah benar
  return v;
}

function makePlayerId(){
  // ID ringan, tidak bentrok besar: PR- + timestamp ringkas
  const t = Date.now().toString().slice(-8);
  const r = Math.floor(Math.random()*900 + 100);
  return `PR-${t}${r}`;
}

function setStatus(el, type, msg){
  el.classList.remove("ok","err");
  if(type) el.classList.add(type);
  el.innerHTML = msg ? `<p style="margin:0;">${msg}</p>` : "";
}

// --- Render houses ---
function renderHouses(){
  const grid = $("#houseGrid");
  if(!grid) return;

  grid.innerHTML = HOUSES.map(h => `
    <article class="card house-card">
      <div class="house-top">
        <div>
          <div class="house-badge">${escapeHTML(h.vibe)}</div>
        </div>
        <div class="house-badge" style="border-style:solid; border-color: rgba(122,214,200,.28); background: rgba(122,214,200,.08);">
          1 Stempel
        </div>
      </div>

      <h3>${escapeHTML(h.title)}</h3>
      <p class="house-desc">${escapeHTML(h.desc)}</p>

      <div class="house-actions">
        <a class="btn btn-soft btn-sm" href="${h.maps}" target="_blank" rel="noopener">Arahkan</a>
        <button class="btn btn-ghost btn-sm" type="button" data-house="${escapeHTML(h.name)}">Lihat Paket</button>
      </div>

      <p class="muted small" style="margin:6px 0 0;">
        Stempel sah setelah beli <strong>Paket Jamuan Juragan</strong> di rumah ini.
      </p>
    </article>
  `).join("");

  // placeholder button: kamu bisa nanti ganti jadi modal yang berisi detail paket
  $all('button[data-house]').forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const name = btn.getAttribute("data-house");
      alert(`Detail Paket Jamuan untuk ${name}.\n\nNanti kamu bisa isi: nama paket, isi, harga, jam berlaku, foto.`);
    });
  });
}

// --- Weekly render ---
function renderWeekly(){
  Object.keys(WEEKLY).forEach(k=>{
    const ul = $(`#week${k}`);
    if(!ul) return;
    ul.innerHTML = WEEKLY[k].map(x=>`<li>${escapeHTML(x)}</li>`).join("");
  });
}

// --- Tabs ---
function setupTabs(){
  const tabs = $all(".tab");
  const panels = $all(".panel");

  tabs.forEach(t=>{
    t.addEventListener("click", ()=>{
      const week = t.dataset.week;

      tabs.forEach(x=>{
        x.classList.toggle("is-active", x === t);
        x.setAttribute("aria-selected", x === t ? "true" : "false");
      });

      panels.forEach(p=>{
        p.classList.toggle("is-active", p.dataset.weekPanel === week);
      });
    });
  });
}

// --- Mobile nav ---
function setupNav(){
  const toggle = $("#navToggle");
  const menu = $("#navMenu");
  if(!toggle || !menu) return;

  toggle.addEventListener("click", ()=>{
    const open = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // close on click
  $all("a", menu).forEach(a=>{
    a.addEventListener("click", ()=>{
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  // close on outside click
  document.addEventListener("click", (e)=>{
    if(!menu.classList.contains("is-open")) return;
    const inNav = menu.contains(e.target) || toggle.contains(e.target);
    if(!inNav){
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

// --- Routes ---
function setupRoutes(){
  const out = $("#routeOutput");
  if(!out) return;

  $all("button[data-route]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.dataset.route;
      const route = ROUTES[k];
      if(!route) return;

      out.innerHTML = `
        <div class="route">
          ${route.map(n=>`<span class="route-pill">${escapeHTML(n)}</span>`).join("")}
        </div>
        <p class="muted small" style="margin:10px 0 0;">
          Kamu boleh tukar urutan sesuai kondisi. Yang penting: 1 rumah = beli Paket Jamuan = 1 stempel.
        </p>
      `;
    });
  });
}

// --- Form -> Google Sheet ---
async function postToSheet(payload){
  if(!SHEET_WEBAPP_URL || SHEET_WEBAPP_URL.includes("PASTE_YOUR_WEB_APP_URL_HERE")){
    throw new Error("SHEET_WEBAPP_URL belum diisi. Ikuti tutorial Google Apps Script di bawah, lalu paste URL-nya.");
  }

  const res = await fetch(SHEET_WEBAPP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SHEET_SECRET ? { "X-Secret": SHEET_SECRET } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(()=> ({}));
  if(!res.ok || data.ok === false){
    const msg = data.message || `Gagal mengirim data (HTTP ${res.status}).`;
    throw new Error(msg);
  }
  return data;
}

function setupForm(){
  const form = $("#journeyForm");
  const status = $("#formStatus");
  const submitBtn = $("#submitBtn");
  const waBtn = $("#waBtn");
  const quickWA = $("#quickWA");

  if(!form || !status) return;

  // WA helper
  function buildWAUrl(extraText=""){
    const text = encodeURIComponent(
      `Halo admin Penjelajah Rasa, saya mau tanya.\n` +
      `${extraText}\n` +
      `Terima kasih!`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  }

  waBtn?.addEventListener("click", ()=>{
    window.open(buildWAUrl(""), "_blank", "noopener");
  });

  quickWA?.addEventListener("click", (e)=>{
    e.preventDefault();
    window.open(buildWAUrl("Saya butuh bantuan terkait cara main / submit kartu."), "_blank", "noopener");
  });

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    setStatus(status, "", ""); // clear

    submitBtn.disabled = true;
    submitBtn.textContent = "Mengirim...";

    try{
      const type = $("#type").value;
      const name = $("#name").value.trim();
      const whatsapp = normalizeWA($("#whatsapp").value);
      const instagram = normalizeIG($("#instagram").value);
      let playerId = $("#playerId").value.trim();
      const startHouse = $("#startHouse").value;
      const notes = $("#notes").value.trim();
      const consent = $("#consent").checked;

      if(!consent) throw new Error("Harap centang persetujuan terlebih dahulu.");
      if(!name) throw new Error("Nama wajib diisi.");
      if(!whatsapp) throw new Error("Nomor WhatsApp wajib diisi.");

      if(!playerId) playerId = makePlayerId();

      const payload = {
        type,
        playerId,
        name,
        whatsapp,
        instagram,
        startHouse,
        notes,
        page: window.location.href,
        userAgent: navigator.userAgent,
        ts: new Date().toISOString(),
      };

      const resp = await postToSheet(payload);

      setStatus(
        status,
        "ok",
        `<strong>Berhasil!</strong> Data kamu sudah tercatat.<br/><br/>
         <strong>Player ID:</strong> <span style="font-weight:900">${escapeHTML(playerId)}</span>
         <br/><span class="muted small">Simpan ID ini (opsional). Kartu fisik tetap bukti utama stempel.</span>
         <br/><br/>
         <a class="btn btn-soft btn-sm" style="text-decoration:none; display:inline-flex;" target="_blank" rel="noopener"
            href="${buildWAUrl(`Player ID: ${playerId}\nNama: ${name}\nTipe: ${type}`)}">Kirim konfirmasi ke WA</a>`
      );

      // reset ringan (tapi simpan ID di input agar terlihat)
      $("#playerId").value = playerId;

    }catch(err){
      setStatus(status, "err", `<strong>Gagal.</strong> ${escapeHTML(err.message || "Terjadi error.")}`);
    }finally{
      submitBtn.disabled = false;
      submitBtn.textContent = "Kirim ke Google Sheet";
    }
  });
}

// --- Progress checker (opsional / demo) ---
async function fetchProgress(playerId){
  // Ini demo lokal. Kalau kamu ingin real:
  // buat endpoint GET di Apps Script: /?action=progress&playerId=...
  // lalu query sheet untuk data stempel.
  // Untuk sekarang: simulasi.
  const done = new Set();
  const seed = playerId.split("").reduce((a,c)=>a + c.charCodeAt(0), 0);
  const count = seed % 8; // 0-7
  for(let i=0;i<count;i++) done.add(HOUSES[i].name);
  return { playerId, done: Array.from(done) };
}

function setupProgress(){
  const btn = $("#checkBtn");
  const input = $("#checkId");
  const box = $("#progressBox");
  if(!btn || !input || !box) return;

  btn.addEventListener("click", async ()=>{
    const id = input.value.trim();
    if(!id){
      box.innerHTML = `<p class="muted small">Masukkan Player ID dulu.</p>`;
      return;
    }
    box.innerHTML = `<p class="muted small">Mengecek...</p>`;

    const data = await fetchProgress(id);
    const doneSet = new Set(data.done);

    box.innerHTML = `
      <p style="margin:0;"><strong>Player ID:</strong> ${escapeHTML(data.playerId)}</p>
      <div class="progress-badges">
        ${HOUSES.map(h=>{
          const done = doneSet.has(h.name);
          return `<span class="progress-badge ${done ? "done" : ""}">${done ? "✅" : "⬜"} ${escapeHTML(h.name)}</span>`;
        }).join("")}
      </div>
      <p class="muted small" style="margin:10px 0 0;">
        (Demo) Untuk real tracking, kamu perlu input data stempel digital per rumah.
      </p>
    `;
  });
}

// Init
document.addEventListener("DOMContentLoaded", ()=>{
  renderHouses();
  renderWeekly();
  setupTabs();
  setupNav();
  setupRoutes();
  setupForm();
  setupProgress();
});
