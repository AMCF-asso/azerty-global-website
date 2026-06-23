const { chromium } = require('@playwright/test');
const fs=require('fs');
const pages = fs.readdirSync('.').filter(f=>f.endsWith('.html'));
const widths=[412,360];
(async()=>{
 const b=await chromium.launch({channel:'chrome'});
 let report='';
 for(const p of pages){ for(const w of widths){
   const c=await b.newContext({viewport:{width:w,height:900},colorScheme:'dark'});
   const pg=await c.newPage();
   try{await pg.goto('http://localhost:3000/'+p,{waitUntil:'networkidle',timeout:20000});}
   catch(e){report+=`\n${p} @${w}: LOAD ERR\n`;await c.close();continue;}
   await pg.waitForTimeout(250);
   const res=await pg.evaluate((vw)=>{
     const out=[];
     for(const el of document.querySelectorAll('body *')){
       const cs=getComputedStyle(el);
       if(cs.display==='none'||cs.visibility==='hidden'||cs.position==='fixed')continue;
       const r=el.getBoundingClientRect();
       if(r.width===0||r.height===0)continue;
       const cls=(el.getAttribute('class')||'').slice(0,38);
       const txt=(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,46);
       const pr=el.parentElement?el.parentElement.getBoundingClientRect():null;
       const overV=r.right>vw+2;
       const parentOver=pr?pr.right>vw+2:false;
       const scrollable=['auto','scroll'].includes(cs.overflowX);
       const clip=!scrollable&&el.scrollWidth>el.clientWidth+2&&el.clientWidth>0;
       if(overV&&!parentOver)out.push(`  [VP>${vw}] <${el.tagName.toLowerCase()}.${cls}> right=${Math.round(r.right)} ws=${cs.whiteSpace} "${txt}"`);
       else if(clip&&txt&&el.children.length<=2)out.push(`  [CLIP] <${el.tagName.toLowerCase()}.${cls}> sw=${el.scrollWidth}>cw=${el.clientWidth} ws=${cs.whiteSpace} "${txt}"`);
     }
     return out;
   },w);
   if(res.length){report+=`\n### ${p} @${w} (${res.length})\n`+res.slice(0,14).join('\n')+'\n';}
   await c.close();
 }}
 fs.writeFileSync('.internal/audit-da-phase1/overflow-report.txt',report||'CLEAN');
 console.log(report||'AUCUN DEBORDEMENT');
 await b.close();
})();
