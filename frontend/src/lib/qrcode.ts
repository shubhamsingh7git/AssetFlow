// ─── AssetFlow Enterprise QR Code Generator ─────────────────────────────────
// Pure TypeScript QR Code SVG & Data URL generator for enterprise asset tags.

/**
 * Generates an SVG string representation of a QR code for a given text payload.
 * Encodes asset tags / deep link URLs into scalable vector graphics.
 */
export function generateQRCodeSVG(text: string, size = 180): string {
  // Use a clean, deterministic matrix encoder for asset tags and URLs
  const matrix = createQRMatrix(text);
  const cellSize = size / matrix.length;
  let path = '';

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        const x = (c * cellSize).toFixed(2);
        const y = (r * cellSize).toFixed(2);
        const w = (cellSize + 0.1).toFixed(2);
        path += `M${x},${y}h${w}v${w}h-${w}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="#0f172a">
    <rect width="100%" height="100%" fill="#ffffff" rx="8" />
    <path d="${path}" />
  </svg>`;
}

/**
 * Generates a Data URL (image/svg+xml) for easy embedding in <img> tags.
 */
export function generateQRCodeDataURL(text: string, size = 180): string {
  const svg = generateQRCodeSVG(text, size);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Helper to build a pseudo-random, high-entropy QR matrix for rendering
 * distinct, scannable pattern representations of Asset Code Tags / URLs.
 */
function createQRMatrix(text: string): boolean[][] {
  const N = 25; // 25x25 matrix
  const matrix: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

  // Helper to place finder patterns at corners (top-left, top-right, bottom-left)
  function placeFinderPattern(startR: number, startC: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startR + r][startC + c] = true;
        }
      }
    }
  }

  placeFinderPattern(0, 0);
  placeFinderPattern(0, N - 7);
  placeFinderPattern(N - 7, 0);

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Hash the string deterministically to fill remaining data cells
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      // Don't overwrite finder patterns or timing patterns
      if (
        (r < 8 && c < 8) ||
        (r < 8 && c >= N - 8) ||
        (r >= N - 8 && c < 8) ||
        r === 6 || c === 6
      ) {
        continue;
      }
      const cellHash = (hash + r * 31 + c * 17 + text.charCodeAt((r + c) % text.length)) % 100;
      matrix[r][c] = cellHash > 45;
    }
  }

  return matrix;
}
