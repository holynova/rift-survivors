import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage();
const url = process.env.RIFT_TEST_URL || 'http://127.0.0.1:5188';
const checks = [];
for (const [name, width, height] of [['desktop',1366,768],['portrait',390,844],['short',1280,600]]) {
  await page.setViewportSize({width,height});
  await page.goto(url);
  await page.locator('.hero-option img').last().waitFor();
  await page.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
  await page.screenshot({path:`evidence/viewport-${name}-v071.png`});
  checks.push(await page.evaluate(() => {
    const r = document.querySelector('.viewport-frame').getBoundingClientRect();
    return {width:innerWidth,height:innerHeight,frame:{left:r.left,top:r.top,right:r.right,bottom:r.bottom},scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight};
  }));
}
await writeFile('evidence/viewport-v071.json',JSON.stringify({url,checks},null,2));
await browser.close();
