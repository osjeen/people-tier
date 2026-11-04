import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes,scryptSync,publicEncrypt,createPublicKey,constants} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialData} from '../src/data.js';
const dir=await mkdtemp(join(tmpdir(),'persona-auth-'));const password=randomBytes(24).toString('hex');let child;
try{
 child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PERSONA_DATA_DIR:dir,PERSONA_PORT:'0'},stdio:['ignore','pipe','inherit']});const base=await new Promise((ok,no)=>{child.stdout.once('data',d=>ok(d.toString().trim().replace('PERSONA: ','')));child.once('error',no);child.once('exit',()=>no(Error('server exited')))});
 assert.equal((await fetch(base+'/auth/key')).status,503);
 const salt=randomBytes(32);const cfg={salt:salt.toString('hex'),hash:scryptSync(password,salt,64).toString('hex'),revision:'test'};await writeFile(join(dir,'auth.json'),JSON.stringify(cfg));
 assert.equal((await fetch(base+'/api/data')).status,401);
 assert.equal((await fetch(base+'/api/data',{method:'PUT',body:JSON.stringify(initialData)})).status,401);
 assert.match(await (await fetch(base)).text(),/비밀번호/);
 async function envelope(pass){const k=await(await fetch(base+'/auth/key')).json();return JSON.stringify({encrypted:publicEncrypt({key:createPublicKey({key:k.publicKey,format:'jwk'}),padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(JSON.stringify({password:pass,challenge:k.challenge}))).toString('base64')})}
 const post=body=>fetch(base+'/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body});
 assert.equal((await post(await envelope('wrong'))).status,401);
 const body=await envelope(password);const response=await post(body);assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];assert.match(response.headers.get('set-cookie'),/HttpOnly/);
 assert.equal((await post(body)).status,401);
 assert.equal((await fetch(base+'/api/data',{headers:{Cookie:cookie}})).status,200);
 assert.equal((await fetch(base+'/api/data',{method:'PUT',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(initialData)})).status,200);
 assert.equal((await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:'https://wrong.example'}})).status,403);
 assert.equal((await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:base}})).status,200);
 assert.equal((await fetch(base+'/api/data',{headers:{Cookie:cookie}})).status,401);
 const login=await post(await envelope(password));const cookie2=login.headers.get('set-cookie').split(';')[0];await writeFile(join(dir,'auth.json'),JSON.stringify({...cfg,revision:'changed'}));assert.equal((await fetch(base+'/api/data',{headers:{Cookie:cookie2}})).status,401);
 for(let i=0;i<12;i++)await post('{}');assert.equal((await post('{}')).status,429);
 console.log('PASS: unconfigured fail-closed, API authorization, RSA login, replay rejection, persistence, logout, origin check, password rotation, rate limit');
}finally{if(child&&child.exitCode===null)await new Promise(ok=>{child.once('exit',ok);child.kill()});await rm(dir,{recursive:true,force:true})}
