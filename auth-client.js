document.querySelector('form').addEventListener('submit',async e=>{
 e.preventDefault();const button=document.querySelector('button'),input=document.querySelector('input'),error=document.querySelector('#error');button.disabled=true;error.textContent='';
 try{
 if(!globalThis.crypto?.subtle)throw Error('HTTPS 또는 localhost 주소로 접속해 주세요.');
 const response=await fetch('/auth/key',{cache:'no-store'});const info=await response.json();if(!response.ok)throw Error(info.error);
 const key=await crypto.subtle.importKey('jwk',info.publicKey,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
 const payload=new TextEncoder().encode(JSON.stringify({password:input.value,challenge:info.challenge}));
 const encrypted=await crypto.subtle.encrypt({name:'RSA-OAEP'},key,payload);input.value='';
 const result=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({encrypted:btoa(String.fromCharCode(...new Uint8Array(encrypted)))})});const data=await result.json();if(!result.ok)throw Error(data.error);location.replace('/');
 }catch(e){error.textContent=e.message}finally{button.disabled=false}
});
