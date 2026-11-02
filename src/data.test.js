import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData,validateData} from './data.js';
test('JSON round-trip preserves people, tags and tier assignments',()=>assert.deepEqual(validateData(JSON.parse(JSON.stringify(initialData))),initialData));
test('rejects invalid tiers, duplicate ids and malformed tags',()=>{for(const mutate of [d=>d.people[0].tier='Z',d=>d.people[1].id=d.people[0].id,d=>d.people[0].tags=[4]]){let d=structuredClone(initialData);mutate(d);assert.throws(()=>validateData(d));}});
test('rejects unsupported versions and excessive imports',()=>{assert.throws(()=>validateData({...initialData,version:2}));assert.throws(()=>validateData({...initialData,people:Array(1001).fill(initialData.people[0])}));});
