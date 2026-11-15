import {benchmarkReconstruction,reconstruct} from './reconstruction-engine.mjs';

self.addEventListener('message',({data})=>{
  try {
    const result = data.kind==='benchmark'
      ? benchmarkReconstruction(data.rows,data.variable,data.mode)
      : reconstruct(data.values,data.dates,data.mode);
    self.postMessage({id:data.id,result});
  } catch (error) {
    self.postMessage({id:data.id,error:error.message});
  }
});
