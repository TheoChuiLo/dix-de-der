// Score card rendering (canvas) and sharing helpers.

const SIZE = 1080;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
const FALLBACK_COLORS = {
  bg: '#0e1016',
  surface: '#181b24',
  text: '#f3f4f8',
  muted: '#9aa0b4',
  accent: '#7c6cff',
  accentInk: '#ffffff',
  us: '#5cc8ff',
  them: '#ff9a62',
};

function fitFont(ctx, text, maxWidth, size, weight) {
  let current = size;
  do {
    ctx.font = `${weight} ${current}px ${FONT}`;
    current -= 4;
  } while (ctx.measureText(text).width > maxWidth && current > 20);
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// card: { title, subtitle, footer, winner, colors, us: { name, players, score }, them: {...} }
export function drawScoreCard(card) {
  const colors = { ...FALLBACK_COLORS, ...card.colors };
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = colors.text;
  ctx.font = `800 76px ${FONT}`;
  ctx.fillText(card.title, SIZE / 2, 170);

  ctx.fillStyle = colors.muted;
  ctx.font = `500 38px ${FONT}`;
  ctx.fillText(card.subtitle, SIZE / 2, 232);

  const panels = { us: 60, them: 560 };
  for (const team of ['us', 'them']) {
    const x = panels[team];
    const center = x + 230;
    const side = card[team];

    ctx.fillStyle = colors.surface;
    roundedRect(ctx, x, 310, 460, 520, 48);
    ctx.fill();

    if (card.winner === team) {
      ctx.strokeStyle = colors[team];
      ctx.lineWidth = 6;
      roundedRect(ctx, x, 310, 460, 520, 48);
      ctx.stroke();

      ctx.fillStyle = colors[team];
      roundedRect(ctx, center - 125, 282, 250, 58, 29);
      ctx.fill();
      ctx.fillStyle = colors.bg;
      ctx.font = `800 30px ${FONT}`;
      ctx.fillText('VAINQUEUR', center, 322);
    }

    ctx.fillStyle = colors[team];
    fitFont(ctx, side.name, 400, 56, 700);
    ctx.fillText(side.name, center, 430);

    fitFont(ctx, String(side.score), 410, 210, 800);
    ctx.fillText(String(side.score), center, 660);

    ctx.fillStyle = colors.muted;
    fitFont(ctx, side.players, 400, 36, 500);
    ctx.fillText(side.players, center, 760);
  }

  ctx.fillStyle = colors.text;
  ctx.font = `600 40px ${FONT}`;
  ctx.fillText(card.footer, SIZE / 2, 930);

  ctx.font = `400 52px ${FONT}`;
  const suits = [
    ['♠', colors.muted],
    ['♥', colors.accent],
    ['♦', colors.accent],
    ['♣', colors.muted],
  ];
  suits.forEach(([symbol, color], i) => {
    ctx.fillStyle = color;
    ctx.fillText(symbol + '︎', SIZE / 2 - 120 + i * 80, 1010);
  });

  return canvas;
}

// Shares the score card as an image when the platform allows it, otherwise downloads it.
// Returns 'shared', 'downloaded' or 'cancelled'.
export async function shareScoreCard(card, text) {
  const canvas = drawScoreCard(card);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const file = new File([blob], 'score-belote.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
