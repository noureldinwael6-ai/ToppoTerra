import {runTopology} from './topology.mjs';

self.addEventListener('message', ({data}) => {
  const {id, primary, companion, options} = data;
  try {
    self.postMessage({id, result: runTopology(primary, companion, options)});
  } catch (error) {
    self.postMessage({id, error: error instanceof Error ? error.message : String(error)});
  }
});

