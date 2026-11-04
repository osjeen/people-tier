import {generateKeyPairSync,privateDecrypt,constants,randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:3072});
const sessions=new Map(), challenges=new Map();
let attempts=[];
const token=()=>randomBytes(32).toString('base64url');
const digest=s=>createHash('sha256').update(s).digest('hex');
export function createAuth(directory){
 async function config(){try{return JSON.parse(await readFile(directory+'/auth.json','utf8'))}catch{return null}}
 function session(req){const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('persona_session='));if(!cookie)return null;const key=digest(cookie.slice(16));const s=sessions.get(key);if(!s||s.expires<Date.now()){sessions.delete(key);return null}return {key,...s}}
 function cookie(req,value,age){return `persona_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${process.env.PERSONA_SECURE_COOKIE==='true'?'; Secure':''}`}
 return {session,async handle(req,res,url){
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 if(!url.pathname.startsWith('/auth/'))return false;
 const cfg=await config();
 if(url.pathname==='/auth/key'&&req.method==='GET'){
 if(!cfg){send(503,{error:'관리자가 서버에서 비밀번호를 설정해야 합니다.'});return true}
 for(const [id,item] of challenges)if(item.expires<Date.now())challenges.delete(id);
 if(challenges.size>=1000){send(429,{error:'잠시 후 다시 시도해 주세요.'});return true}
 const challenge=token();challenges.set(challenge,{expires:Date.now()+60000});send(200,{publicKey:publicKey.export({format:'jwk'}),challenge});return true;
 }
 if(['POST'].includes(req.method)){
 if(!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host){send(403,{error:'허용되지 않은 요청입니다.'});return true}
 }
 if(url.pathname==='/auth/logout'&&req.method==='POST'){const s=session(req);if(s)sessions.delete(s.key);res.setHeader('Set-Cookie',cookie(req,'',0));send(200,{ok:true});return true}
 if(url.pathname==='/auth/login'&&req.method==='POST'){
 attempts=attempts.filter(t=>t>Date.now()-60000);if(attempts.length>=10){send(429,{error:'로그인 시도가 너무 많습니다. 1분 후 다시 시도해 주세요.'});return true}attempts.push(Date.now());
 let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096){send(413,{error:'요청이 너무 큽니다.'});return true}}
 try{
 if(!cfg)throw Error();
 const {encrypted}=JSON.parse(body);const decoded=privateDecrypt({key:privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(encrypted,'base64'));const {password,challenge}=JSON.parse(decoded.toString());
 const c=challenges.get(challenge);challenges.delete(challenge);if(!c||c.expires<Date.now()||typeof password!=='string'||Buffer.byteLength(password)>128)throw Error();
 const expected=Buffer.from(cfg.hash,'hex');const actual=scryptSync(password,Buffer.from(cfg.salt,'hex'),64);if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw Error();
 for(const [k,s] of sessions)if(s.expires<Date.now()||s.revision!==cfg.revision)sessions.delete(k);
 if(sessions.size>=1000)throw Error();
 const id=token();sessions.set(digest(id),{expires:Date.now()+8*3600000,revision:cfg.revision});res.setHeader('Set-Cookie',cookie(req,id,8*3600));send(200,{ok:true});
 }catch{send(401,{error:'비밀번호가 틀렸거나 요청이 만료됐습니다.'})}return true;
 }
 send(404,{error:'요청을 찾을 수 없습니다.'});return true;
 },async allowed(req){const s=session(req);if(!s)return false;const cfg=await config();return cfg&&s.revision===cfg.revision}};
}
