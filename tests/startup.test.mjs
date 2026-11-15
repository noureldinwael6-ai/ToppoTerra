import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const launcher=fileURLToPath(new URL('../scripts/serve.mjs',import.meta.url));
function start(...args) {
  const process=spawn(globalThis.process.execPath,[launcher,...args],{stdio:['ignore','pipe','pipe']});
  const ready=new Promise((resolve,reject)=>{
    let stderr='';
    process.stdout.on('data',chunk=>{
      const url=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
      if(url)resolve(url);
    });
    process.stderr.on('data',chunk=>{stderr+=chunk;});
    process.on('error',reject);
    process.on('exit',code=>reject({code,stderr}));
  });
  return {process,ready};
}

test('source launcher serves assets on an OS-assigned port without exposing inputs',async t=>{
  const {process,ready}=start('--port','0');
  t.after(()=>process.kill());
  const url=await ready;
  const status=async file=>(await fetch(url+file)).status;
  assert.equal(await status(''),200);
  const head=await fetch(url+'app/main.mjs',{method:'HEAD'});
  assert.equal(head.status,200);
  assert.match(head.headers.get('Content-Type'),/^text\/javascript/);
  assert.equal(await status('data/climate.json'),200);
  assert.equal(await status('data/research.json'),200);
  assert.equal(await status('data/source-records/'),404);
});

test('invalid port emits a concise recovery instruction',async ()=>{
  const {ready}=start('--port','invalid');
  await assert.rejects(ready,error=>error.code===1 && /^Invalid --port\./.test(error.stderr) && !error.stderr.includes('RangeError'));
});

