export const tiers = ['S','A','B','C','D'];
export const initialData = {version:1,title:'나의 인물 티어리스트',tierOrder:[...tiers],tierNames:{S:'S',A:'A',B:'B',C:'C',D:'D'},people:[{id:'1',name:'김도윤',tags:['리더십','전략가'],tier:'S'},{id:'2',name:'이서연',tags:['창의적','분위기 메이커'],tier:'A'},{id:'3',name:'박지호',tags:['분석적','꼼꼼함'],tier:'A'},{id:'4',name:'최하린',tags:['실행력','열정'],tier:'B'},{id:'5',name:'정우진',tags:['차분함','협업'],tier:null},{id:'6',name:'윤서아',tags:['호기심','아이디어'],tier:null}]};
export function validateData(value){
 if(!value || value.version!==1 || typeof value.title!=='string' || !value.title.trim() || value.title.length>100 || !Array.isArray(value.people) || value.people.length>1000) throw new Error('version: 1, 제목(title), 인물 목록(people)이 필요합니다. 최대 1,000명까지 지원합니다.');
 const tierOrder=value.tierOrder===undefined?[...tiers]:value.tierOrder;
 if(!Array.isArray(tierOrder)||tierOrder.length<1||tierOrder.length>20||new Set(tierOrder).size!==tierOrder.length||tierOrder.some(id=>typeof id!=='string'||! /^[A-Za-z0-9_-]{1,80}$/.test(id)||['__proto__','constructor','prototype'].includes(id))) throw new Error('티어는 고유 ID를 가진 1~20개 목록이어야 합니다.');
 const tierNames={};
 if(value.tierNames!==undefined && (!value.tierNames || typeof value.tierNames!=='object' || Array.isArray(value.tierNames))) throw new Error('티어 이름은 객체 형식이어야 합니다.');
 for(const id of tierOrder){const name=value.tierNames===undefined?id:value.tierNames[id];if(typeof name!=='string'||!name.trim()||name.length>20) throw new Error('각 티어 이름은 1~20자로 입력해 주세요.');tierNames[id]=name.trim();}
 const ids=new Set();
 const people=value.people.map(p=>{if(!p || typeof p.id!=='string' || !p.id || ids.has(p.id) || typeof p.name!=='string' || !p.name.trim() || p.name.length>40 || !Array.isArray(p.tags) || p.tags.length>8 || p.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>20) || !(p.tier===null||tierOrder.includes(p.tier))) throw new Error('인물의 고유 ID, 이름(40자 이내), 태그(각 20자, 최대 8개), 티어(등록된 ID 또는 null)를 확인해 주세요.');ids.add(p.id);return {id:p.id,name:p.name.trim(),tags:[...new Set(p.tags.map(t=>t.trim()))],tier:p.tier};});
 return {version:1,title:value.title.trim(),tierOrder:[...tierOrder],tierNames,people};
}

export function removeTier(data,id){
 if(data.tierOrder.length<=1)throw new Error('티어는 최소 1개 필요합니다.');
 const tierNames={...data.tierNames};delete tierNames[id];
 return {...data,tierOrder:data.tierOrder.filter(t=>t!==id),tierNames,people:data.people.map(p=>p.tier===id?{...p,tier:null}:p)};
}
