# NK-Dev ClassRoom — Web Admin (privat)

Panel superadmin terpisah dari situs utama, cuma buat kamu (owner). Deploy
sebagai project Vercel sendiri, beda domain dari situs murid/guru.

## Kenapa terpisah

Sama seperti pola EchoNote dan Grub-Community kamu: situs utama publik buat
guru/murid, situs admin ini privat cuma buat kamu kelola semuanya dari luar
tanpa harus jadi member sebuah room dulu.

## Setup

1. **Pakai Firebase project yang SAMA** dengan situs utama (`classroomnkdev`).
   `src/scripts/firebase-config.js` di sini sudah kesalin otomatis, tapi cek
   ulang kalau kamu ganti config di situs utama.
2. Deploy folder ini (`webadmin/`) sebagai **project Vercel terpisah** dari
   situs utama, misal jadi `admin-nkdevclassroom.vercel.app`.
3. Buka situs admin itu, di kolom **Password admin** masukkan password kamu.
   **Login pertama otomatis membuatkan akun adminnya** dengan password yang
   kamu ketik saat itu — nggak perlu daftar manual atau copy UID dari mana pun.
4. Login berikutnya tinggal masukkan password yang sama.

Akun admin pakai email tetap (`owner@nkdevclassroom.internal`, bisa kamu
ganti sendiri di `src/scripts/admin-config.js` kalau mau) yang tidak
ditampilkan di form — pengguna cuma perlu tahu passwordnya.

⚠️ Karena login pertama = auto-create, siapa pun yang buka situs ini **duluan**
dan submit password apa saja akan jadi admin permanen (Firebase Auth tidak
bisa dua akun beda password di email yang sama). Jadi begitu di-deploy,
langsung login sendiri duluan sebelum linknya dibagikan/bocor ke siapa pun.

## Fitur

- **Kelola Pengguna** — lihat semua guru & murid, cari nama/email, blokir /
  buka blokir akun (akun yang diblokir otomatis ke-signout & ditolak masuk
  situs utama).
- **Kelola Room** — lihat semua room di seluruh sistem, lihat detail
  (password kelas, key kedua, daftar anggota), kick anggota siapa pun
  (termasuk admin utama, karena ini akses owner), atau hapus room beserta
  semua pesannya.

## ⚠️ Keamanan — WAJIB dibaca

Pengecekan `OWNER_UID` di atas cuma proteksi di sisi tampilan (client). Kalau
ada yang cukup jago, dia bisa langsung akses Firestore lewat SDK dan
lewatin proteksi ini. Supaya beneran aman, tambahkan Firestore Rules yang
mengunci operasi sensitif (blokir user, hapus room) hanya untuk UID kamu:

```
match /databases/{database}/documents {
  match /users/{userId} {
    allow update: if request.auth.uid == userId
      || (request.auth.token.email == "owner@nkdevclassroom.internal"
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["blocked"]));
  }
  match /rooms/{roomId} {
    allow delete: if request.auth.token.email == "owner@nkdevclassroom.internal";
  }
}
```

Gabungkan aturan ini dengan rules situs utama di `README.md` folder
`webkelas/`.
