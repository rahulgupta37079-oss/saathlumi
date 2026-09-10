import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
let count=0;
try{const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();for(const path of ['/','/browse','/register','/login','/companions/ananya','/pricing','/safety','/calendar']){await page.goto('http://localhost:3000'+path,{waitUntil:'networkidle'});const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();const issues=result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,detail:n.failureSummary}))}));assert.deepEqual(issues,[],`Accessibility issues on ${path}: ${JSON.stringify(issues)}`);console.log('PASS accessibility '+path);count++;}console.log(`${count} pages passed automated WCAG 2 A/AA checks. This is not a full accessibility certification.`);}finally{await browser.close();}
