import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
const playwright=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
try {
  const page=await browser.newPage({viewport:{width:1440,height:950},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const url=process.env.TEST_URL??'http://127.0.0.1:4173/';
  await page.goto(url+'#analysis');
  await page.getByRole('link',{name:'Open Proof Lab',exact:false}).first().click();
  await page.getByRole('heading',{name:'Topo-Signal Proof Lab'}).waitFor();
  const go=name=>page.locator('[data-proof="'+name+'"]').click();
  await page.locator('[name=proof-date]').selectOption('2019-01-01');
  await page.locator('[name=proof-count]').selectOption('3');
  await page.locator('[name=proof-mode]').selectOption('prospective');
  await go('mask');
  await go('estimate');
  const table=page.locator('[data-proof-results] table').first();
  await table.waitFor();
  assert.equal(await table.locator('tbody tr').count(),3);
  assert.equal(await table.getByRole('columnheader',{name:'Original',exact:true}).count(),0);
  const on=await page.locator('[data-proof-point]').innerText();
  await page.locator('[data-proof-topology]').uncheck();
  assert.match(await table.innerText(),/Geometric analogs/);
  assert.ok(on.includes('Observed inputs'));
  const anchor=page.locator('[data-proof-geometry] [data-phase-point]').last();
  await anchor.dispatchEvent('click');
  assert.match(await page.locator('[data-proof-point]').innerText(),/Observed inputs/);
  await go('reveal');
  assert.equal(await table.getByRole('columnheader',{name:'Original',exact:true}).count(),1);
  await go('benchmark');
  await page.locator('[data-proof-benchmark] tbody tr').first().waitFor();
  assert.equal(await page.locator('[data-proof-benchmark] tbody tr').count(),5);
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:950});
    await page.evaluate(()=>document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Proof Lab viewport '+width+' px');
    if(process.env.QA_SCREENSHOTS){
      await mkdir(process.env.QA_SCREENSHOTS,{recursive:true});
      await page.screenshot({path:process.env.QA_SCREENSHOTS+'/proof-'+width+'.jpg',fullPage:true});
    }
  }
  await go('reset');
  assert.equal(await table.count(),0);
  await page.locator('[name=proof-date]').selectOption('2024-05-01');
  await page.locator('[name=proof-count]').selectOption('1');
  await page.locator('[name=proof-mode]').selectOption('retrospective');
  await go('mask');
  await go('estimate');
  await table.waitFor();
  assert.equal(await table.locator('tbody tr').count(),1);
  await go('reveal');
  assert.equal(await table.getByRole('columnheader',{name:'Original',exact:true}).count(),1);
  assert.deepEqual(errors,[]);
  console.log('Proof Lab Chrome passed: Public link, mask block, switch, sourced 3D point, reveal, paired benchmark, reset and 3 widths.');
} finally {await browser.close();}

