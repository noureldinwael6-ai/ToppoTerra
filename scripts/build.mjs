import {access, copyFile, cp, mkdir} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const data = ['data/climate.json','data/research.json'];
const expected = ['index.html','app/main.mjs','app/style.css','app/intro.css','app/public.css','app/lab.css','app/research.css','app/recovery.css','app/intro.mjs','app/diagnostics.mjs','app/metric-guide.mjs','app/science.mjs','app/topology.mjs','app/topology.worker.mjs','app/proof-lab.mjs','app/proof-worker.mjs','app/proof.css','app/comparison.mjs','app/outlook-model.mjs',...data];
try {
  await Promise.all(expected.map(path=>access(new URL(path,root))));
} catch (error) {
  console.error('Build stopped. Required browser file unavailable: '+error.path);
  process.exit(1);
}
await mkdir(new URL('data/',dist),{recursive:true});
await Promise.all([
  copyFile(new URL('index.html',root),new URL('index.html',dist)),
  cp(new URL('app/',root),new URL('app/',dist),{recursive:true}),
  cp(new URL('assets/',root),new URL('assets/',dist),{recursive:true}),
  ...data.map(path=>copyFile(new URL(path,root),new URL(path,dist)))
]);
console.log('Built dist/ · npm run preview starts the production build.');

