import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5188');await page.getByRole('button',{name:'进入竞技场'}).click();
const cases=[['gunner','attack','muzzle'],['gunner','core','dash'],['gunner','skill','recall'],['gunner','ultimate','pulse'],['knight','attack','slash'],['knight','core','dash'],['knight','skill','shield'],['knight','ultimate','storm'],['knight','parry','parry']];
const captures=[];
for(const [hero,action,kind] of cases){
 await page.evaluate(({hero,action})=>{
  const s=window.__rift.start(hero,42);s.spawnTimer=100;s.attackTimer=100;s.invuln=100;
  for(let i=0;i<10;i++)s.spawn();
  s.enemies.forEach((e,i)=>{const a=i*Math.PI/5;e.x=550+Math.cos(a)*150;e.y=325+Math.sin(a)*150;e.hp=e.maxHp=100000;e.speed=0;e.cool=100;});
  s.enemies[0].x=620;s.enemies[0].y=325;

 },{hero,action});
 await page.waitForTimeout(170);
 await page.evaluate(action=>{const s=window.__rift.sim;if(action==='attack')s.attack();else if(action==='parry'){s.invuln=0;s.action('skill');s.hurt(10);}else s.action(action);},action);
 const kinds=await page.evaluate(()=>window.__rift.sim.fx.map(f=>f.kind));
 if(!kinds.includes(kind))throw Error(`Missing ${kind}`);
 await page.waitForTimeout(action==='attack'?45:180);
 const file=`evidence/fx-${hero}-${action}.png`;await page.screenshot({path:file});captures.push(file);
}
await page.evaluate(()=>localStorage.setItem('rift-survivors-v1',JSON.stringify({version:1,reduceMotion:true,sound:false})));
await page.reload();await page.getByRole('button',{name:'进入竞技场'}).click();await page.keyboard.press('Space');await page.keyboard.press('KeyE');await page.keyboard.press('KeyQ');await page.waitForTimeout(150);
await page.screenshot({path:'evidence/fx-reduced-motion.png'});
await page.keyboard.press('Escape');const before=await page.evaluate(()=>window.__rift.sim.fx.map(f=>f.ttl));await page.waitForTimeout(200);const after=await page.evaluate(()=>window.__rift.sim.fx.map(f=>f.ttl));
if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Effects advance while paused');
fs.writeFileSync('evidence/effects-qa.json',JSON.stringify({cases,captures,errors,reducedMotion:true,pauseFrozen:true,mode:'development visual fixtures; enemy HP raised to preserve scene'},null,2));
console.log({effects:cases.length,errors,pauseFrozen:true});await browser.close();if(errors.length)process.exit(1);
