import {chromium} from '@playwright/test';import fs from 'node:fs';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[],failed=[];p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failed.push(r.url()));await p.goto('http://127.0.0.1:5189/');await p.waitForSelector('canvas');
const results=[];
for(const name of ['极寒织法者','铜芯造物师','猩红追猎者']){
 await p.getByRole('button',{name:new RegExp(name)}).click();await p.getByRole('button',{name:'进入竞技场'}).click();await p.waitForTimeout(600);
 await p.keyboard.press('KeyE',{delay:40});await p.keyboard.down('KeyD');await p.waitForTimeout(250);await p.keyboard.up('KeyD');await p.keyboard.press('Space',{delay:40});await p.waitForTimeout(150);await p.keyboard.press('Escape',{delay:40});await p.getByRole('button',{name:'继续战斗'}).waitFor();results.push({name,inputSkillAndPause:'passed'});await p.getByRole('button',{name:'返回英雄选择'}).click();
}
await p.screenshot({path:'evidence/15-production-roster.png'});const debugRemoved=await p.evaluate(()=>typeof window.__rift==='undefined');const report={results,errors,failed,debugRemoved};fs.writeFileSync('evidence/production-heroes-v4.json',JSON.stringify(report,null,2));console.log(report);await b.close();if(errors.length||failed.length||!debugRemoved)process.exit(1);
