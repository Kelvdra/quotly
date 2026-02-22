'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type QuoteInput = {
  name: string;
  text: string;
  avatar: string;
  replyName: string;
  replyText: string;
  media: string; // URL image (opsional)
  theme: 'light' | 'dark';
  style: 'card' | 'bubble';
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = ctx.measureText(test).width;
    if (width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      // word terlalu panjang → pecah per karakter
      if (ctx.measureText(w).width > maxWidth) {
        let chunk = '';
        for (const ch of w) {
          const t = chunk + ch;
          if (ctx.measureText(t).width <= maxWidth) chunk = t;
          else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        line = chunk;
      } else {
        line = w;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function loadImage(url: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal load image: ${url}`));
    img.src = url;
  });
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawAvatar(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // cover
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(size / iw, size / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = cx - dw / 2;
  const dy = cy - dh / 2;
  ctx.drawImage(img, dx, dy, dw, dh);

  ctx.restore();
}

function drawMediaCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, radius: number) {
  ctx.save();
  drawRoundRect(ctx, x, y, w, h, radius);
  ctx.clip();

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);

  ctx.restore();
}

async function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const W = 512;
  const H = 768;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context tidak tersedia');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W, H };
}

async function renderCardToCanvas(canvas: HTMLCanvasElement, input: QuoteInput) {
  const { ctx, W, H } = await setupCanvas(canvas);

  // theme
  const isDark = input.theme === 'dark';
  const bg = isDark ? '#0B141A' : '#FFFFFF';
  const card = isDark ? '#111B21' : '#F5F6F6';
  const textMain = isDark ? '#E9EDEF' : '#111B21';
  const textSub = isDark ? '#AEBAC1' : '#667781';
  const accent = '#25D366'; // WhatsApp green

  // background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // card layout
  const padding = 28;
  const cardX = padding;
  const cardY = padding;
  const cardW = W - padding * 2;

  // preload images
  const avatarUrl = input.avatar?.trim() || 'https://telegra.ph/file/1e22e45892774893eb1b9.jpg';
  const [avatarImg, mediaImg] = await Promise.all([
    loadImage(avatarUrl).catch(() => null),
    input.media?.trim() ? loadImage(input.media.trim()).catch(() => null) : Promise.resolve(null),
  ]);

  // fonts
  ctx.textBaseline = 'top';
  const nameFont = '600 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  const bodyFont = '400 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  const smallFont = '400 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';

  // calculate dynamic height
  const avatarSize = 44;
  const headerH = 56;
  const innerPad = 18;
  const contentX = cardX + innerPad;
  let y = cardY + innerPad;

  // measure body lines
  ctx.font = bodyFont;
  const maxTextW = cardW - innerPad * 2;

  // media block
  const mediaH = mediaImg ? 220 : 0;

  // reply block
  const hasReply = Boolean(input.replyName.trim());
  const replyW = maxTextW;

  // measure reply height
  let replyH = 0;
  if (hasReply) {
    ctx.font = smallFont;
    const replyNameLines = wrapText(ctx, input.replyName.trim(), replyW - 18);
    const replyTextLines = wrapText(ctx, (input.replyText || '').trim(), replyW - 18);
    replyH = 12 + replyNameLines.length * 18 + replyTextLines.length * 18 + 10;
    replyH = clamp(replyH, 56, 140);
  }

  // measure main text height
  ctx.font = bodyFont;
  const bodyLines = wrapText(ctx, input.text || '', maxTextW);
  const lineH = 26;
  const bodyH = Math.min(bodyLines.length, 14) * lineH; // cap lines

  const spacing = 14;
  let cardH = innerPad + headerH;
  if (mediaH) cardH += mediaH + spacing;
  if (replyH) cardH += replyH + spacing;
  cardH += bodyH + innerPad + 18; // bottom for timestamp-ish
  cardH = Math.min(cardH, H - padding * 2);

  // draw card
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = card;
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fill();
  ctx.restore();

  // header: avatar
  const avCX = cardX + innerPad + avatarSize / 2;
  const avCY = y + (headerH - avatarSize) / 2 + avatarSize / 2;
  if (avatarImg) {
    drawAvatar(ctx, avatarImg, avCX, avCY, avatarSize);
  } else {
    ctx.fillStyle = isDark ? '#1F2C34' : '#DDE4E7';
    ctx.beginPath();
    ctx.arc(avCX, avCY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // name
  const nameX = avCX + avatarSize / 2 + 12;
  ctx.font = nameFont;
  ctx.fillStyle = accent;
  ctx.fillText(input.name || 'Unknown', nameX, y + 6);

  // subline
  ctx.font = smallFont;
  ctx.fillStyle = textSub;
  const sub = 'WhatsApp • quotly generator';
  ctx.fillText(sub, nameX, y + 30);

  y += headerH;

  // media
  if (mediaH && mediaImg) {
    y += 2;
    drawMediaCover(ctx, mediaImg, contentX, y, maxTextW, mediaH, 16);
    y += mediaH + spacing;
  }

  // reply box
  if (replyH) {
    const rx = contentX;
    const ry = y;
    const rw = replyW;
    const rh = replyH;

    ctx.fillStyle = isDark ? '#2A3942' : '#FFFFFF';
    drawRoundRect(ctx, rx, ry, rw, rh, 14);
    ctx.fill();

    ctx.fillStyle = accent;
    drawRoundRect(ctx, rx, ry, 6, rh, 6);
    ctx.fill();

    ctx.font = '600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    ctx.fillStyle = accent;
    const rName = input.replyName.trim();
    const rText = (input.replyText || '').trim();

    const tx = rx + 12;
    let ty = ry + 10;

    const nameLines = wrapText(ctx, rName, rw - 18);
    for (let i = 0; i < Math.min(nameLines.length, 2); i++) {
      ctx.fillText(nameLines[i], tx, ty);
      ty += 18;
    }

    ctx.font = smallFont;
    ctx.fillStyle = textSub;
    const textLines = wrapText(ctx, rText, rw - 18);
    for (let i = 0; i < Math.min(textLines.length, 2); i++) {
      ctx.fillText(textLines[i], tx, ty);
      ty += 18;
    }

    y += replyH + spacing;
  }

  // main text
  ctx.font = bodyFont;
  ctx.fillStyle = textMain;

  const maxLines = 14;
  const lines = bodyLines.slice(0, maxLines);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], contentX, y + i * lineH);
  }
  y += lines.length * lineH + 10;

  // footer time
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  ctx.font = smallFont;
  ctx.fillStyle = textSub;
  ctx.textAlign = 'right';
  ctx.fillText(`${hh}:${mm}`, cardX + cardW - innerPad, cardY + cardH - innerPad - 2);
  ctx.textAlign = 'left';
}

async function renderBubbleToCanvas(canvas: HTMLCanvasElement, input: QuoteInput) {
  const { ctx, W, H } = await setupCanvas(canvas);

  // Background hitam seperti contoh
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // Layout (mendekati screenshot)
  const avatarSize = 120;
  const avatarX = 48;
  const avatarY = 56;

  const bubbleX = avatarX + avatarSize + 24;
  const bubbleY = 40;
  const bubbleW = W - bubbleX - 48;
  const bubbleH = 280;
  const bubbleR = 44;

  // preload avatar
  const avatarUrl = input.avatar?.trim() || 'https://telegra.ph/file/1e22e45892774893eb1b9.jpg';
  const avatarImg = await loadImage(avatarUrl).catch(() => null);

  // bubble putih
  ctx.fillStyle = '#FFFFFF';
  drawRoundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, bubbleR);
  ctx.fill();

  // avatar
  if (avatarImg) {
    drawAvatar(ctx, avatarImg, avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize);
  } else {
    ctx.fillStyle = '#DDE4E7';
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Text style seperti contoh: nama besar orange, pesan besar hitam
  ctx.textBaseline = 'top';
  const nameColor = '#F28C28';
  const nameFont = '800 64px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  const msgFont = '500 64px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';

  const pad = 44;
  const maxW = bubbleW - pad * 2;

  // Nama
  ctx.font = nameFont;
  ctx.fillStyle = nameColor;
  const nameLines = wrapText(ctx, input.name || 'Unknown', maxW).slice(0, 1);
  ctx.fillText(nameLines[0] || '', bubbleX + pad, bubbleY + 44);

  // Pesan
  ctx.font = msgFont;
  ctx.fillStyle = '#000000';
  const msgLines = wrapText(ctx, input.text || '', maxW).slice(0, 2);
  const startY = bubbleY + 140;
  for (let i = 0; i < msgLines.length; i++) {
    ctx.fillText(msgLines[i], bubbleX + pad, startY + i * 74);
  }
}

async function renderQuotlyToCanvas(canvas: HTMLCanvasElement, input: QuoteInput) {
  if (input.style === 'bubble') return renderBubbleToCanvas(canvas, input);
  return renderCardToCanvas(canvas, input);
}

function buildGetUrl(base: string, input: QuoteInput) {
  const u = new URL(base);
  u.searchParams.set('name', input.name);
  u.searchParams.set('text', input.text);
  if (input.avatar) u.searchParams.set('avatar', input.avatar);
  if (input.replyName) u.searchParams.set('replyName', input.replyName);
  if (input.replyText) u.searchParams.set('replyText', input.replyText);
  if (input.media) u.searchParams.set('media', input.media);
  u.searchParams.set('theme', input.theme);
  u.searchParams.set('style', input.style);
  return u.toString();
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [input, setInput] = useState<QuoteInput>({
    name: 'Nesa',
    text: 'Ini contoh quotly generator tanpa API. Render langsung pakai canvas di browser.',
    avatar: 'https://telegra.ph/file/1e22e45892774893eb1b9.jpg',
    replyName: 'Teman',
    replyText: 'Keren! Bisa jadi endpoint GET juga?',
    media: '',
    theme: 'light',
    style: 'card',
  });
  const [status, setStatus] = useState<string>('');

  const getUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return buildGetUrl(`${window.location.origin}/api/quotly`, input);
  }, [input]);

  async function redraw() {
    try {
      setStatus('Rendering...');
      if (!canvasRef.current) return;
      await renderQuotlyToCanvas(canvasRef.current, input);
      setStatus('');
    } catch (e: any) {
      setStatus(e?.message || 'Render error');
    }
  }

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  function downloadPng() {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'quotly.png';
    a.click();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied!');
      setTimeout(() => setStatus(''), 900);
    } catch {
      setStatus('Gagal copy');
      setTimeout(() => setStatus(''), 900);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Quotly WhatsApp Generator (Canvas)</h1>
          <p className="text-sm text-zinc-300">
            Render card seperti “quote message” WhatsApp tanpa API eksternal. Kamu bisa download PNG, atau ambil versi backend GET (SVG).
          </p>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section className="rounded-2xl bg-zinc-900/60 p-5 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Input</h2>
              <div className="flex gap-2">
                <button
                  className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
                  onClick={() => setInput((s) => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))}
                >
                  Toggle theme
                </button>
                <button
                  className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
                  onClick={() => setInput((s) => ({ ...s, style: s.style === 'card' ? 'bubble' : 'card' }))}
                >
                  Toggle style
                </button>
                <button
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm hover:bg-emerald-500"
                  onClick={downloadPng}
                >
                  Download PNG
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-zinc-300">Name</span>
                <input
                  className="rounded-xl bg-zinc-950/60 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-emerald-500"
                  value={input.name}
                  onChange={(e) => setInput((s) => ({ ...s, name: e.target.value }))}
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-zinc-300">Text</span>
                <textarea
                  className="min-h-[110px] rounded-xl bg-zinc-950/60 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-emerald-500"
                  value={input.text}
                  onChange={(e) => setInput((s) => ({ ...s, text: e.target.value }))}
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-zinc-300">Avatar URL</span>
                <input
                  className="rounded-xl bg-zinc-950/60 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-emerald-500"
                  value={input.avatar}
                  onChange={(e) => setInput((s) => ({ ...s, avatar: e.target.value }))}
                  placeholder="https://...jpg"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-zinc-300">Reply Name (optional)</span>
                  <input
                    className="rounded-xl bg-zinc-950/60 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-emerald-500"
                    value={input.replyName}
                    onChange={(e) => setInput((s) => ({ ...s, replyName: e.target.value }))}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-zinc-300">Reply Text (optional)</span>
                  <input
                    className="rounded-xl bg-zinc-950/60 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-emerald-500"
                    value={input.replyText}
                    onChange={(e) => setInput((s) => ({ ...s, replyText: e.target.value }))}
                  />
                </label>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="text-zinc-300">Media Image URL (optional)</span>
                <input
                  className="rounded-xl bg-zinc-950/60 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-emerald-500"
                  value={input.media}
                  onChange={(e) => setInput((s) => ({ ...s, media: e.target.value }))}
                  placeholder="https://...png"
                />
              </label>

              <div className="mt-2 rounded-xl bg-zinc-950/40 p-3 ring-1 ring-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-semibold">Backend GET (SVG)</div>
                    <div className="text-zinc-300">Bisa kamu panggil dari bot/servis lain via HTTP GET.</div>
                  </div>
                  <button
                    className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
                    onClick={() => copy(getUrl)}
                    disabled={!getUrl}
                  >
                    Copy URL
                  </button>
                </div>
                <div className="mt-2 break-all text-xs text-zinc-300">{getUrl || '...'}</div>
              </div>

              {status ? <div className="text-sm text-amber-300">{status}</div> : null}
            </div>
          </section>

          <section className="rounded-2xl bg-zinc-900/60 p-5 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Preview</h2>
              <button className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700" onClick={redraw}>
                Re-render
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center rounded-2xl bg-zinc-950/40 p-4 ring-1 ring-zinc-800">
              <canvas ref={canvasRef} className="rounded-xl" />
            </div>

            <div className="mt-4 text-xs text-zinc-300">
              Tips: Kalau avatar/media dari domain yang memblok CORS, browser bisa gagal export PNG. Gunakan URL yang
              mengizinkan CORS, atau proxy lewat server kamu.
            </div>
          </section>
        </div>

        <section className="mt-10 rounded-2xl bg-zinc-900/60 p-5 shadow">
          <h2 className="text-base font-semibold">Cara pakai endpoint GET</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-200">
            <li>
              Panggil URL <span className="font-mono">/api/quotly</span> dengan query params.
            </li>
            <li>
              Response adalah <span className="font-mono">image/svg+xml</span>. Kamu bisa kirim sebagai file, atau render
              ke PNG di client.
            </li>
            <li>
              Contoh: <span className="font-mono">/api/quotly?name=Nesa&text=Halo</span>
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
