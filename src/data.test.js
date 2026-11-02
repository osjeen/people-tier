import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData,validateData} from './data.js';
test('JSON round-trip preserves people, tags and tier assignments',()=>assert.deepEqual(validateData(JSON.parse(JSON.stringify(initialData))),initialData));
test('rejects invalid tiers, duplicate ids and malformed tags',()=>{for(const mutate of [d=>d.people[0].tier='Z',d=>d.people[1].id=d.people[0].id,d=>d.people[0].tags=[4]]){let d=structuredClone(initialData);mutate(d);assert.throws(()=>validateData(d));}});
test('rejects unsupported versions and excessive imports',()=>{assert.throws(()=>validateData({...initialData,version:2}));assert.throws(()=>validateData({...initialData,people:Array(1001).fill(initialData.people[0])}));});
test('custom tier names survive JSON export/import without changing assignments',()=>{const d={...initialData,tierNames:{S:'최애',A:'좋음',B:'보통',C:'관찰',D:'기타'}};assert.deepEqual(validateData(JSON.parse(JSON.stringify(d))),d);});
test('legacy JSON gets default tier names',()=>{const {tierNames,...legacy}=initialData;assert.deepEqual(validateData(legacy),initialData);});
test('rejects invalid tier names',()=>{for(const tierNames of [null,[],{...initialData.tierNames,S:' '},{...initialData.tierNames,A:'x'.repeat(21)}]) assert.throws(()=>validateData({...initialData,tierNames}));});
