import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright';
const root='work/publisher-portfolio';
const report={sourceCommit:'280292f',worker:'xiaosang-portfolio',deploymentId:'41c05517-e527-48f0-b17a-cdb706494624',checks:[]};
for(const path of ['data/repos.json','js/detail-app.js','screenshots/rift-survivors.png']) {
 const response=await fetch(`https://xiaosang.cc/${path}`);
 const actual=Buffer.from(await response.arrayBuffer()); const expected=await fs.readFile(`${root}/${path}`);
 const match=actual.equals(expected);report.checks.push({path,status:response.status,match});
 if(response.status!==200||!match)throw new Error(`Live mismatch: ${path}`);
}
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('https://xiaosang.cc/');
await page.locator('#search-input').fill('rift-survivors');
const card=page.locator('article.detail-card').filter({has:page.locator('.card-title',{hasText:'rift-survivors'})});
await card.waitFor(); await card.locator('img').evaluate(img=>img.decode());
report.demo=await card.locator('.card-live-demo-btn').getAttribute('href');report.category=await card.locator('.card-category-tag').textContent();report.repoButtons=await card.locator('.card-github-btn').count();
if(report.demo!=='https://rift-survivors.xiaosang.cc/'||report.repoButtons!==0)throw new Error('Card link mismatch');
await page.screenshot({path:'evidence/portfolio-rift-live.png'});
await page.locator('#search-input').fill('tank-tactics');
// A search reset returns all existing cards, whose real Repo links remain available.
await page.locator('#search-input').fill('');
await page.locator('.card-github-btn').first().waitFor();
report.existingRepo=await page.locator('.card-github-btn').first().getAttribute('href');
report.errors=errors;if(errors.length||!report.existingRepo?.startsWith('https://github.com/'))throw new Error('Portfolio regression');
await browser.close();await fs.writeFile('evidence/portfolio-rift-release.json',JSON.stringify(report,null,2));console.log(report);
