# Quotly WhatsApp Generator (Canvas) + Vercel GET Backend (SVG)

## Jalankan lokal
```bash
npm install
npm run dev
```

Buka: http://localhost:3000

## Endpoint GET (Backend)
Contoh:
- /api/quotly?name=Nesa&text=Halo
- /api/quotly?name=Nesa&text=Halo&replyName=Teman&replyText=Iya&theme=dark

Response: `image/svg+xml`

## Deploy Vercel
- Push repo ke GitHub
- Import ke Vercel
- Framework: Next.js
- Build command: `npm run build`
- Output: default Next.js

## Catatan
- Frontend kanvas bisa export PNG.
- Backend sengaja mengembalikan SVG supaya deploy Vercel mudah tanpa dependency native canvas.

Tambahan style:
- /api/quotly?name=Nesa&text=halo&style=bubble
