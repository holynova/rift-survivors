import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root='dist';
const entries=[];
function walk(dir){for(const file of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,file.name);if(file.isDirectory())walk(full);else if(file.name!=='release.json'){const data=fs.readFileSync(full);entries.push({path:path.relative(root,full),bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}}}
walk(root);entries.sort((a,b)=>a.path.localeCompare(b.path));
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
fs.writeFileSync(path.join(root,'release.json'),JSON.stringify({game:'Rift Survivors',version,publishedAt:new Date().toISOString(),files:entries},null,2)+'\n');
console.log(`Release ${version}: ${entries.length} files, ${entries.reduce((n,f)=>n+f.bytes,0)} bytes`);
