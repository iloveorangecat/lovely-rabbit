// Encode the generated artwork for offline delivery without changing the art.
// Usage: node scripts/prepare-rabbit.mjs <source-transparent-png>
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const source=process.argv[2];
if(!source)throw new Error('Pass the generated transparent PNG path');
const data=await readFile(source);
const browser=await chromium.launch();
try {
  const page=await browser.newPage();
  const encoded=await page.evaluate(async url=>{
    const img=new Image();img.src=url;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=800;canvas.height=800;
    canvas.getContext('2d').drawImage(img,0,0,800,800);
    return canvas.toDataURL('image/webp',.9).split(',')[1];
  },`data:image/png;base64,${data.toString('base64')}`);
  await writeFile(new URL('../public/rabbit-mascot.webp',import.meta.url),Buffer.from(encoded,'base64'));
  console.log('Transparent WebP saved');
}finally {await browser.close();}
