import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateData} from './src/data.js';
const root=fileURLToPath(new URL('.',import.meta.url));
const directory=resolve(root,process.env.PERSONA_DATA_DIR||'data');
const file=resolve(directory,'tierlist.json');
const dist=resolve(root,'dist');
let queue=Promise.resolve();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/data'){
   if(req.method==='GET'){
    await queue;
    try{send(200,validateData(JSON.parse(await readFile(file,'utf8'))))}catch(e){if(e.code==='ENOENT')send(200,null);else send(500,{error:'저장 파일을 읽을 수 없습니다. 기존 파일은 보존됩니다.'})}return;
   }
   if(req.method==='PUT'){
    if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host){send(403,{error:'허용되지 않은 요청입니다.'});return}
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2000000){send(413,{error:'데이터가 너무 큽니다.'});return}}
    let data;try{data=validateData(JSON.parse(body))}catch(e){send(400,{error:e.message});return}
    const save=queue.then(async()=>{await mkdir(directory,{recursive:true});const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(data,null,2)+'\n');await rename(tmp,file)});
    queue=save.catch(()=>{});await save;send(200,{saved:true});return;
   }
   send(405,{error:'지원하지 않는 요청입니다.'});return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){send(405,{error:'지원하지 않는 요청입니다.'});return}
  const target=resolve(dist,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!target.startsWith(dist+'/')){send(403,{error:'접근할 수 없습니다.'});return}
  try{const body=await readFile(target);res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:body)}catch(e){send(404,{error:'파일을 찾을 수 없습니다. npm run build를 실행해 주세요.'})}
 }catch(e){send(500,{error:'저장 처리에 실패했습니다. 다시 시도해 주세요.'})}
});
server.listen(Number(process.env.PERSONA_PORT||5000),process.env.PERSONA_HOST||'127.0.0.1',()=>console.log('PERSONA: http://127.0.0.1:'+server.address().port));
