import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {initialData} from '../src/data.js';
const dir=await mkdtemp(join(tmpdir(),'persona-check-'));let child;let url;
async function start(){child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PERSONA_DATA_DIR:dir,PERSONA_PORT:'0'},stdio:['ignore','pipe','pipe']});await new Promise((ok,no)=>{child.stdout.once('data',data=>{url=data.toString().trim().replace('PERSONA: ','')+'/api/data';ok()});child.once('error',no);child.once('exit',code=>no(new Error('Server exited '+code)))})}
async function stop(){if(child&&child.exitCode===null){await new Promise(ok=>{child.once('exit',ok);child.kill()})}}

try{
 await start();assert.equal(await (await fetch(url)).json(),null);
 const sample={...initialData,title:'재시작 검증',tierNames:{...initialData.tierNames,S:'최애'}};
 assert.equal((await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(sample)})).status,200);
 assert.deepEqual(JSON.parse(await readFile(join(dir,'tierlist.json'),'utf8')),sample);
 await stop();await start();assert.deepEqual(await (await fetch(url)).json(),sample);
 assert.equal((await fetch(url,{method:'PUT',body:'{}'})).status,400);
 assert.deepEqual(await (await fetch(url)).json(),sample);
 await writeFile(join(dir,'tierlist.json'),'{broken');assert.equal((await fetch(url)).status,500);assert.equal(await readFile(join(dir,'tierlist.json'),'utf8'),'{broken');
 console.log('PASS: disk save, restart persistence, invalid-write protection, corrupt-file preservation');
}finally{await stop();await rm(dir,{recursive:true,force:true})}
