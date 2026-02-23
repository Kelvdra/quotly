import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

function esc(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function pickInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? 'U';
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (a + b).toUpperCase();
}
function softWrap(text: string, maxChars: number) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return [''];
  const words = t.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (test.length <= maxChars) line = test;
    else { if (line) lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get('name') || '').trim();
  const text = (searchParams.get('text') || '').trim();
  const replyName = (searchParams.get('replyName') || '').trim();
  const replyText = (searchParams.get('replyText') || '').trim();
  const theme = (searchParams.get('theme') || 'light') === 'dark' ? 'dark' : 'light';
  const media = (searchParams.get('media') || '').trim();

  if (!name) {
    return new Response(JSON.stringify({ ok: false, message: 'name is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const W = 512, H = 768;
  const pad = 28;
  const cardX = pad;
  const cardW = W - pad * 2;

  const isDark = theme === 'dark';
  const bg = isDark ? '#0B141A' : '#FFFFFF';
  const card = isDark ? '#111B21' : '#F5F6F6';
  const textMain = isDark ? '#E9EDEF' : '#111B21';
  const textSub = isDark ? '#AEBAC1' : '#667781';
  const accent = '#25D366';

  const headerH = 56, innerPad = 18;
  const contentW = cardW - innerPad * 2;

  const hasReply = Boolean(replyName);
  const hasMedia = Boolean(media);

  const bodyLines = softWrap(text, 34).slice(0, 14);
  const replyNameLines = hasReply ? softWrap(replyName, 40).slice(0, 2) : [];
  const replyTextLines = hasReply ? softWrap(replyText, 44).slice(0, 2) : [];

  const lineH = 26;
  const bodyH = Math.max(1, bodyLines.length) * lineH;
  const mediaH = hasMedia ? 220 : 0;
  const replyH = hasReply ? 86 : 0;
  const spacing = 14;

  let cardH = innerPad + headerH;
  if (mediaH) cardH += mediaH + spacing;
  if (replyH) cardH += replyH + spacing;
  cardH += bodyH + innerPad + 18;
  cardH = Math.min(cardH, H - pad * 2);

  const safe = 18;
  const cardY = Math.max(safe, Math.min((H - cardH) / 2, H - cardH - safe));

  const initials = pickInitials(name);

  const x0 = cardX + innerPad;
  let y = cardY + innerPad;

  const avCX = cardX + innerPad + 22;
  const avCY = y + 28;
  const nameX = avCX + 22 + 12;

  y += headerH;

  const mediaY = y + 2;
  const afterMediaY = mediaH ? mediaY + mediaH + spacing : y;
  const replyY = afterMediaY;
  const afterReplyY = replyH ? replyY + replyH + spacing : afterMediaY;
  const bodyY = afterReplyY;

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity="0.18"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <rect x="${cardX}" y="${cardY}" rx="22" ry="22" width="${cardW}" height="${cardH}" fill="${card}"/>
  </g>

  <circle cx="${avCX}" cy="${avCY}" r="22" fill="${isDark ? '#1F2C34' : '#DDE4E7'}"/>
  <text x="${avCX}" y="${avCY}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui" font-size="14" font-weight="700" fill="${isDark ? '#E9EDEF' : '#111B21'}">${esc(initials)}</text>

  <text x="${nameX}" y="${cardY + innerPad + 6}" font-family="ui-sans-serif, system-ui" font-size="18" font-weight="700" fill="${accent}">${esc(name)}</text>
  <text x="${nameX}" y="${cardY + innerPad + 30}" font-family="ui-sans-serif, system-ui" font-size="14" fill="${textSub}">WhatsApp • quotly generator</text>

  ${hasMedia ? `
  <rect x="${x0}" y="${mediaY}" rx="16" ry="16" width="${contentW}" height="${mediaH}" fill="${isDark ? '#0F1A20' : '#E9EEF0'}"/>
  <text x="${x0 + contentW / 2}" y="${mediaY + mediaH / 2}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui" font-size="14" fill="${textSub}">${esc('media (placeholder)')}</text>
  ` : ''}

  ${hasReply ? `
  <rect x="${x0}" y="${replyY}" rx="14" ry="14" width="${contentW}" height="${replyH}" fill="${isDark ? '#0F1A20' : '#FFFFFF'}"/>
  <rect x="${x0}" y="${replyY}" rx="6" ry="6" width="6" height="${replyH}" fill="${accent}"/>
  <text x="${x0 + 12}" y="${replyY + 10}" font-family="ui-sans-serif, system-ui" font-size="14" font-weight="700" fill="${accent}">${esc(replyNameLines[0] || replyName)}</text>
  <text x="${x0 + 12}" y="${replyY + 30}" font-family="ui-sans-serif, system-ui" font-size="14" fill="${textSub}">${esc(replyTextLines[0] || replyText)}</text>
  ` : ''}

  ${bodyLines.map((ln, i) => `<text x="${x0}" y="${bodyY + i * lineH}" font-family="ui-sans-serif, system-ui" font-size="18" fill="${textMain}">${esc(ln)}</text>`).join('\n  ')}

  <text x="${cardX + cardW - innerPad}" y="${cardY + cardH - innerPad - 2}" text-anchor="end" font-family="ui-sans-serif, system-ui" font-size="14" fill="${textSub}">${hh}:${mm}</text>
</svg>`;

  return new Response(svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8' } });
}
