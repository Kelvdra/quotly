'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type QuoteInput = {
  name: string;
  text: string;
  avatar: string;
  replyName: string;
  replyText: string;
  media: string;
  theme: 'light' | 'dark';
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
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
      } else line = w;
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

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(size / iw, size / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);

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
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);

  ctx.restore();
}

async function renderQuotlyToCanvas(canvas: HTMLCanvasElement, input: QuoteInput) {
  const dpr = window.devicePixelRatio || 1;
  const W = 512;
  const H = 768;

  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context tidak tersedia');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const isDark = input.theme === 'dark';
  const bg = isDark ? '#0B141A' : '#FFFFFF';
  const card = isDark ? '#111B21' : '#F5F6F6';
  const textMain = isDark ? '#E9EDEF' : '#111B21';
  const textSub = isDark ? '#AEBAC1' : '#667781';
  const accent = '#25D366';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const padding = 28;
  const cardX = padding;
  const cardW = W - padding * 2;

  const avatarUrl = input.avatar?.trim() || 'https://telegra.ph/file/1e22e45892774893eb1b9.jpg';
  const [avatarImg, mediaImg] = await Promise.all([
    loadImage(avatarUrl).catch(() => null),
    input.media?.trim() ? loadImage(input.media.trim()).catch(() => null) : Promise.resolve(null),
  ]);

  ctx.textBaseline = 'top';
  const nameFont = '600 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  const bodyFont = '400 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  const smallFont = '400 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';

  const avatarSize = 44;
  const headerH = 56;
  const innerPad = 18;
  const maxTextW = cardW - innerPad * 2;

  const mediaH = mediaImg ? 220 : 0;
  const hasReply = Boolean(input.replyName.trim());
  let replyH = 0;

  if (hasReply) {
    ctx.font = smallFont;
    const rn = wrapText(ctx, input.replyName.trim(), maxTextW - 18);
    const rt = wrapText(ctx, (input.replyText || '').trim(), maxTextW - 18);
    replyH = clamp(12 + rn.length * 18 + rt.length * 18 + 10, 56, 140);
  }

  ctx.font = bodyFont;
  const bodyLines = wrapText(ctx, input.text || '', maxTextW);
  const lineH = 26;
  const bodyH = Math.min(bodyLines.length, 14) * lineH;

  const spacing = 14;
  let cardH = innerPad + headerH;
  if (mediaH) cardH += mediaH + spacing;
  if (replyH) cardH += replyH + spacing;
  cardH += bodyH + innerPad + 18;
  cardH = Math.min(cardH, H - padding * 2);

  const safe = 18;
  const cardY = clamp((H - cardH) / 2, safe, H - cardH - safe);

  const contentX = cardX + innerPad;
  let y = cardY + innerPad;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = card;
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fill();
  ctx.restore();

  const avCX = cardX + innerPad + avatarSize / 2;
  const avCY = y + (headerH - avatarSize) / 2 + avatarSize / 2;
  if (avatarImg) drawAvatar(ctx, avatarImg, avCX, avCY, avatarSize);
  else {
    ctx.fillStyle = isDark ? '#1F2C34' : '#DDE4E7';
    ctx.beginPath();
    ctx.arc(avCX, avCY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const nameX = avCX + avatarSize / 2 + 12;
  ctx.font = nameFont;
  ctx.fillStyle = accent;
  ctx.fillText(input.name || 'Unknown', nameX, y + 6);

  ctx.font = smallFont;
  ctx.fillStyle = textSub;
  ctx.fillText('WhatsApp • quotly generator', nameX, y + 30);

  y += headerH;

  if (mediaH && mediaImg) {
    y += 2;
    drawMediaCover(ctx, mediaImg, contentX, y, maxTextW, mediaH, 16);
    y += mediaH + spacing;
  }

  if (replyH) {
    const rx = contentX;
    const ry = y;
    const rw = maxTextW;
    const rh = replyH;

    ctx.fillStyle = isDark ? '#2A3942' : '#FFFFFF';
    drawRoundRect(ctx, rx, ry, rw, rh, 14);
    ctx.fill();

    ctx.fillStyle = accent;
    drawRoundRect(ctx, rx, ry, 6, rh, 6);
    ctx.fill();

    const tx = rx + 12;
    let ty = ry + 10;

    ctx.font = '600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    ctx.fillStyle = accent;
    const nameLines = wrapText(ctx, input.replyName.trim(), rw - 18);
    for (let i = 0; i < Math.min(nameLines.length, 2); i++) {
      ctx.fillText(nameLines[i], tx, ty);
      ty += 18;
    }

    ctx.font = smallFont;
    ctx.fillStyle = textSub;
    const textLines = wrapText(ctx, (input.replyText || '').trim(), rw - 18);
    for (let i = 0; i < Math.min(textLines.length, 2); i++) {
      ctx.fillText(textLines[i], tx, ty);
      ty += 18;
    }

    y += replyH + spacing;
  }

  ctx.font = bodyFont;
  ctx.fillStyle = textMain;
  const lines = bodyLines.slice(0, 14);
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], contentX, y + i * lineH);

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  ctx.font = smallFont;
  ctx.fillStyle = textSub;
  ctx.textAlign = 'right';
  ctx.fillText(`${hh}:${mm}`, cardX + cardW - innerPad, cardY + cardH - innerPad - 2);
  ctx.textAlign = 'left';
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
  });
  const [status, setStatus] = useState('');

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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Quotly WhatsApp Generator (Canvas)</h1>
          <p className="text-sm text-zinc-300">
            Fix mobile: preview responsif (masuk kotak), tombol wrap rapi, dan PNG lebih ke tengah.
          </p>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section className="rounded-2xl bg-zinc-900/60 p-5 shadow">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Input</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
                  onClick={() => setInput((s) => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))}
                >
                  Toggle theme
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
                />
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-zinc-300">Reply Name</span>
                  <input
                    className="rounded-xl bg-zinc-950/60 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-emerald-500"
                    value={input.replyName}
                    onChange={(e) => setInput((s) => ({ ...s, replyName: e.target.value }))}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-zinc-300">Reply Text</span>
                  <input
                    className="rounded-xl bg-zinc-950/60 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-emerald-500"
                    value={input.replyText}
                    onChange={(e) => setInput((s) => ({ ...s, replyText: e.target.value }))}
                  />
                </label>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="text-zinc-300">Media Image URL</span>
                <input
                  className="rounded-xl bg-zinc-950/60 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-emerald-500"
                  value={input.media}
                  onChange={(e) => setInput((s) => ({ ...s, media: e.target.value }))}
                />
              </label>

              <div className="mt-2 rounded-xl bg-zinc-950/40 p-3 ring-1 ring-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-semibold">Backend GET (SVG)</div>
                    <div className="text-zinc-300">Bisa dipanggil via HTTP GET.</div>
                  </div>
                  <button
                    className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
                    onClick={() => copy(getUrl)}
                    disabled={!getUrl}
                  >
                    Copy URL
                  </button>
                </div>
                <div className="mt-2 overflow-x-auto whitespace-nowrap rounded-lg bg-zinc-950/40 p-2 text-xs text-zinc-300">
                  {getUrl || '...'}
                </div>
              </div>

              {status ? <div className="text-sm text-amber-300">{status}</div> : null}
            </div>
          </section>

          <section className="rounded-2xl bg-zinc-900/60 p-5 shadow">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Preview</h2>
              <button className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700" onClick={redraw}>
                Re-render
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center rounded-2xl bg-zinc-950/40 p-4 ring-1 ring-zinc-800">
              <div className="w-full max-w-[512px] aspect-[2/3]">
                <canvas ref={canvasRef} className="h-full w-full rounded-xl" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
