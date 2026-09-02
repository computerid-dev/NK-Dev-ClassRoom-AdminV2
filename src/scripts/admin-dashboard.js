import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  arrayRemove,
} from "./firebase-init.js";
import { ADMIN_EMAIL } from "./admin-config.js";
import { showToast } from "./utils.js";

const $ = (sel) => document.querySelector(sel);
let allUsers = [];
let allRooms = [];

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== ADMIN_EMAIL) {
    window.location.href = "/index.html";
    return;
  }
  watchUsers();
  watchRooms();
});

$("#btn-logout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/index.html";
});

/* ---------- Tab switching ---------- */
document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    $("#tab-users").style.display = btn.dataset.tab === "users" ? "block" : "none";
    $("#tab-rooms").style.display = btn.dataset.tab === "rooms" ? "block" : "none";
  });
});

/* ---------- Pengguna ---------- */
function watchUsers() {
  onSnapshot(collection(db, "users"), (snap) => {
    allUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderUsers();
  });
}

$("#user-search").addEventListener("input", renderUsers);

function renderUsers() {
  const keyword = $("#user-search").value.trim().toLowerCase();
  const wrap = $("#user-list");
  wrap.innerHTML = "";

  const filtered = allUsers.filter((u) => {
    if (!keyword) return true;
    return (u.namaLengkap || "").toLowerCase().includes(keyword) || (u.email || "").toLowerCase().includes(keyword);
  });

  if (filtered.length === 0) {
    wrap.innerHTML = `<div class="card-pad hint">Tidak ada pengguna yang cocok.</div>`;
    return;
  }

  filtered.forEach((u) => {
    const row = document.createElement("div");
    row.className = "roster-row";
    row.style.padding = "14px 20px";
    const roleInfo =
      u.role === "guru"
        ? `Guru · ${u.guruType === "wali" ? `Wali ${u.kelasWali || "-"}` : (u.mapel || []).join(", ")}`
        : `Murid · Kelas ${u.kelasMurid || "-"}`;
    row.innerHTML = `
      <div>
        <div style="font-weight:600;">${u.namaLengkap || "(tanpa nama)"}</div>
        <div class="hint" style="font-size:12px;">${u.email || ""} · ${roleInfo}</div>
      </div>
      <div class="row gap-2">
        ${u.blocked ? '<span class="badge badge-danger">Diblokir</span>' : ""}
        <button class="btn btn-sm ${u.blocked ? "btn-outline" : "btn-danger"}" data-toggle-block="${u.id}" data-blocked="${!!u.blocked}">${u.blocked ? "Buka blokir" : "Blokir"}</button>
      </div>
    `;
    wrap.appendChild(row);
  });

  wrap.querySelectorAll("[data-toggle-block]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.toggleBlock;
      const currentlyBlocked = btn.dataset.blocked === "true";
      await setDoc(doc(db, "users", uid), { blocked: !currentlyBlocked }, { merge: true });
      showToast(currentlyBlocked ? "Blokir dibuka" : "Pengguna diblokir");
    });
  });
}

/* ---------- Room ---------- */
function watchRooms() {
  onSnapshot(collection(db, "rooms"), (snap) => {
    allRooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderRooms();
  });
}

function findUserName(uid) {
  const u = allUsers.find((x) => x.id === uid);
  return u ? u.namaLengkap : uid;
}

function renderRooms() {
  const wrap = $("#room-list");
  wrap.innerHTML = "";

  if (allRooms.length === 0) {
    wrap.innerHTML = `<div class="card-pad hint">Belum ada room.</div>`;
    return;
  }

  allRooms.forEach((r) => {
    const row = document.createElement("div");
    row.className = "roster-row";
    row.style.padding = "14px 20px";
    row.innerHTML = `
      <div>
        <div style="font-weight:600;">${r.roomName}</div>
        <div class="hint" style="font-size:12px;">
          Jam ${r.waktuMulai}–${r.waktuSelesai} · ${(r.members || []).length} anggota · UID ${r.uid8}
        </div>
      </div>
      <div class="row gap-2">
        <button class="btn btn-outline btn-sm" data-detail="${r.id}">Detail</button>
        <button class="btn btn-danger btn-sm" data-delete="${r.id}">Hapus</button>
      </div>
    `;
    wrap.appendChild(row);
  });

  wrap.querySelectorAll("[data-detail]").forEach((btn) => {
    btn.addEventListener("click", () => openRoomDetail(btn.dataset.detail));
  });
  wrap.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteRoom(btn.dataset.delete));
  });
}

function openRoomDetail(roomId) {
  const room = allRooms.find((r) => r.id === roomId);
  if (!room) return;

  $("#room-detail-title").textContent = room.roomName;
  const body = $("#room-detail-body");
  const members = room.members || [];

  body.innerHTML = `
    <p class="hint" style="font-size:13px;">Password kelas: <code>${room.passwordKelas}</code> · Key kedua: <code>${room.keyKedua}</code></p>
    <h4 style="font-size:13px; margin: 16px 0 8px;">Anggota (${members.length})</h4>
    <div id="detail-member-list"></div>
  `;

  const list = body.querySelector("#detail-member-list");
  members.forEach((uid) => {
    const isMain = room.mainAdminUid === uid;
    const isAdmin = room.admins?.includes(uid);
    const label = isMain ? "Admin utama" : isAdmin ? "Admin" : "Murid";
    const row = document.createElement("div");
    row.className = "pending-row";
    row.innerHTML = `
      <span style="font-size:13px;">${findUserName(uid)} <span class="hint" style="font-size:11px;">· ${label}</span></span>
      <button class="btn btn-danger btn-sm" data-kick="${uid}">Kick</button>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll("[data-kick]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Keluarkan anggota ini dari room?")) return;
      await setDoc(
        doc(db, "rooms", roomId),
        { members: arrayRemove(btn.dataset.kick), admins: arrayRemove(btn.dataset.kick) },
        { merge: true }
      );
      showToast("Anggota dikeluarkan");
      closeRoomDetail();
    });
  });

  $("#room-detail-modal").style.display = "flex";
}

function closeRoomDetail() {
  $("#room-detail-modal").style.display = "none";
}
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => closeRoomDetail());
});

async function deleteRoom(roomId) {
  if (!confirm("Hapus room ini beserta semua pesannya? Tindakan ini tidak bisa dibatalkan.")) return;
  try {
    const msgsSnap = await getDocs(collection(db, "rooms", roomId, "messages"));
    await Promise.all(msgsSnap.docs.map((m) => deleteDoc(m.ref)));
    await deleteDoc(doc(db, "rooms", roomId));
    showToast("Room dihapus");
  } catch (err) {
    console.error(err);
    showToast("Gagal menghapus room");
  }
}
