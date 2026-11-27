import jsQR from 'jsqr';
import { Letter, LETTERS } from './qrCode';

export interface Point2D {
  x: number;
  y: number;
}

export interface QrBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  topLeft?: Point2D;
  topRight?: Point2D;
  bottomRight?: Point2D;
  bottomLeft?: Point2D;
}

export interface DecodedQrResult {
  raw: string;
  location: QrBoundingBox | null;
  rotationQuarterTurns: 0 | 1 | 2 | 3; // CW turns needed to orient sheet upright
}

export interface OmrBubbleReading {
  letter: Letter;
  cx: number;
  cy: number;
  radius: number;
  fillRatio: number;
  meanInk: number;
  score: number;
  marked: boolean;
}

export interface OmrQuestionReading {
  questionNumber: number;
  chosen: Letter | null;
  status: 'marked' | 'blank' | 'ambiguous';
  confidence: number;
  bubbles: OmrBubbleReading[];
}

export interface OmrAnalysisResult {
  sheetDetected: boolean;
  engine: string;
  error?: string;
  rectified: boolean;
  fiducialsFound: boolean;
  workingWidth: number;
  workingHeight: number;
  detectedColumns: number;
  detectedRowsCount: number;
  matchedBubblesCount: number;
  overallConfidence: number;
  markedAnswers: Record<number, Letter | null>;
  ambiguousQuestions: number[];
  blankQuestions: number[];
  questionReadings: OmrQuestionReading[];
  warpedGray?: Uint8Array;
}

export interface OmrAnalyzeOptions {
  totalQuestions: number;
  questionLetters?: Record<number, Letter[]>;
  qrLocation?: QrBoundingBox | null;
  skipPerspectiveWarp?: boolean;
}

interface ComponentBlob {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  area: number;
  cx: number;
  cy: number;
  bw: number;
  bh: number;
  r: number;
}

interface BubbleSlot {
  cx: number;
  cy: number;
  r: number;
  matched: boolean;
}

interface DetectedRowGroup {
  y: number;
  startX: number;
  stepX: number;
  r: number;
  bubbles: ComponentBlob[];
}

interface ColumnCluster {
  startX: number;
  stepX: number;
  medianR: number;
  rows: DetectedRowGroup[];
}

const CANONICAL_W = 1000;
const CANONICAL_H = 1414;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp(Math.floor(sorted.length * p), 0, sorted.length - 1);
  return sorted[idx];
}

function buildIntegralImage(gray: Uint8Array, w: number, h: number): Float64Array {
  const stride = w + 1;
  const integral = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    const rowOff = y * w;
    const iCurr = (y + 1) * stride;
    const iPrev = y * stride;
    for (let x = 0; x < w; x++) {
      rowSum += gray[rowOff + x];
      integral[iCurr + x + 1] = integral[iPrev + x + 1] + rowSum;
    }
  }
  return integral;
}

function boxMean(
  integral: Float64Array,
  w: number,
  h: number,
  x: number,
  y: number,
  radius: number
): number {
  const x0 = x - radius < 0 ? 0 : x - radius;
  const y0 = y - radius < 0 ? 0 : y - radius;
  const x1 = x + radius + 1 > w ? w : x + radius + 1;
  const y1 = y + radius + 1 > h ? h : y + radius + 1;
  const stride = w + 1;
  const sum =
    integral[y1 * stride + x1] -
    integral[y0 * stride + x1] -
    integral[y1 * stride + x0] +
    integral[y0 * stride + x0];
  const area = (x1 - x0) * (y1 - y0);
  return area > 0 ? sum / area : 255;
}

function rgbaToGrayscaleDownsampled(
  rgba: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  maxDim: number,
  qrLocation?: QrBoundingBox | null
): { gray: Uint8Array; w: number; h: number; scale: number; qrBox: QrBoundingBox | null } {
  const longest = Math.max(srcW, srcH);
  const scale = longest > maxDim ? maxDim / longest : 1;
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const gray = new Uint8Array(w * h);

  if (scale === 1) {
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = (rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8;
    }
  } else {
    const invScale = 1 / scale;
    for (let y = 0; y < h; y++) {
      const sy = Math.min(srcH - 1, Math.floor(y * invScale));
      const rowOff = sy * srcW;
      const dstOff = y * w;
      for (let x = 0; x < w; x++) {
        const sx = Math.min(srcW - 1, Math.floor(x * invScale));
        const p = (rowOff + sx) * 4;
        gray[dstOff + x] = (rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8;
      }
    }
  }

  let qrBox: QrBoundingBox | null = null;
  if (qrLocation) {
    qrBox = {
      minX: qrLocation.minX * scale,
      minY: qrLocation.minY * scale,
      maxX: qrLocation.maxX * scale,
      maxY: qrLocation.maxY * scale,
    };
  }

  return { gray, w, h, scale, qrBox };
}

function extractConnectedComponents(
  mask: Uint8Array,
  w: number,
  h: number,
  minArea: number,
  maxArea: number
): ComponentBlob[] {
  const visited = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const blobs: ComponentBlob[] = [];

  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      const idx = rowOff + x;
      if (mask[idx] === 0 || visited[idx] === 1) continue;

      let sp = 0;
      stack[sp++] = idx;
      visited[idx] = 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;
      let sumX = 0;
      let sumY = 0;

      while (sp > 0) {
        const cur = stack[--sp];
        const cy = Math.floor(cur / w);
        const cx = cur - cy * w;
        area++;
        sumX += cx;
        sumY += cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // 8-connected neighbors
        const yMin = cy > 0 ? cy - 1 : 0;
        const yMax = cy < h - 1 ? cy + 1 : h - 1;
        const xMin = cx > 0 ? cx - 1 : 0;
        const xMax = cx < w - 1 ? cx + 1 : w - 1;
        for (let ny = yMin; ny <= yMax; ny++) {
          const nRow = ny * w;
          for (let nx = xMin; nx <= xMax; nx++) {
            const nIdx = nRow + nx;
            if (mask[nIdx] === 1 && visited[nIdx] === 0) {
              visited[nIdx] = 1;
              stack[sp++] = nIdx;
            }
          }
        }
      }

      if (area >= minArea && area <= maxArea) {
        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        blobs.push({
          minX,
          maxX,
          minY,
          maxY,
          area,
          cx: sumX / area,
          cy: sumY / area,
          bw,
          bh,
          r: (bw + bh) / 4,
        });
      }
    }
  }

  return blobs;
}

/**
 * Solves an 8x8 linear system Ax = b via Gaussian elimination with partial pivoting.
 */
function solveLinearSystem8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const val = Math.abs(M[r][col]);
      if (val > maxVal) {
        maxVal = val;
        pivotRow = r;
      }
    }
    if (maxVal < 1e-10) return null;

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];
    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = col; j <= n; j++) {
        M[r][j] -= factor * M[col][j];
      }
    }
  }

  return M.map((row) => row[n]);
}

/**
 * Computes 3x3 homography matrix H mapping dst (u,v) -> src (x,y).
 */
function computeHomography(srcPts: Point2D[], dstPts: Point2D[]): number[] | null {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const u = dstPts[i].x;
    const v = dstPts[i].y;
    const x = srcPts[i].x;
    const y = srcPts[i].y;
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  const h = solveLinearSystem8(A, b);
  if (!h) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function applyHomography(H: number[], x: number, y: number): Point2D {
  const w = H[6] * x + H[7] * y + H[8];
  if (Math.abs(w) < 1e-9) return { x: 0, y: 0 };
  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w,
  };
}

function warpGrayscaleHomography(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  H_dstToSrc: number[]
): Uint8Array {
  const dst = new Uint8Array(dstW * dstH);
  for (let y = 0; y < dstH; y++) {
    const dstRow = y * dstW;
    for (let x = 0; x < dstW; x++) {
      const denom = H_dstToSrc[6] * x + H_dstToSrc[7] * y + H_dstToSrc[8];
      const sx = (H_dstToSrc[0] * x + H_dstToSrc[1] * y + H_dstToSrc[2]) / denom;
      const sy = (H_dstToSrc[3] * x + H_dstToSrc[4] * y + H_dstToSrc[5]) / denom;

      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      if (x0 < 0 || y0 < 0 || x0 >= srcW - 1 || y0 >= srcH - 1) {
        const cx = clamp(Math.round(sx), 0, srcW - 1);
        const cy = clamp(Math.round(sy), 0, srcH - 1);
        dst[dstRow + x] = src[cy * srcW + cx];
        continue;
      }

      const fx = sx - x0;
      const fy = sy - y0;
      const r0 = y0 * srcW + x0;
      const r1 = r0 + srcW;
      const v00 = src[r0];
      const v10 = src[r0 + 1];
      const v01 = src[r1];
      const v11 = src[r1 + 1];
      const top = v00 + (v10 - v00) * fx;
      const bot = v01 + (v11 - v01) * fx;
      dst[dstRow + x] = Math.round(top + (bot - top) * fy);
    }
  }
  return dst;
}

function isInsideBox(cx: number, cy: number, box: QrBoundingBox | null, pad: number): boolean {
  if (!box) return false;
  return (
    cx >= box.minX - pad &&
    cx <= box.maxX + pad &&
    cy >= box.minY - pad &&
    cy <= box.maxY + pad
  );
}

/**
 * Attempts to locate the 4 solid black corner fiducials on Correge A4 answer sheets.
 */
function detectFourCornerFiducials(
  gray: Uint8Array,
  integral: Float64Array,
  w: number,
  h: number,
  qrBox: QrBoundingBox | null
): [Point2D, Point2D, Point2D, Point2D] | null {
  const minDim = Math.min(w, h);
  const bgRad = clamp(Math.round(minDim * 0.04), 18, 46);
  const mask = new Uint8Array(w * h);

  // Only inspect pixels in the 4 outer 22% corner zones for speed
  const zoneW = Math.round(w * 0.23);
  const zoneH = Math.round(h * 0.23);

  for (let y = 0; y < h; y++) {
    if (y > zoneH && y < h - zoneH) continue;
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      if (x > zoneW && x < w - zoneW) continue;
      const g = gray[rowOff + x];
      if (g >= 155) continue;
      const bg = boxMean(integral, w, h, x, y, bgRad);
      if (bg - g > 34) {
        mask[rowOff + x] = 1;
      }
    }
  }

  const minArea = Math.max(18, Math.round(w * h * 0.000045));
  const maxArea = Math.round(w * h * 0.0035);
  const blobs = extractConnectedComponents(mask, w, h, minArea, maxArea);

  const squareCandidates = blobs.filter((b) => {
    if (isInsideBox(b.cx, b.cy, qrBox, 12)) return false;
    const fill = b.area / (b.bw * b.bh);
    const aspect = b.bw / b.bh;
    // Solid black square (or TL square + asymmetric orientation bar merged slightly)
    return fill >= 0.62 && aspect >= 0.55 && aspect <= 1.95 && b.bw >= 5 && b.bh >= 5;
  });

  if (squareCandidates.length < 4) return null;

  const corners: Array<{ targetX: number; targetY: number; filter: (b: ComponentBlob) => boolean }> = [
    { targetX: 0, targetY: 0, filter: (b) => b.cx < zoneW && b.cy < zoneH },
    { targetX: w, targetY: 0, filter: (b) => b.cx > w - zoneW && b.cy < zoneH },
    { targetX: w, targetY: h, filter: (b) => b.cx > w - zoneW && b.cy > h - zoneH },
    { targetX: 0, targetY: h, filter: (b) => b.cx < zoneW && b.cy > h - zoneH },
  ];

  const picked: Point2D[] = [];
  const pickedSizes: number[] = [];

  for (const c of corners) {
    const inZone = squareCandidates.filter(c.filter);
    if (inZone.length === 0) return null;
    // Choose the solid square closest to the outer corner with good squareness
    inZone.sort((a, b) => {
      const distA = Math.hypot(a.cx - c.targetX, a.cy - c.targetY);
      const distB = Math.hypot(b.cx - c.targetX, b.cy - c.targetY);
      return distA - distB;
    });
    const best = inZone[0];
    picked.push({ x: best.cx, y: best.cy });
    pickedSizes.push(Math.sqrt(best.area));
  }

  // Consistency check: fiducial sizes should be reasonably similar
  const minS = Math.min(...pickedSizes);
  const maxS = Math.max(...pickedSizes);
  if (maxS / Math.max(1, minS) > 2.4) return null;

  const [tl, tr, br, bl] = picked;
  const topW = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const botW = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightH = Math.hypot(br.x - tr.x, br.y - tr.y);

  if (topW < w * 0.45 || botW < w * 0.45 || leftH < h * 0.45 || rightH < h * 0.45) return null;
  if (Math.max(topW, botW) / Math.min(topW, botW) > 1.45) return null;
  if (Math.max(leftH, rightH) / Math.min(leftH, rightH) > 1.45) return null;

  const avgW = (topW + botW) / 2;
  const avgH = (leftH + rightH) / 2;
  const sheetRatio = avgH / Math.max(1, avgW);
  if (sheetRatio < 1.1 || sheetRatio > 1.78) return null;

  return [tl, tr, br, bl];
}

/**
 * Checks if a blob has dark pixels around its perimeter (hollow circle OR solid filled circle).
 */
function hasCircularPerimeter(
  mask: Uint8Array,
  w: number,
  h: number,
  blob: ComponentBlob
): boolean {
  const cx = (blob.minX + blob.maxX) / 2;
  const cy = (blob.minY + blob.maxY) / 2;
  const rx = blob.bw / 2;
  const ry = blob.bh / 2;

  let hits = 0;
  const samples = 12;
  for (let i = 0; i < samples; i++) {
    const theta = (i * Math.PI * 2) / samples;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    let found = false;
    for (let radialFactor = 0.72; radialFactor <= 1.08; radialFactor += 0.12) {
      const px = Math.round(cx + cos * rx * radialFactor);
      const py = Math.round(cy + sin * ry * radialFactor);
      if (px >= 0 && px < w && py >= 0 && py < h && mask[py * w + px] === 1) {
        found = true;
        break;
      }
    }
    if (found) hits++;
  }

  if (hits < 9) return false;

  // Reject solid squares unless heavily filled (pen bleed)
  const bboxFill = blob.area / (blob.bw * blob.bh);
  if (bboxFill < 0.72) {
    let cornersDark = 0;
    const diagAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    for (const a of diagAngles) {
      const px = Math.round(cx + Math.cos(a) * rx * 1.18);
      const py = Math.round(cy + Math.sin(a) * ry * 1.18);
      if (px >= 0 && px < w && py >= 0 && py < h && mask[py * w + px] === 1) {
        cornersDark++;
      }
    }
    // Pure rectangles hit all 4 outer diagonal corners
    if (cornersDark >= 4) return false;
  }

  return true;
}

/**
 * Finds candidate bubble radius modes among circular candidates.
 * Returns the dominant mode plus up to 2 distinct secondary modes so small exams (1-3 questions)
 * cannot be hijacked by smaller printed text characters.
 */
function findCandidateBubbleRadii(cands: ComponentBlob[]): number[] {
  if (cands.length === 0) return [];
  const binSize = 1.5;
  const bins = new Map<number, ComponentBlob[]>();

  for (const c of cands) {
    const bin = Math.round(c.r / binSize);
    for (const b of [bin - 1, bin, bin + 1]) {
      const list = bins.get(b) || [];
      list.push(c);
      bins.set(b, list);
    }
  }

  const ranked = Array.from(bins.values())
    .filter((list) => list.length >= 2)
    .map((list) => ({
      count: list.length,
      r: median(list.map((b) => b.r)),
    }))
    .sort((a, b) => b.count - a.count || b.r - a.r);

  const selected: number[] = [];
  for (const item of ranked) {
    if (selected.every((existing) => Math.abs(existing - item.r) > Math.max(2.0, existing * 0.22))) {
      selected.push(item.r);
      if (selected.length >= 3) break;
    }
  }

  if (selected.length === 0) {
    selected.push(median(cands.map((b) => b.r)));
  }

  return selected;
}

/**
 * Discovers regular horizontal bubble groups and column clusters from circular bubble blobs.
 */
function discoverBubbleColumns(
  cands: ComponentBlob[],
  modeR: number,
  expectedMaxLetters: number
): ColumnCluster[] {
  if (cands.length < 2 || modeR <= 0) return [];

  // 1. Cluster blobs into horizontal bands by Y
  const sortedByY = [...cands].sort((a, b) => a.cy - b.cy);
  const yBands: ComponentBlob[][] = [];
  const yTol = Math.max(4, modeR * 0.78);

  for (const b of sortedByY) {
    let placed = false;
    for (let i = yBands.length - 1; i >= 0; i--) {
      const band = yBands[i];
      const bandY = band.reduce((acc, item) => acc + item.cy, 0) / band.length;
      if (Math.abs(b.cy - bandY) <= yTol) {
        band.push(b);
        placed = true;
        break;
      }
      if (b.cy - bandY > yTol * 2) break;
    }
    if (!placed) {
      yBands.push([b]);
    }
  }

  // 2. Estimate the dominant horizontal stepX between adjacent bubbles within the same question
  const adjacentDxs: number[] = [];
  for (const band of yBands) {
    if (band.length < 2) continue;
    band.sort((a, b) => a.cx - b.cx);
    for (let i = 1; i < band.length; i++) {
      const dx = band[i].cx - band[i - 1].cx;
      if (dx >= modeR * 2.1 && dx <= modeR * 5.0) {
        adjacentDxs.push(dx);
      }
    }
  }

  if (adjacentDxs.length === 0) return [];
  const globalStepX = median(adjacentDxs);

  // 3. Split each horizontal band into question-row groups whenever gap > 1.75 * globalStepX
  const rowGroups: DetectedRowGroup[] = [];
  for (const band of yBands) {
    if (band.length < 2) continue;
    band.sort((a, b) => a.cx - b.cx);

    // Deduplicate overlapping blobs (same bubble detected twice)
    const deduped: ComponentBlob[] = [band[0]];
    for (let i = 1; i < band.length; i++) {
      const prev = deduped[deduped.length - 1];
      if (band[i].cx - prev.cx < modeR * 1.2) {
        // Keep the larger / cleaner one
        if (band[i].area > prev.area) deduped[deduped.length - 1] = band[i];
      } else {
        deduped.push(band[i]);
      }
    }

    let current: ComponentBlob[] = [deduped[0]];
    const flushGroup = (grp: ComponentBlob[]) => {
      if (grp.length < 2) return;
      const spanSteps = Math.round((grp[grp.length - 1].cx - grp[0].cx) / globalStepX) + 1;
      if (spanSteps < 2 || spanSteps > expectedMaxLetters + 1) return;

      // Verify all spacings inside group are near integer multiples of globalStepX
      let consistent = true;
      const localSteps: number[] = [];
      for (let i = 1; i < grp.length; i++) {
        const dx = grp[i].cx - grp[i - 1].cx;
        const mult = Math.max(1, Math.round(dx / globalStepX));
        if (mult > 2) {
          consistent = false;
          break;
        }
        const unit = dx / mult;
        if (Math.abs(unit - globalStepX) > globalStepX * 0.28) {
          consistent = false;
          break;
        }
        localSteps.push(unit);
      }
      if (!consistent || localSteps.length === 0) return;

      rowGroups.push({
        y: median(grp.map((b) => b.cy)),
        startX: grp[0].cx,
        stepX: median(localSteps),
        r: median(grp.map((b) => b.r)),
        bubbles: grp,
      });
    };

    for (let i = 1; i < deduped.length; i++) {
      const dx = deduped[i].cx - deduped[i - 1].cx;
      // Allow up to 1 missing bubble gap (2 * globalStepX) ONLY if current group wouldn't exceed expectedMaxLetters
      const projectedSpan =
        Math.round((deduped[i].cx - current[0].cx) / globalStepX) + 1;
      if (dx <= globalStepX * 2.25 && projectedSpan <= expectedMaxLetters) {
        current.push(deduped[i]);
      } else {
        flushGroup(current);
        current = [deduped[i]];
      }
    }
    flushGroup(current);
  }

  if (rowGroups.length === 0) return [];

  // 4. Cluster rowGroups into vertical columns by startX
  // Handle the case where bubble 'A' was missing in one row by checking if startX is shifted by +1*stepX
  const sortedByX = [...rowGroups].sort((a, b) => a.startX - b.startX);
  const columns: ColumnCluster[] = [];
  const colXTol = globalStepX * 0.72;

  for (const rg of sortedByX) {
    let bestCol: ColumnCluster | null = null;
    let bestDiff = Infinity;

    for (const col of columns) {
      const diffExact = Math.abs(rg.startX - col.startX);
      const diffShifted = Math.abs(rg.startX - (col.startX + col.stepX));
      const diff = Math.min(diffExact, diffShifted < colXTol * 0.6 && rg.bubbles.length < expectedMaxLetters ? diffShifted : Infinity);
      if (diff < colXTol && diff < bestDiff) {
        bestDiff = diff;
        bestCol = col;
      }
    }

    if (bestCol) {
      bestCol.rows.push(rg);
      // Keep canonical startX as the 25th percentile (anchor on rows where letter A was detected)
      bestCol.startX = percentile(
        bestCol.rows.map((r) => r.startX),
        0.25
      );
      bestCol.stepX = median(bestCol.rows.map((r) => r.stepX));
      bestCol.medianR = median(bestCol.rows.map((r) => r.r));
    } else {
      columns.push({
        startX: rg.startX,
        stepX: rg.stepX,
        medianR: rg.r,
        rows: [rg],
      });
    }
  }

  // Sort columns left-to-right and rows top-to-bottom within each column
  columns.sort((a, b) => a.startX - b.startX);
  for (const col of columns) {
    col.rows.sort((a, b) => a.y - b.y);
  }

  return columns;
}

/**
 * Samples inner-core ink vs surrounding local paper white for one circular bubble.
 */
function measureBubbleInk(
  gray: Uint8Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  r: number
): { fillRatio: number; meanInk: number; score: number } {
  const outerMinSq = (r * 1.24) * (r * 1.24);
  const outerMaxSq = (r * 1.72) * (r * 1.72);
  const coreMaxSq = (r * 0.66) * (r * 0.66);

  const ringSamples: number[] = [];
  const radOuter = Math.ceil(r * 1.75);
  const yMinO = clamp(Math.floor(cy - radOuter), 0, h - 1);
  const yMaxO = clamp(Math.ceil(cy + radOuter), 0, h - 1);
  const xMinO = clamp(Math.floor(cx - radOuter), 0, w - 1);
  const xMaxO = clamp(Math.ceil(cx + radOuter), 0, w - 1);

  for (let y = yMinO; y <= yMaxO; y += 2) {
    const dy = y - cy;
    const dy2 = dy * dy;
    const rowOff = y * w;
    for (let x = xMinO; x <= xMaxO; x += 2) {
      const dx = x - cx;
      const d2 = dx * dx + dy2;
      if (d2 >= outerMinSq && d2 <= outerMaxSq) {
        ringSamples.push(gray[rowOff + x]);
      }
    }
  }

  // 80th percentile of surrounding ring reliably captures clean paper brightness even near shadows/neighbors
  const localPaperWhite = clamp(
    ringSamples.length > 0 ? percentile(ringSamples, 0.8) : 230,
    80,
    255
  );

  const radCore = Math.ceil(r * 0.7);
  const yMinC = clamp(Math.floor(cy - radCore), 0, h - 1);
  const yMaxC = clamp(Math.ceil(cy + radCore), 0, h - 1);
  const xMinC = clamp(Math.floor(cx - radCore), 0, w - 1);
  const xMaxC = clamp(Math.ceil(cx + radCore), 0, w - 1);

  let coreCount = 0;
  let darkCount = 0;
  let inkSum = 0;

  for (let y = yMinC; y <= yMaxC; y++) {
    const dy = y - cy;
    const dy2 = dy * dy;
    const rowOff = y * w;
    for (let x = xMinC; x <= xMaxC; x++) {
      const dx = x - cx;
      if (dx * dx + dy2 > coreMaxSq) continue;

      const g = gray[rowOff + x];
      const diff = localPaperWhite - g;
      const norm = diff > 0 ? diff / Math.max(45, localPaperWhite) : 0;
      inkSum += norm;
      if (norm > 0.24 || diff > 34) {
        darkCount++;
      }
      coreCount++;
    }
  }

  if (coreCount === 0) {
    return { fillRatio: 0, meanInk: 0, score: 0 };
  }

  const fillRatio = darkCount / coreCount;
  const meanInk = inkSum / coreCount;
  const score = 0.65 * fillRatio + 0.35 * Math.min(1, meanInk * 1.6);

  return {
    fillRatio: Number(fillRatio.toFixed(4)),
    meanInk: Number(meanInk.toFixed(4)),
    score: Number(score.toFixed(4)),
  };
}

/**
 * Pure TypeScript OMR engine that analyzes raw RGBA pixel data (works identically in Browser & Node.js).
 * NEVER guesses answers: returns sheetDetected=false when no real answer-sheet bubble grid exists,
 * returns null for blank questions, and flags double-marked/smudged questions as ambiguous.
 */
export function analyzeAnswerSheetPixels(
  rgba: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  options: OmrAnalyzeOptions
): OmrAnalysisResult {
  const totalQuestions = Math.max(1, Math.min(200, Math.floor(options.totalQuestions || 0)));

  const emptyFailure = (error: string, w = srcW, h = srcH): OmrAnalysisResult => ({
    sheetDetected: false,
    engine: 'Correge Native TypeScript OMR v2',
    error,
    rectified: false,
    fiducialsFound: false,
    workingWidth: w,
    workingHeight: h,
    detectedColumns: 0,
    detectedRowsCount: 0,
    matchedBubblesCount: 0,
    overallConfidence: 0,
    markedAnswers: {},
    ambiguousQuestions: [],
    blankQuestions: [],
    questionReadings: [],
  });

  if (!rgba || rgba.length < srcW * srcH * 4 || srcW < 80 || srcH < 80) {
    return emptyFailure('Imagem muito pequena ou inválida para leitura óptica do gabarito.');
  }

  // Stage A: Downsample to fast working resolution
  const ds = rgbaToGrayscaleDownsampled(rgba, srcW, srcH, 1280, options.qrLocation);
  let gray = ds.gray;
  let w = ds.w;
  let h = ds.h;
  let qrBox = ds.qrBox;
  let rectified = false;
  let fiducialsFound = false;

  // Stage B: Detect 4 corner fiducials & perspective-warp to canonical 1000x1414 A4 space
  const initialIntegral = buildIntegralImage(gray, w, h);
  if (!options.skipPerspectiveWarp) {
    const fiducials = detectFourCornerFiducials(gray, initialIntegral, w, h, qrBox);
    if (fiducials) {
      fiducialsFound = true;
      // Canonical fiducial centers match the ~16px inset of A4 sheets
      const padX = 24;
      const padY = 24;
      const dstPts: Point2D[] = [
        { x: padX, y: padY },
        { x: CANONICAL_W - padX, y: padY },
        { x: CANONICAL_W - padX, y: CANONICAL_H - padY },
        { x: padX, y: CANONICAL_H - padY },
      ];
      const H_dstToSrc = computeHomography(fiducials, dstPts);
      const H_srcToDst = computeHomography(dstPts, fiducials);

      if (H_dstToSrc && H_srcToDst) {
        gray = warpGrayscaleHomography(gray, w, h, CANONICAL_W, CANONICAL_H, H_dstToSrc);
        if (qrBox) {
          const p1 = applyHomography(H_srcToDst, qrBox.minX, qrBox.minY);
          const p2 = applyHomography(H_srcToDst, qrBox.maxX, qrBox.minY);
          const p3 = applyHomography(H_srcToDst, qrBox.maxX, qrBox.maxY);
          const p4 = applyHomography(H_srcToDst, qrBox.minX, qrBox.maxY);
          qrBox = {
            minX: Math.min(p1.x, p2.x, p3.x, p4.x),
            minY: Math.min(p1.y, p2.y, p3.y, p4.y),
            maxX: Math.max(p1.x, p2.x, p3.x, p4.x),
            maxY: Math.max(p1.y, p2.y, p3.y, p4.y),
          };
        }
        w = CANONICAL_W;
        h = CANONICAL_H;
        rectified = true;
      }
    }
  }

  // Stage C: Shadow-immune adaptive dark mask on working image
  const integral = rectified ? buildIntegralImage(gray, w, h) : initialIntegral;
  const minDim = Math.min(w, h);
  const bgRad = clamp(Math.round(minDim * 0.032), 18, 42);
  const darkMask = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      const g = gray[rowOff + x];
      if (g >= 210) continue;
      const bg = boxMean(integral, w, h, x, y, bgRad);
      if (bg - g > 20) {
        darkMask[rowOff + x] = 1;
      }
    }
  }

  // Stage D: Extract circular bubble candidates within the valid answer-grid ROI
  // Exclude institutional header (title, CADERNO bubbles, student info, instructions) & bottom OMR-ALIGN bar
  const minDia = rectified
    ? Math.max(15, Math.round(minDim * 0.016))
    : Math.max(11, Math.round(minDim * 0.015));
  const maxDia = Math.round(minDim * 0.075);
  const minArea = Math.max(18, Math.round(minDia * 1.5));
  const maxArea = Math.round(maxDia * maxDia * 1.05);
  const allBlobs = extractConnectedComponents(darkMask, w, h, minArea, maxArea);

  const borderPadX = Math.round(w * 0.015);
  const borderPadY = Math.round(h * 0.015);
  let minGridY = rectified ? Math.round(h * 0.165) : borderPadY;
  const maxGridY = rectified ? Math.round(h * 0.935) : h - borderPadY;

  // When the QR code is located in the upper header strip, answer bubbles always start well below it
  if (qrBox && qrBox.maxY < h * 0.45) {
    const qrH = Math.max(1, qrBox.maxY - qrBox.minY);
    minGridY = Math.max(minGridY, Math.round(qrBox.maxY + qrH * 0.35));
  }

  const rawCircleCands = allBlobs.filter((b) => {
    if (b.minX <= borderPadX || b.maxX >= w - borderPadX) return false;
    if (b.cy < minGridY || b.cy > maxGridY) return false;
    if (b.minY <= borderPadY || b.maxY >= h - borderPadY) return false;
    if (isInsideBox(b.cx, b.cy, qrBox, 10)) return false;
    if (b.bw < minDia || b.bh < minDia || b.bw > maxDia || b.bh > maxDia) return false;

    const aspect = b.bw / b.bh;
    if (aspect < 0.75 || aspect > 1.33) return false;

    const bboxFill = b.area / (b.bw * b.bh);
    if (bboxFill < 0.14 || bboxFill > 0.94) return false;

    return hasCircularPerimeter(darkMask, w, h, b);
  });

  if (rawCircleCands.length < Math.max(2, Math.min(totalQuestions * 2, 10))) {
    return emptyFailure(
      'Nenhuma grade de bolhas do cartão-resposta foi detectada na imagem. Enquadre a folha inteira em local bem iluminado.',
      w,
      h
    );
  }

  // Determine max letters across expected questions
  let expectedMaxLetters = 5;
  if (options.questionLetters) {
    const lens = Object.values(options.questionLetters).map((arr) => arr.length);
    if (lens.length > 0) expectedMaxLetters = Math.max(2, ...lens);
  }

  // Stage E: Discover bubble rows & column clusters across candidate bubble radii
  const candidateRadii = findCandidateBubbleRadii(rawCircleCands);
  const maxExpectedCols = Math.min(
    totalQuestions,
    totalQuestions > 75 ? 4 : totalQuestions > 25 ? 3 : 2
  );
  const minRequiredRows = Math.max(1, Math.ceil(totalQuestions * 0.45));
  const minRequiredBubbles = Math.max(2, Math.ceil(totalQuestions * 1.5));

  const pruneAndScoreColumns = (rawCols: ColumnCluster[], candR: number) => {
    let cols = rawCols.map((c) => ({ ...c, rows: [...c.rows] }));
    if (cols.length === 0) {
      return { cols, rowsCount: 0, bubblesCount: 0, score: -1 };
    }

    const verticalSteps: number[] = [];
    for (const col of cols) {
      for (let i = 1; i < col.rows.length; i++) {
        const dy = col.rows[i].y - col.rows[i - 1].y;
        if (dy >= candR * 1.8 && dy <= candR * 6.5) {
          verticalSteps.push(dy);
        }
      }
    }
    const globalRowStepY = verticalSteps.length > 0 ? median(verticalSteps) : candR * 3.0;

    // Trim top outlier header row if it sits far above the main column start
    if (totalQuestions >= 4) {
      for (const col of cols) {
        if (col.rows.length >= 3) {
          const firstGap = col.rows[1].y - col.rows[0].y;
          if (firstGap > globalRowStepY * 2.4) {
            const otherTops = cols
              .filter((c) => c !== col && c.rows.length >= 2)
              .map((c) => c.rows[0].y);
            if (
              otherTops.length === 0 ||
              Math.abs(col.rows[1].y - median(otherTops)) <
                Math.abs(col.rows[0].y - median(otherTops))
            ) {
              col.rows.shift();
            }
          }
        }
      }
    }

    // Score columns by row count, closeness to expectedMaxLetters bubbles per row, and bubble radius
    if (cols.length > maxExpectedCols) {
      const colQuality = (col: ColumnCluster) => {
        const avgBubbles =
          col.rows.reduce((acc, r) => acc + r.bubbles.length, 0) / Math.max(1, col.rows.length);
        const exactMatchBonus = col.rows.filter(
          (r) => r.bubbles.length === expectedMaxLetters
        ).length;
        return (
          col.rows.length * 100 +
          exactMatchBonus * 35 +
          avgBubbles * 12 +
          col.medianR * 2
        );
      };
      cols.sort((a, b) => colQuality(b) - colQuality(a));
      cols = cols.slice(0, maxExpectedCols).sort((a, b) => a.startX - b.startX);
    }

    cols = cols.filter((c) => c.rows.length > 0);
    const rowsCount = cols.reduce((acc, c) => acc + c.rows.length, 0);
    const bubblesCount = cols.reduce(
      (acc, c) => acc + c.rows.reduce((rAcc, r) => rAcc + r.bubbles.length, 0),
      0
    );

    const exactRowMatches = cols.reduce(
      (acc, c) => acc + c.rows.filter((r) => r.bubbles.length === expectedMaxLetters).length,
      0
    );
    const avgStepRatio =
      cols.length > 0
        ? median(cols.map((c) => c.stepX / Math.max(1, c.medianR)))
        : 0;
    const stepRatioBonus = avgStepRatio >= 2.25 && avgStepRatio <= 4.2 ? 40 : 0;
    const meetsMinimum = rowsCount >= minRequiredRows && bubblesCount >= minRequiredBubbles;
    const clampedRows = Math.min(rowsCount, totalQuestions);
    const score =
      (meetsMinimum ? 1000 : 0) +
      clampedRows * 60 +
      exactRowMatches * 30 +
      Math.min(bubblesCount, totalQuestions * expectedMaxLetters) * 5 +
      stepRatioBonus +
      candR * 2;

    return { cols, rowsCount, bubblesCount, score };
  };

  let modeR = candidateRadii[0] || 0;
  let columns: ColumnCluster[] = [];
  let bestScore = -1;

  for (const candR of candidateRadii) {
    const sized = rawCircleCands.filter(
      (b) => b.r >= candR * 0.68 && b.r <= candR * 1.42
    );
    const discovered = discoverBubbleColumns(sized, candR, expectedMaxLetters);
    const evaluated = pruneAndScoreColumns(discovered, candR);
    if (evaluated.score > bestScore) {
      bestScore = evaluated.score;
      columns = evaluated.cols;
      modeR = candR;
    }
  }

  const totalDetectedRows = columns.reduce((acc, c) => acc + c.rows.length, 0);
  const totalMatchedBubbles = columns.reduce(
    (acc, c) => acc + c.rows.reduce((rAcc, r) => rAcc + r.bubbles.length, 0),
    0
  );

  // Strict verification: reject non-answer-sheet images!
  if (
    columns.length === 0 ||
    totalDetectedRows < minRequiredRows ||
    totalMatchedBubbles < minRequiredBubbles
  ) {
    return emptyFailure(
      `Grade do gabarito incompleta ou não identificada (${totalDetectedRows} de ${totalQuestions} linhas detectadas). Centralize o cartão-resposta e evite sombras fortes.`,
      w,
      h
    );
  }

  // Compute canonical vertical spacing rowStepY and topY across columns
  const allDys: number[] = [];
  for (const col of columns) {
    for (let i = 1; i < col.rows.length; i++) {
      const dy = col.rows[i].y - col.rows[i - 1].y;
      if (dy >= modeR * 1.8 && dy <= modeR * 6.5) {
        allDys.push(dy);
      }
    }
  }
  const rowStepY = allDys.length > 0 ? median(allDys) : modeR * 3.0;
  const topY = median(columns.map((c) => c.rows[0].y));

  // Determine questions per column (column-major layout matching A4AnswerSheet & PDF services)
  const numCols = columns.length;
  const perCol = Math.ceil(totalQuestions / numCols);

  // Stage F: Map each question 1..totalQuestions -> exact bubble coordinates & measure ink
  const markedAnswers: Record<number, Letter | null> = {};
  const ambiguousQuestions: number[] = [];
  const blankQuestions: number[] = [];
  const questionReadings: OmrQuestionReading[] = [];
  const confidences: number[] = [];

  for (let qNum = 1; qNum <= totalQuestions; qNum++) {
    const colIdx = Math.min(numCols - 1, Math.floor((qNum - 1) / perCol));
    const rowInCol = (qNum - 1) % perCol;
    const col = columns[colIdx];
    const letters: Letter[] =
      options.questionLetters?.[qNum] && options.questionLetters[qNum].length >= 2
        ? options.questionLetters[qNum]
        : LETTERS;

    const expectedY = topY + rowInCol * rowStepY;

    // Find closest detected row in this column within 0.45 * rowStepY
    let matchedRow: DetectedRowGroup | null = null;
    let bestRowDist = Infinity;
    for (const rg of col.rows) {
      const dist = Math.abs(rg.y - expectedY);
      if (dist < rowStepY * 0.48 && dist < bestRowDist) {
        bestRowDist = dist;
        matchedRow = rg;
      }
    }

    const rowY = matchedRow ? matchedRow.y : expectedY;
    const rowStepX = matchedRow ? matchedRow.stepX : col.stepX;
    const bubbleR = matchedRow ? matchedRow.r : col.medianR;

    // Build exact slot positions for each letter (snap to detected blob if available, else interpolate)
    const slots: BubbleSlot[] = letters.map((_, lIdx) => {
      const predX = col.startX + lIdx * rowStepX;
      if (matchedRow) {
        let bestBlob: ComponentBlob | null = null;
        let bestDx = Infinity;
        for (const b of matchedRow.bubbles) {
          const dx = Math.abs(b.cx - predX);
          if (dx < rowStepX * 0.42 && dx < bestDx) {
            bestDx = dx;
            bestBlob = b;
          }
        }
        if (bestBlob) {
          return { cx: bestBlob.cx, cy: bestBlob.cy, r: bestBlob.r, matched: true };
        }
      }
      return { cx: predX, cy: rowY, r: bubbleR, matched: false };
    });

    // Measure inner-core ink for each alternative
    const rawReadings = letters.map((letter, idx) => {
      const s = slots[idx];
      const m = measureBubbleInk(gray, w, h, s.cx, s.cy, s.r);
      return {
        letter,
        cx: s.cx,
        cy: s.cy,
        radius: s.r,
        fillRatio: m.fillRatio,
        meanInk: m.meanInk,
        score: m.score,
        marked: false,
      };
    });

    // Per-question adaptive baseline from unmarked alternatives
    const sortedScores = [...rawReadings].sort((a, b) => b.score - a.score);
    const bottomSlice =
      sortedScores.length >= 4
        ? sortedScores.slice(2).map((r) => r.score)
        : sortedScores.slice(1).map((r) => r.score);
    const unmarkedBaseline = bottomSlice.length > 0 ? median(bottomSlice) : 0.15;

    const absFloor = 0.40;
    const relMargin = 0.19;

    const markedList = rawReadings.filter(
      (r) => r.score >= absFloor && r.score - unmarkedBaseline >= relMargin
    );

    let chosen: Letter | null = null;
    let status: 'marked' | 'blank' | 'ambiguous' = 'blank';
    let qConf = 0.9;

    if (markedList.length === 0) {
      chosen = null;
      status = 'blank';
      blankQuestions.push(qNum);
      // High confidence it's truly blank if top score is clearly below threshold
      qConf = clamp(1 - Math.max(0, sortedScores[0].score - unmarkedBaseline), 0.65, 0.99);
    } else if (markedList.length === 1) {
      chosen = markedList[0].letter;
      markedList[0].marked = true;
      status = 'marked';
      const runnerUp = sortedScores[1]?.score ?? unmarkedBaseline;
      qConf = clamp(0.65 + (markedList[0].score - runnerUp) * 0.8, 0.65, 0.99);
    } else {
      // Multiple bubbles exceeded floor: distinguish clear dominance (tiny smudge) vs true rasura/dupla marcação
      const top1 = sortedScores[0];
      const top2 = sortedScores[1];
      if (top1.score - top2.score >= 0.28 && top2.score < 0.48) {
        chosen = top1.letter;
        top1.marked = true;
        status = 'marked';
        qConf = clamp(0.62 + (top1.score - top2.score) * 0.6, 0.62, 0.92);
      } else {
        // True double mark / rasura -> NEVER guess!
        markedList.forEach((m) => {
          m.marked = true;
        });
        chosen = null;
        status = 'ambiguous';
        ambiguousQuestions.push(qNum);
        qConf = 0.4;
      }
    }

    markedAnswers[qNum] = chosen;
    confidences.push(qConf);
    questionReadings.push({
      questionNumber: qNum,
      chosen,
      status,
      confidence: Number(qConf.toFixed(2)),
      bubbles: rawReadings,
    });
  }

  const overallConfidence =
    confidences.length > 0
      ? Number((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2))
      : 0;

  return {
    sheetDetected: true,
    engine: 'Correge Native TypeScript OMR v2',
    rectified,
    fiducialsFound,
    workingWidth: w,
    workingHeight: h,
    detectedColumns: numCols,
    detectedRowsCount: totalDetectedRows,
    matchedBubblesCount: totalMatchedBubbles,
    overallConfidence,
    markedAnswers,
    ambiguousQuestions,
    blankQuestions,
    questionReadings,
    warpedGray: rectified ? gray : undefined,
  };
}

// ============================================================================
// Browser Canvas Helpers (QR Decoding + Upright Rotation + Visual Overlay)
// ============================================================================

function computeRotationTurnsFromQrCorners(loc: {
  topLeftCorner: Point2D;
  topRightCorner: Point2D;
  bottomRightCorner: Point2D;
  bottomLeftCorner: Point2D;
}): 0 | 1 | 2 | 3 {
  const dx = loc.topRightCorner.x - loc.topLeftCorner.x;
  const dy = loc.topRightCorner.y - loc.topLeftCorner.y;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Angle ~0° -> upright (0 turns)
  // Angle ~+90° (pointing down) -> needs 270° CW (3 turns) to become upright
  // Angle ~±180° (upside down) -> needs 180° CW (2 turns)
  // Angle ~-90° (pointing up) -> needs 90° CW (1 turn)
  if (angleDeg > 45 && angleDeg <= 135) return 3;
  if (angleDeg > 135 || angleDeg < -135) return 2;
  if (angleDeg >= -135 && angleDeg < -45) return 1;
  return 0;
}

function buildQrBoundingBox(
  loc: {
    topLeftCorner: Point2D;
    topRightCorner: Point2D;
    bottomRightCorner: Point2D;
    bottomLeftCorner: Point2D;
  },
  offsetX: number,
  offsetY: number,
  scaleInv: number
): QrBoundingBox {
  const mapPt = (p: Point2D): Point2D => ({
    x: (p.x + offsetX) * scaleInv,
    y: (p.y + offsetY) * scaleInv,
  });
  const tl = mapPt(loc.topLeftCorner);
  const tr = mapPt(loc.topRightCorner);
  const br = mapPt(loc.bottomRightCorner);
  const bl = mapPt(loc.bottomLeftCorner);
  return {
    minX: Math.min(tl.x, tr.x, br.x, bl.x),
    minY: Math.min(tl.y, tr.y, br.y, bl.y),
    maxX: Math.max(tl.x, tr.x, br.x, bl.x),
    maxY: Math.max(tl.y, tr.y, br.y, bl.y),
    topLeft: tl,
    topRight: tr,
    bottomRight: br,
    bottomLeft: bl,
  };
}

function enhanceImageDataContrast(data: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  let minL = 255;
  let maxL = 0;
  for (let i = 0; i < data.length; i += 4) {
    const l = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    if (l < minL) minL = l;
    if (l > maxL) maxL = l;
  }
  const range = Math.max(1, maxL - minL);
  for (let i = 0; i < data.length; i += 4) {
    const l = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    const stretched = ((l - minL) * 255) / range;
    const v = stretched < 128 ? Math.max(0, stretched * 0.55) : Math.min(255, 128 + (stretched - 128) * 1.45);
    out[i] = v;
    out[i + 1] = v;
    out[i + 2] = v;
    out[i + 3] = 255;
  }
  return out;
}

/**
 * Multi-region, multi-contrast QR decoder for live camera frames and uploaded photos.
 */
/**
 * Decodes the QR from the working canvas and, when that fails, retries on a higher-resolution
 * copy of the original photo. The working canvas is downscaled to ~1600px for OMR, which leaves
 * the small, dense QR of a full-sheet photo with too few pixels per module. The returned location
 * is always expressed in the working canvas coordinates.
 */
export async function decodeQrWithHiResFallback(
  workingCanvas: HTMLCanvasElement,
  source: CanvasImageSource & { width: number; height: number },
  maxDim = 3200
): Promise<DecodedQrResult | null> {
  const direct = await decodeQrFromCanvas(workingCanvas);
  if (direct) return direct;

  const hiScale = Math.min(1, maxDim / Math.max(source.width, source.height));
  const hiW = Math.max(1, Math.round(source.width * hiScale));
  const hiH = Math.max(1, Math.round(source.height * hiScale));
  if (hiW <= workingCanvas.width) return null; // no extra resolution available

  const hiCanvas = document.createElement('canvas');
  hiCanvas.width = hiW;
  hiCanvas.height = hiH;
  const hiCtx = hiCanvas.getContext('2d', { willReadFrequently: true });
  if (!hiCtx) return null;
  hiCtx.imageSmoothingEnabled = true;
  hiCtx.imageSmoothingQuality = 'high';
  hiCtx.drawImage(source, 0, 0, hiW, hiH);

  // The QR sits in the top-right corner of Correge sheets (or bottom-left when upside down).
  // Crop those corners at full resolution so the scan is not downscaled again.
  let hit: DecodedQrResult | null = null;
  let offX = 0;
  let offY = 0;
  const cropW = Math.round(hiW * 0.5);
  const cropH = Math.round(hiH * 0.35);
  for (const [x, y] of [
    [hiW - cropW, 0],
    [0, hiH - cropH],
  ]) {
    const crop = document.createElement('canvas');
    crop.width = cropW;
    crop.height = cropH;
    const cctx = crop.getContext('2d', { willReadFrequently: true });
    if (!cctx) continue;
    cctx.drawImage(hiCanvas, x, y, cropW, cropH, 0, 0, cropW, cropH);
    hit = await decodeQrFromCanvas(crop);
    if (hit) {
      offX = x;
      offY = y;
      break;
    }
  }
  if (!hit) return null;

  const k = workingCanvas.width / hiW;
  const mapPt = (p?: Point2D) => (p ? { x: (p.x + offX) * k, y: (p.y + offY) * k } : undefined);
  const loc = hit.location;
  return {
    ...hit,
    location: loc
      ? {
          minX: (loc.minX + offX) * k,
          minY: (loc.minY + offY) * k,
          maxX: (loc.maxX + offX) * k,
          maxY: (loc.maxY + offY) * k,
          topLeft: mapPt(loc.topLeft),
          topRight: mapPt(loc.topRight),
          bottomRight: mapPt(loc.bottomRight),
          bottomLeft: mapPt(loc.bottomLeft),
        }
      : null,
  };
}

export async function decodeQrFromCanvas(canvas: HTMLCanvasElement): Promise<DecodedQrResult | null> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || canvas.width === 0 || canvas.height === 0) return null;

  // 1. Try native hardware-accelerated BarcodeDetector when available
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const DetectorCtor = (window as unknown as {
        BarcodeDetector: new (opts: { formats: string[] }) => {
          detect: (src: HTMLCanvasElement) => Promise<
            Array<{
              rawValue?: string;
              boundingBox?: { x: number; y: number; width: number; height: number };
              cornerPoints?: Point2D[];
            }>
          >;
        };
      }).BarcodeDetector;
      const detector = new DetectorCtor({ formats: ['qr_code'] });
      const results = await detector.detect(canvas);
      const hit = results.find((r) => Boolean(r.rawValue));
      if (hit?.rawValue) {
        let location: QrBoundingBox | null = null;
        let rotationQuarterTurns: 0 | 1 | 2 | 3 = 0;
        if (hit.cornerPoints && hit.cornerPoints.length >= 4) {
          const [tl, tr, br, bl] = hit.cornerPoints;
          location = {
            minX: Math.min(tl.x, tr.x, br.x, bl.x),
            minY: Math.min(tl.y, tr.y, br.y, bl.y),
            maxX: Math.max(tl.x, tr.x, br.x, bl.x),
            maxY: Math.max(tl.y, tr.y, br.y, bl.y),
            topLeft: tl,
            topRight: tr,
            bottomRight: br,
            bottomLeft: bl,
          };
          rotationQuarterTurns = computeRotationTurnsFromQrCorners({
            topLeftCorner: tl,
            topRightCorner: tr,
            bottomRightCorner: br,
            bottomLeftCorner: bl,
          });
        } else if (hit.boundingBox) {
          location = {
            minX: hit.boundingBox.x,
            minY: hit.boundingBox.y,
            maxX: hit.boundingBox.x + hit.boundingBox.width,
            maxY: hit.boundingBox.y + hit.boundingBox.height,
          };
        }
        return { raw: hit.rawValue, location, rotationQuarterTurns };
      }
    } catch {
      // Fall through to jsQR
    }
  }

  // 2. Multi-region jsQR scan (full image, top-right QR zone, top half, center, bottom-left for 180°)
  const W = canvas.width;
  const H = canvas.height;
  const regions = [
    { x: 0, y: 0, w: W, h: H },
    { x: Math.floor(W * 0.48), y: 0, w: Math.ceil(W * 0.52), h: Math.ceil(H * 0.42) },
    { x: 0, y: 0, w: W, h: Math.ceil(H * 0.48) },
    { x: Math.floor(W * 0.15), y: Math.floor(H * 0.15), w: Math.ceil(W * 0.7), h: Math.ceil(H * 0.7) },
    { x: 0, y: Math.floor(H * 0.55), w: Math.ceil(W * 0.52), h: Math.ceil(H * 0.45) },
  ];

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

  for (const reg of regions) {
    if (reg.w < 32 || reg.h < 32) continue;

    // Limit scan resolution to max 1100px for speed & sharpness
    const longest = Math.max(reg.w, reg.h);
    const scale = longest > 1100 ? 1100 / longest : 1;
    const sw = Math.max(32, Math.round(reg.w * scale));
    const sh = Math.max(32, Math.round(reg.h * scale));

    let imgData: ImageData;
    if (scale === 1 && reg.x === 0 && reg.y === 0 && reg.w === W && reg.h === H) {
      imgData = ctx.getImageData(0, 0, W, H);
    } else if (tempCtx) {
      tempCanvas.width = sw;
      tempCanvas.height = sh;
      tempCtx.drawImage(canvas, reg.x, reg.y, reg.w, reg.h, 0, 0, sw, sh);
      imgData = tempCtx.getImageData(0, 0, sw, sh);
    } else {
      continue;
    }

    const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (decoded?.data) {
      const location = decoded.location
        ? buildQrBoundingBox(decoded.location, reg.x * scale, reg.y * scale, 1 / scale)
        : null;
      const rotationQuarterTurns = decoded.location
        ? computeRotationTurnsFromQrCorners(decoded.location)
        : 0;
      return { raw: decoded.data, location, rotationQuarterTurns };
    }

    // Contrast-enhanced pass on the same region
    const enhanced = enhanceImageDataContrast(imgData.data);
    const decodedEnh = jsQR(enhanced, imgData.width, imgData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (decodedEnh?.data) {
      const location = decodedEnh.location
        ? buildQrBoundingBox(decodedEnh.location, reg.x * scale, reg.y * scale, 1 / scale)
        : null;
      const rotationQuarterTurns = decodedEnh.location
        ? computeRotationTurnsFromQrCorners(decodedEnh.location)
        : 0;
      return { raw: decodedEnh.data, location, rotationQuarterTurns };
    }
  }

  return null;
}

/**
 * Rotates an HTMLCanvasElement clockwise by `turns * 90°` and transforms a QrBoundingBox accordingly.
 */
export function rotateCanvasQuarterTurns(
  source: HTMLCanvasElement,
  turns: 0 | 1 | 2 | 3,
  qrLocation?: QrBoundingBox | null
): { canvas: HTMLCanvasElement; qrLocation: QrBoundingBox | null } {
  if (turns === 0) {
    return { canvas: source, qrLocation: qrLocation || null };
  }

  const W = source.width;
  const H = source.height;
  const out = document.createElement('canvas');
  out.width = turns % 2 === 1 ? H : W;
  out.height = turns % 2 === 1 ? W : H;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { canvas: source, qrLocation: qrLocation || null };

  ctx.save();
  if (turns === 1) {
    ctx.translate(H, 0);
    ctx.rotate(Math.PI / 2);
  } else if (turns === 2) {
    ctx.translate(W, H);
    ctx.rotate(Math.PI);
  } else if (turns === 3) {
    ctx.translate(0, W);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(source, 0, 0);
  ctx.restore();

  const transformPoint = (x: number, y: number): Point2D => {
    if (turns === 1) return { x: H - y, y: x };
    if (turns === 2) return { x: W - x, y: H - y };
    return { x: y, y: W - x };
  };

  let rotatedBox: QrBoundingBox | null = null;
  if (qrLocation) {
    const pts = [
      transformPoint(qrLocation.minX, qrLocation.minY),
      transformPoint(qrLocation.maxX, qrLocation.minY),
      transformPoint(qrLocation.maxX, qrLocation.maxY),
      transformPoint(qrLocation.minX, qrLocation.maxY),
    ];
    rotatedBox = {
      minX: Math.min(...pts.map((p) => p.x)),
      minY: Math.min(...pts.map((p) => p.y)),
      maxX: Math.max(...pts.map((p) => p.x)),
      maxY: Math.max(...pts.map((p) => p.y)),
    };
  }

  return { canvas: out, qrLocation: rotatedBox };
}

/**
 * Convenience browser wrapper: analyzes an HTMLCanvasElement directly.
 */
export function analyzeAnswerSheetCanvas(
  canvas: HTMLCanvasElement,
  options: OmrAnalyzeOptions & { rotationQuarterTurns?: 0 | 1 | 2 | 3 }
): { analysis: OmrAnalysisResult; orientedCanvas: HTMLCanvasElement } {
  const { canvas: orientedCanvas, qrLocation } = rotateCanvasQuarterTurns(
    canvas,
    options.rotationQuarterTurns || 0,
    options.qrLocation
  );
  const ctx = orientedCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || orientedCanvas.width === 0 || orientedCanvas.height === 0) {
    return {
      orientedCanvas,
      analysis: {
        sheetDetected: false,
        engine: 'Correge Native TypeScript OMR v2',
        error: 'Não foi possível ler os pixels da imagem capturada.',
        rectified: false,
        fiducialsFound: false,
        workingWidth: 0,
        workingHeight: 0,
        detectedColumns: 0,
        detectedRowsCount: 0,
        matchedBubblesCount: 0,
        overallConfidence: 0,
        markedAnswers: {},
        ambiguousQuestions: [],
        blankQuestions: [],
        questionReadings: [],
      },
    };
  }

  const imageData = ctx.getImageData(0, 0, orientedCanvas.width, orientedCanvas.height);
  const analysis = analyzeAnswerSheetPixels(
    imageData.data,
    orientedCanvas.width,
    orientedCanvas.height,
    {
      ...options,
      qrLocation,
    }
  );

  return { analysis, orientedCanvas };
}

/**
 * Draws a visual verification overlay showing every detected bubble (emerald=marked, amber=rasura, slate=unmarked).
 */
export function renderOmrVerificationDataUrl(
  orientedCanvas: HTMLCanvasElement,
  analysis: OmrAnalysisResult
): string {
  const out = document.createElement('canvas');
  out.width = analysis.workingWidth || orientedCanvas.width;
  out.height = analysis.workingHeight || orientedCanvas.height;
  const ctx = out.getContext('2d');
  if (!ctx) return orientedCanvas.toDataURL('image/jpeg', 0.85);

  if (analysis.rectified && analysis.warpedGray && analysis.workingWidth > 0 && analysis.workingHeight > 0) {
    const imgData = ctx.createImageData(analysis.workingWidth, analysis.workingHeight);
    for (let i = 0, p = 0; i < analysis.warpedGray.length; i++, p += 4) {
      const g = analysis.warpedGray[i];
      imgData.data[p] = g;
      imgData.data[p + 1] = g;
      imgData.data[p + 2] = g;
      imgData.data[p + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  } else {
    ctx.drawImage(orientedCanvas, 0, 0, out.width, out.height);
  }

  for (const qr of analysis.questionReadings) {
    for (const b of qr.bubbles) {
      ctx.beginPath();
      ctx.arc(b.cx, b.cy, Math.max(4, b.radius * 1.05), 0, Math.PI * 2);
      if (qr.status === 'ambiguous' && b.marked) {
        ctx.strokeStyle = '#f59e0b';
        ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
      } else if (b.marked) {
        ctx.strokeStyle = '#10b981';
        ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
    }
  }

  return out.toDataURL('image/jpeg', 0.88);
}
