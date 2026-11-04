import {scryptSync,randomBytes} from 'node:crypto';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=resolve(fileURLToPath(new URL('..',import.meta.url)),process.env.PERSONA_DATA_DIR||'data');
async function secret(prompt){
 if(!process.stdin.isTTY)throw Error('터미널에서 실행해 주세요. Docker는 docker compose exec persona node scripts/set-password.mjs');
 process.stdout.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();
 return new Promise((ok,no)=>{let value='';const onData=chunk=>{for(const c of chunk.toString()){if(c==='\u0003'){finish();no(Error('취소됨'));return}if(c==='\r'||c==='\n'){finish();ok(value);return}if(c==='\u007f'){value=value.slice(0,-1)}else if(c>=' ')value+=c}};function finish(){process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n')}process.stdin.on('data',onData)});
}
try{const password=await secret('새 비밀번호 (12자 이상, 입력 숨김): ');if(password.length<12||Buffer.byteLength(password)>128)throw Error('12자 이상, UTF-8 128바이트 이하로 설정하세요.');const confirm=await secret('다시 입력: ');if(password!==confirm)throw Error('비밀번호가 일치하지 않습니다.');const salt=randomBytes(32);const config={salt:salt.toString('hex'),hash:scryptSync(password,salt,64).toString('hex'),revision:randomBytes(16).toString('hex')};await mkdir(dir,{recursive:true});await writeFile(dir+'/auth.json.tmp',JSON.stringify(config),{mode:0o600});await rename(dir+'/auth.json.tmp',dir+'/auth.json');console.log('비밀번호를 설정했습니다. 기존 로그인 세션은 무효화됩니다.');}catch(e){console.error(e.message);process.exitCode=1}
