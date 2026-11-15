import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';

const {PLAYWRIGHT_MODULE,CHROMIUM_PATH,TEST_URL,QA_SCREENSHOTS}=process.env;
const {chromium}=await import(PLAYWRIGHT_MODULE?pathToFileURL(resolve(PLAYWRIGHT_MODULE)).href:'playwright');
const browser=await chromium.launch({headless:true,executablePath:CHROMIUM_PATH||undefined});
const base=new URL(TEST_URL??'http://127.0.0.1:4174/');
if(QA_SCREENSHOTS)await mkdir('docs/qa',{recursive:true});

try {
  for(const width of [1440,768,390]) {
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror', error=>errors.push(error.message));
    page.on('response', response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
    await page.goto(new URL('#benchmark',base).href);
    await page.getByRole('heading',{name:'Arizona temperature'}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Why topology?'}).count(),1);
    assert.equal(await page.getByRole('row').filter({hasText:'Autocorrelated Gaussian null'}).getByText('31 / 48').count(),1);
    await page.locator('summary').filter({hasText:'Methods & validation'}).click();
    assert.equal(await page.getByText(/rank threshold/i).isVisible(),true);
    const line=page.getByLabel(/Historical Arizona structural-change replay.*arrow keys/i);
    await line.focus();
    await line.press('End');
    assert.match(await line.locator('.plot-tip').innerText(),/2025/);
    await line.blur();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(QA_SCREENSHOTS&&width===1440)await page.screenshot({path:'docs/qa/recovery-benchmark-desktop.jpg',type:'jpeg',fullPage:true,quality:77});
    await page.goto(new URL('#nasa',base).href);
    await page.getByRole('heading',{name:'Nile Delta rainfall'}).waitFor();
    await page.getByRole('heading',{name:'Coverage by cell'}).waitFor();
    assert.equal(await page.locator('.nasa-grid rect').count(),176);
    assert.equal(await page.getByText('−16.53',{exact:false}).count(),1);
    const nasa=page.getByLabel(/Nile Delta monthly IMERG precipitation.*arrow keys/i);
    await nasa.focus();
    await nasa.press('End');
    assert.match(await nasa.locator('.plot-tip').innerText(),/Dec 2007/);
    await nasa.blur();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    if(QA_SCREENSHOTS&&(width===1440||width===390))await page.screenshot({path:'docs/qa/recovery-nasa-'+width+'.jpg',type:'jpeg',fullPage:true,quality:77});
    await page.close();
    console.log('Passed research and NASA figures at '+width+' px');
  }
} finally {
  await browser.close();
}

