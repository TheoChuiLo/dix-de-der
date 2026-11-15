// Score card rendering (canvas) and sharing helpers.

const SIZE = 1080;
const DISPLAY_FONT = 'Georgia, "Times New Roman", serif';
const BODY_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const COLORS = { us: '#f4d06f', them: '#ff9d8c', cream: '#fbf5e4', gold: '#f0cd6e' };

function fitFont(ctx, text, maxWidth, size, weight, family) {
  let current = size;
  do {
    ctx.font = `${weight} ${current}px ${family}`;
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

// card: { title, subtitle, footer, winner, us: { name, players, score }, them: {...} }
export function drawScoreCard(card) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  const felt = ctx.createRadialGradient(SIZE / 2, SIZE * 0.3, 60, SIZE / 2, SIZE / 2, SIZE * 0.8);
  felt.addColorStop(0, '#1c7048');
  felt.addColorStop(0.6, '#0f4a30');
  felt.addColorStop(1, '#072a1b');
  ctx.fillStyle = felt;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 5;
  roundedRect(ctx, 40, 40, SIZE - 80, SIZE - 80, 48);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = COLORS.gold;
  ctx.font = `700 78px ${DISPLAY_FONT}`;
  ctx.fillText(card.title, SIZE / 2, 190);

  ctx.fillStyle = 'rgba(251, 245, 228, 0.82)';
  ctx.font = `500 38px ${BODY_FONT}`;
  ctx.fillText(card.subtitle, SIZE / 2, 252);

  const columns = { us: 300, them: 780 };
  for (const team of ['us', 'them']) {
    const x = columns[team];
    const side = card[team];

    if (card.winner === team) {
      ctx.fillStyle = COLORS.gold;
      roundedRect(ctx, x - 130, 330, 260, 62, 31);
      ctx.fill();
      ctx.fillStyle = '#3a2c06';
      ctx.font = `800 34px ${BODY_FONT}`;
      ctx.fillText('VAINQUEUR', x, 373);
    }

    ctx.fillStyle = COLORS[team];
    fitFont(ctx, side.name, 400, 64, 700, DISPLAY_FONT);
    ctx.fillText(side.name, x, 480);

    fitFont(ctx, String(side.score), 420, 210, 700, DISPLAY_FONT);
    ctx.fillText(String(side.score), x, 690);

    ctx.fillStyle = 'rgba(251, 245, 228, 0.82)';
    fitFont(ctx, side.players, 400, 38, 500, BODY_FONT);
    ctx.fillText(side.players, x, 762);
  }

  ctx.strokeStyle = 'rgba(251, 245, 228, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(SIZE / 2, 420);
  ctx.lineTo(SIZE / 2, 770);
  ctx.stroke();

  ctx.fillStyle = COLORS.cream;
  ctx.font = `600 40px ${BODY_FONT}`;
  ctx.fillText(card.footer, SIZE / 2, 900);

  ctx.font = `400 56px ${DISPLAY_FONT}`;
  const suits = [
    ['♠', COLORS.cream],
    ['♥', COLORS.them],
    ['♦', COLORS.them],
    ['♣', COLORS.cream],
  ];
  suits.forEach(([symbol, color], i) => {
    ctx.fillStyle = color;
    ctx.fillText(symbol + '︎', SIZE / 2 - 135 + i * 90, 985);
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
