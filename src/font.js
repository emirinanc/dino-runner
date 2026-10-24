// Tiny 3×5 pixel font for the score display.

const GLYPHS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
};

export function textWidth(text, px = 2) {
  return text.length * 4 * px - px;
}

export function drawPixelText(ctx, text, x, y, color, px = 2) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (g) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) if (g[r][c] === '1') ctx.fillRect(cx + c * px, y + r * px, px, px);
      }
    }
    cx += 4 * px;
  }
}
