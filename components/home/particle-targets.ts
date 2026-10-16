import { seed } from "./particle-motion";

export type ParticleTargets = { logo: Float32Array; monas: Float32Array; ready: boolean };
const images = new Map<string, Promise<HTMLImageElement | null>>();

function source(url: string) {
  if (!images.has(url)) images.set(url, new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  }));
  return images.get(url)!;
}

/** Sample filled pixels and oversample the contour; no source image is ever displayed. */
export function sampleMask(data: Uint8ClampedArray, width: number, height: number, count: number, scaleX: number, scaleY: number, step: number) {
  const fill: number[] = [], edge: number[] = [];
  const occupied = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const offset = (y * width + x) * 4;
    return data[offset + 3] > 45 && (data[offset] + data[offset + 1] + data[offset + 2]) > 210;
  };
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    if (!occupied(x, y)) continue;
    const position = y * width + x;
    fill.push(position);
    if (!occupied(x-step,y) || !occupied(x+step,y) || !occupied(x,y-step) || !occupied(x,y+step)) edge.push(position);
  }
  const points = new Float32Array(count * 3);
  if (!fill.length) return null;
  for (let i = 0; i < count; i++) {
    const pool = i % 10 < 4 && edge.length ? edge : fill;
    const pixel = pool[Math.floor(seed(i + 2200) * pool.length)];
    points[i*3] = ((pixel % width) / width - .5) * scaleX;
    points[i*3+1] = (.5 - Math.floor(pixel / width) / height) * scaleY;
    points[i*3+2] = (seed(i + 2300) - .5) * .2;
  }
  return points;
}

export async function generateTargets(count: number, mobile: boolean): Promise<ParticleTargets> {
  const [logoImage, monasImage] = await Promise.all([source("/uss-logo.png"), source("/monas-hero.svg")]);
  function sample(image: HTMLImageElement | null, width: number, height: number, sx: number, sy: number, fallbackText?: string) {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    if (image) {
      const ratio = Math.min(width / image.width, height / image.height) * .94;
      const w = image.width * ratio, h = image.height * ratio;
      ctx.drawImage(image, (width-w)/2, (height-h)/2, w, h);
    } else if (fallbackText) {
      ctx.fillStyle = "white"; ctx.font = `900 ${height * .8}px Arial Black, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(fallbackText, width/2, height/2);
    }
    return sampleMask(ctx.getImageData(0,0,width,height).data, width, height, count, sx, sy, mobile ? 3 : 2);
  }
  const logo = sample(logoImage, mobile ? 420 : 720, mobile ? 160 : 270, 6.4, 2.4, "USS");
  const monas = sample(monasImage, mobile ? 210 : 360, mobile ? 315 : 540, 3.33, 5);
  return { logo: logo || new Float32Array(count*3), monas: monas || new Float32Array(count*3), ready: Boolean(logoImage && monasImage && logo && monas) };
}
