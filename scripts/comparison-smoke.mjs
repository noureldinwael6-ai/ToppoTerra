import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const base=process.env.TEST_URL??'http://127.0.0.1:4173/';
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'#analysis');
  await page.getByRole('link',{name:/Traditional vs Topo-Signal/}).click();
  await page.getByRole('heading',{name:'Rolling window evidence'}).waitFor();
  const rate=page.locator('[data-comparison-results] .figure-panel .rate').first();
  assert.match(await rate.innerText(),/0\.3197/);
  const p=await page.getByText(/Raw OLS p-value/).innerText();
  assert.match(p,/e-9/);
  await page.locator('[data-method-matched]').check();
  const aligned=page.locator('.matched-panel');
  assert.match(await aligned.innerText(),/2022-01 to 2025-12 · 48 monthly departures/);
  await page.getByRole('img',{name:'Monthly departures used by both window measurements'}).waitFor();
  assert.equal(await page.locator('[data-window-band]').count(),3);
  await page.getByText('What does this diagram distance mean?',{exact:true}).click();
  assert.match(await page.locator('.method-results .result-explanation[open]').innerText(),/1981-01 to 1984-12/);
  await page.getByText('View the two diagrams side by side').click();
  assert.equal(await page.locator('.observed-diagram:visible').count(),2);
  assert.match(await page.getByText(/Not independently computed/).innerText(),/Not independently computed/);
  await page.locator('[data-method-topology]').uncheck();
  assert.match(await rate.innerText(),/0\.3197/);
  assert.equal(await page.getByRole('heading',{name:'Rolling window evidence'}).count(),0);
  await page.locator('[data-method-topology]').check();
  await page.locator('[name=method-stride]').selectOption('6');
  await page.locator('[name=method-window]').locator('option').nth(1).waitFor({state:'attached'});
  assert.match(await page.locator('[name=method-window] option').nth(1).textContent(),/1985-06/);
  await page.selectOption('[name=method-window]','1');
  assert.match(await aligned.innerText(),/1981-07 to 1985-06 · 48 monthly departures/);
  await page.locator('[name=method-digits]').selectOption('6');
  assert.match(await rate.innerText(),/0\.319714/);
  if(process.env.QA_SCREENSHOTS)await page.screenshot({path:process.env.QA_SCREENSHOTS+'/method-comparison-1440.jpg'});
  await page.goto(base+'#topology');
  await page.locator('.lab-phase [data-phase-point]').first().waitFor();
  assert.equal(await page.locator('[name=lab-width]').inputValue(),'4');
  assert.equal(await page.locator('[name=lab-step]').inputValue(),'6');
  await page.getByRole('link',{name:/Future Outlook/}).click();
  await page.getByRole('heading',{name:'2027 · 2-year horizon'}).waitFor();
  await page.locator('[name=outlook-replay]').selectOption('2019');
  assert.equal(await page.getByText(/^Actual .* signed error/).count(),0);
  await page.getByRole('button',{name:'Reveal held-out outcome'}).click();
  assert.equal(await page.getByText(/^Actual .* signed error/).count(),2);
  await page.locator('[name=outlook-horizon]').selectOption('3');
  await page.getByRole('heading',{name:'2028 · 3-year horizon'}).waitFor();
  if(process.env.QA_SCREENSHOTS)await page.screenshot({path:process.env.QA_SCREENSHOTS+'/future-outlook-1440.jpg'});
  await page.locator('[name=outlook-state]').selectOption('CA');
  await page.getByText(/Unavailable for this horizon/).waitFor();
  for(const width of [768,390]){
    await page.setViewportSize({width,height:900});
    for(const route of ['comparison','outlook']){
      await page.goto(base+'#'+route);
      await page.locator('.research-method h1').waitFor();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(process.env.QA_SCREENSHOTS)await page.screenshot({path:process.env.QA_SCREENSHOTS+'/'+route+'-'+width+'.jpg'});
    }
  }
  assert.deepEqual(errors,[]);
  console.log('Comparison and outlook passed: exact trend, ablation display, stride, precision, Lab context, projections, withheld replay, coverage gate and responsive widths.');
} finally {await browser.close();}

