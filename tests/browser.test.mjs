import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:3000';
await mkdir('tests/artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let checks=0;
try{
for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){
const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base,{waitUntil:'networkidle'});await page.locator('.hero-copy').waitFor();await page.evaluate(()=>document.fonts.ready);await page.locator('img').evaluateAll(images=>images.forEach(i=>i.loading='eager'));await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:`tests/artifacts/home-${name}.png`,fullPage:true});
assert.equal(await page.locator('h1').innerText(),'Good company.\nMeaningful\nmoments.');assert.match(await page.title(),/Saathlumi/);assert.match(await page.locator('.site-header .brand').innerText(),/saathlumi/);assert.doesNotMatch(await page.locator('body').innerText(),/togetherly/i);checks++;
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} homepage horizontal overflow`);checks++;
assert.equal(await page.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)),true);checks++;
await page.locator('#discovery-search [name=city]').selectOption('Mumbai');await page.locator('#discovery-search button').click();await page.locator('#profile-results').waitFor();assert.equal(await page.locator('.profile-card').count(),1);assert.match(await page.locator('.profile-name').innerText(),/Arjun/);checks++;
await page.locator('[data-action=clear-filters]').click();assert.equal(await page.locator('.profile-card').count(),3);checks++;
await page.locator('#browse-filters [name=city]').selectOption('Pune');await page.locator('#browse-filters button').click();assert.equal(await page.locator('.profile-card').count(),0);assert.match(await page.locator('.empty-state h2').innerText(),/No matches/);checks++;
await page.goto(base+'/companions/ananya',{waitUntil:'networkidle'});const tomorrow=new Date(Date.now()+86400000*3).toISOString().slice(0,10);for(let i=0;i<2&&!await page.locator(`[data-date="${tomorrow}"]`).count();i++)await page.locator('[data-action=next-month]').click();await page.locator(`[data-date="${tomorrow}"]`).click();await page.locator('[data-slot="12:00"]').click();await page.locator('[name=venue]').fill('A public café near the park');await page.locator('[name=message]').fill('A relaxed coffee and conversation.');await page.locator('#booking-form input[type=checkbox]').check();await page.locator('#booking-form button[type=submit]').click();await page.locator('dialog[open]').waitFor();assert.match(await page.locator('dialog').innerText(),/No request has been sent/);checks++;await page.locator('[data-action=close-modal]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} profile overflow`);checks++;
await page.goto(base+'/calendar',{waitUntil:'networkidle'});await page.locator('[data-view=week]').click();assert.ok(await page.locator('[data-date]:visible').count()<=7);await page.locator('[data-view=day]').click();assert.equal(await page.locator('[data-date]:visible').count(),1);checks++;
await page.goto(base+'/pricing',{waitUntil:'networkidle'});assert.match(await page.locator('.pricing-grid').innerText(),/₹299/);assert.doesNotMatch(await page.locator('.pricing-grid').innerText(),/FOR WOMEN|\bFree\b|Join for free/i);assert.match(await page.locator('.pricing-grid').innerText(),/membership details after login/);checks++;
await page.goto(base+'/checkout',{waitUntil:'networkidle'});assert.equal(await page.locator('.checkout-card button').isDisabled(),true);checks++;
await page.goto(base+'/register',{waitUntil:'networkidle'});assert.equal(await page.locator('input[type=email]').count(),1);assert.equal(await page.locator('input[name=password]').getAttribute('minlength'),'12');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} registration overflow`);checks++;
if(name==='mobile'){await page.locator('[data-action=menu]').click();assert.equal(await page.locator('.mobile-nav').isVisible(),true);await page.locator('.mobile-nav a[href="/safety"]').click();assert.match(await page.locator('h1').innerText(),/Real boundaries/);checks++;}
await page.goto(base+'/#faq',{waitUntil:'networkidle'});await page.locator('details').first().locator('summary').click();assert.equal(await page.locator('details').first().getAttribute('open'),'');checks++;
assert.doesNotMatch(await page.locator('body').innerText(),/women.{0,40}free|for women|join for free/i);
await page.goto(base+'/terms',{waitUntil:'networkidle'});assert.doesNotMatch(await page.locator('body').innerText(),/women.{0,40}free|for women|togetherly/i);
assert.deepEqual(errors,[],`${name} script errors`);checks++;
console.log(`PASS ${name} responsive navigation, discovery, booking preview, calendar, pricing, safety and forms.`);await context.close();}
console.log(`${checks} browser checks passed. Screenshots in tests/artifacts.`);
}finally{await browser.close();}
