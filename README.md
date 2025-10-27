# web3-calculator — Web3 P2P Chat

Singkat: sebuah demo chat P2P berbasis Gun (GUN.js) + Web3 wallet (MetaMask) — server relay ringan (RAM-only) dan client browser sederhana.

## Fitur utama
- Relay Gun ringan (radisk/localStorage dimatikan) untuk kecepatan.
- Client web terhubung dengan MetaMask (hanya alamat wallet disimpan).
- Room-based chat (ID room gratis).
- Tidak menyimpan data persistensi pada server (RAM-only).

## Struktur proyek
- server.js — Node.js relay Gun (HTTP server).
- index.html — UI client.
- script.js — logic client (connect wallet, join room, kirim/terima pesan).
- package.json — dependensi & script start.
- .gitignore — aturan file yang diabaikan.

## Prasyarat
- Node.js (v18+ direkomendasikan)
- npm
- Browser dengan MetaMask (untuk demo wallet)
- Jalankan pada jaringan lokal; sesuaikan IP peer di script.js jika perlu (default: 192.168.1.4)

## Instalasi & Jalankan (Windows / PowerShell)
1. Install dependensi:
```bash
npm install