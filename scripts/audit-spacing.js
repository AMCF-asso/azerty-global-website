const { chromium } = require('@playwright/test');
const fs=require('fs');
const pages={'index.html':'home','entreprises.html':'page-global','comparatif.html':'page-global',
  'dev.html':'page-global','guide.html':'coeur','e-aigu-majuscule.html':'landing','guillemets.html':'landing'};
const sels=['.hero__badge','.hero__title','.hero__lead','.hero__subtitle',
  '.section__title','.section__subtitle','.section-lead',
  '.card__title','.card__text','.hero-heading','.hero-intro','.guide-transition-title'];
(async()=>{
 const b=await chromium.launch({channel:'chrome'});
 let rep='# Audit espacements verticaux — '+new Date().toISOString().slice(0,10)+'\n';
 for(const [p,type] of Object.entries(pages)){
  rep+=`\n## ${p} (${type})\n\n| sélecteur | mb @1440 | mb @390 |\n|---|---|---|\n`;
  const data={};
  for(const w of [1440,390]){
   const c=await b.newContext({viewport:{width:w,height:900},colorScheme:'dark'});
   const pg=await c.newPage();
   try{await pg.goto('http://localhost:3000/'+p,{waitUntil:'networkidle',timeout:15000});}catch(e){await c.close();continue;}
   await pg.waitForTimeout(250);
   const r=await pg.evaluate((sels)=>{const o={};for(const s of sels){const e=document.querySelector(s);
     o[s]=e?getComputedStyle(e).marginBottom:'—';}return o;},sels);
   data[w]=r; await c.close();
  }
  for(const s of sels){
   const a=(data[1440]||{})[s]||'—', m=(data[390]||{})[s]||'—';
   if(a==='—'&&m==='—') continue;
   rep+=`| \`${s}\` | ${a} | ${m} |\n`;
  }
 }
 fs.writeFileSync('.internal/audit-da-phase1/audit-spacing.md',rep);
 console.log(rep);
 await b.close();
})();
