import ts from 'typescript';import fs from 'node:fs';
fs.mkdirSync('work',{recursive:true});
for(const f of ['content','simulation']){const s=ts.transpileModule(fs.readFileSync(`src/game/${f}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/(["'])\.\/content\1/g,"'./content.mjs'");fs.writeFileSync(`work/${f}.mjs`,s);}
const {Simulation}=await import('../work/simulation.mjs');const results=[];
for(const hero of ['gunner','knight','frost','engineer','reaper'])for(const seed of [42,100,2026]){
 const s=new Simulation(hero,seed);let ticks=0;const history=[];
 while(!['won','lost'].includes(s.phase)&&ticks<60*650){
  if(s.phase==='upgrade'){
   const priority=hero==='engineer'?['assembly','gears','damage','attack','repair','armor','health']:hero==='frost'?['shatter','permafrost','damage','attack','armor','health']:['damage','attack','ember','edge','execution','health','armor','crit','thirst','haste','flow','trail','echo','speed','roll','pickup'];
   const rank=id=>priority.includes(id)?priority.indexOf(id):99;s.choose([...s.choices].sort((a,b)=>rank(a.id)-rank(b.id))[0].id);continue;
  }
  if(s.phase==='shop'){history.push({wave:s.wave,hp:Math.round(s.p.hp),kills:s.kills,level:s.level});if(s.p.hp<s.p.maxHp*.8)s.heal();const priority=['stone','feather','wall','ruby','leech','magnet'];for(const i of [0,1,2].sort((a,b)=>priority.indexOf(s.shop[a].id)-priority.indexOf(s.shop[b].id)))s.buy(i);s.nextWave();continue;}
  const melee=hero==='knight'||hero==='reaper';
  const enemies=[...s.enemies].sort((a,b)=>Math.hypot(a.x-s.p.x,a.y-s.p.y)-Math.hypot(b.x-s.p.x,b.y-s.p.y));const nearest=enemies[0];
  const distance=e=>Math.hypot(e.x-s.p.x,e.y-s.p.y);
  if(hero==='engineer'||hero==='frost')s.action('skill');
  if(hero==='reaper'&&nearest&&distance(nearest)<100)s.action('skill');
  if(hero==='knight'&&nearest&&distance(nearest)<60)s.action('skill');
  if(enemies.filter(e=>distance(e)<190).length>3||enemies.some(e=>e.type>=3&&distance(e)<190)||(hero==='engineer'&&enemies.length>4))s.action('ultimate');
  if(hero==='gunner'&&s.p.hp<s.p.maxHp*.65)s.action('skill');
  let best=-Infinity,dir={x:0,y:0};
  for(let i=0;i<24;i++){
   const a=i*Math.PI/12,dx=Math.cos(a),dy=Math.sin(a),x=s.p.x+dx*s.p.speed*.45,y=s.p.y+dy*s.p.speed*.45;
   let score=-Math.max(0,65-x)*3-Math.max(0,x-1035)*3-Math.max(0,65-y)*3-Math.max(0,y-585)*3;
   if(melee&&nearest){const d=Math.hypot(nearest.x-x,nearest.y-y);score-=Math.abs(d-75)*.5;}else score-=Math.hypot(x-550,y-325)*.025;
   for(const e of enemies){const d=Math.hypot(e.x-x,e.y-y);score-=Math.max(0,(e.type>=3?95:melee?45:140)-d)*(e.type===1?1.8:1.1);}
   for(const d of s.dangers)if(Math.hypot(x-d.x,y-d.y)<d.r+30)score-=300;
   for(const p of s.shots)if(p.hostile&&Math.hypot(p.x+p.vx*.3-x,p.y+p.vy*.3-y)<45)score-=140;
   const gem=s.gems.filter(g=>Math.hypot(g.x-x,g.y-y)<150).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(gem)score+=Math.max(0,150-Math.hypot(gem.x-x,gem.y-y))*.14;
   if(score>best){best=score;dir={x:dx,y:dy};}
  }
  if(melee || hero==='frost') {
    let target={x:550+Math.cos(s.elapsed*.3)*310,y:325+Math.sin(s.elapsed*.3)*210};
    if(melee&&nearest){const d=distance(nearest);target=d>70?nearest:{x:s.p.x+s.p.x-nearest.x,y:s.p.y+s.p.y-nearest.y};}
    const danger=s.dangers.find(d=>Math.hypot(s.p.x-d.x,s.p.y-d.y)<d.r+20);
    if(danger)target={x:s.p.x+(s.p.x-danger.x||1)*100,y:s.p.y+(s.p.y-danger.y||1)*100};
    dir={x:target.x-s.p.x,y:target.y-s.p.y};
  }
  s.setMove(dir.x,dir.y);
  const imminent=s.dangers.some(d=>d.ttl<.45&&Math.hypot(s.p.x-d.x,s.p.y-d.y)<d.r+20);
  if(imminent||(hero==='gunner'&&nearest&&distance(nearest)<55))s.action('core');
  s.step(1/60);ticks++;
 }
 results.push({hero,seed,result:s.phase,wave:s.wave,seconds:Math.round(s.elapsed),kills:s.kills,level:s.level,hp:Math.round(s.p.hp),history});
}
const report={note:'Tactical rules-layer bot uses normal values, directional threat scoring, skill inputs and shop purchases. No invulnerability, damage mutation or wave skipping. This estimates pressure, not human win rate.',runs:results};fs.writeFileSync('evidence/balance-bot-v6.json',JSON.stringify(report,null,2));console.log(results.map(({history,...r})=>r));
