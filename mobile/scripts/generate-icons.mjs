import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(projectRoot, 'assets');

async function renderSvgToPng({ inputSvg, outputPng, size }) {
  const svgPath = path.join(assetsDir, inputSvg);
  const outputPath = path.join(assetsDir, outputPng);
  const svgData = await readFile(svgPath);

  const resvg = new Resvg(svgData, {
    fitTo: {
      mode: 'width',
      value: size,
    },
    background: 'rgba(0,0,0,0)',
  });

  const pngData = resvg.render().asPng();
  await writeFile(outputPath, pngData);
  console.log(`generated ${path.relative(projectRoot, outputPath)}`);
}

async function main() {
  await mkdir(assetsDir, { recursive: true });

  const jobs = [
    { inputSvg: 'app-icon.svg', outputPng: 'icon-1024.png', size: 1024 },
    { inputSvg: 'app-icon.svg', outputPng: 'icon-512.png', size: 512 },
    { inputSvg: 'app-icon.svg', outputPng: 'icon-192.png', size: 192 },
    { inputSvg: 'app-icon.svg', outputPng: 'icon.png', size: 1024 },
    {
      inputSvg: 'app-icon-foreground.svg',
      outputPng: 'adaptive-foreground.png',
      size: 1024,
    },
  ];

  for (const job of jobs) {
    await renderSvgToPng(job);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
