const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.USERPROFILE,
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"));
(async () => {
  const output=path.resolve("docs/home-particle-evidence"); await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe"});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const report={cases:[],assertions:0,runtime:[],hydration:[],canvas:[],silhouettes:{}};
  function listen(target) {
    target.on("pageerror",error=>report.runtime.push(error.message));
    target.on("console",message=>{
      if(/hydration|hydrated|didn't match/i.test(message.text()))report.hydration.push(message.text());
      if(/(canvas|animation).*(error|failed|invalid)/i.test(message.text()))report.canvas.push(message.text());
    });
  }
  listen(page);
  const ok=(condition,message)=>{assert.ok(condition,message);report.assertions++;};
  async function check(name,run){await run();report.cases.push({name,result:"PASS"});}
  const field=page.locator(".uss-motion-canvas");
  const pixels=()=>field.evaluate(el=>el.toDataURL());
  async function travel(progress,wait=700,target=page){
    await target.evaluate(p=>{const el=document.querySelector(".uss-motion-story");scrollTo({top:(el.offsetHeight-innerHeight)*p,behavior:"instant"});},progress);
    await target.waitForTimeout(wait);
  }
  async function score(target,shape) {
    return target.locator(".uss-motion-canvas").evaluate(async (canvas,shape)=>{
      const image=new Image(); image.src=shape==="logo"?"/uss-logo.png":"/monas-hero.svg"; await image.decode();
      const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,mobile=innerWidth<=860;
      const cx=w*(mobile?.5:.73),cy=mobile?Math.min(240,Math.max(180,h*.28)):h*.5;
      const scale=mobile?Math.min(w*.13,h*.088,52,(cy-94)/2.5):Math.min(w*.075,h*.15);
      const mask=document.createElement("canvas");mask.width=canvas.width;mask.height=canvas.height;
      const ctx=mask.getContext("2d");ctx.scale(canvas.width/w,canvas.height/h);
      const ratio=Math.min((shape==="logo"?6.4:3.33)*scale/image.width,(shape==="logo"?2.4:5)*scale/image.height)*.94;
      ctx.drawImage(image,cx-image.width*ratio/2,cy-image.height*ratio/2,image.width*ratio,image.height*ratio);
      const expected=ctx.getImageData(0,0,mask.width,mask.height).data;
      const rendered=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
      let total=0,inside=0;
      for(let y=0;y<canvas.height;y+=2)for(let x=0;x<canvas.width;x+=2){
        const offset=(y*canvas.width+x)*4;
        if(rendered[offset+3]<60||rendered[offset]+rendered[offset+1]+rendered[offset+2]<270)continue;
        total++; let hit=false;
        for(const dy of [-6,0,6])for(const dx of [-6,0,6]){
          const px=x+dx,py=y+dy;
          if(px>=0&&py>=0&&px<mask.width&&py<mask.height&&expected[(py*mask.width+px)*4+3]>45)hit=true;
        }
        if(hit)inside++;
      }
      return {ratio:inside/Math.max(1,total),pixels:total};
    },shape);
  }
  try {
    await page.goto(process.env.FE_BASE_URL||"http://localhost:3100",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector(".uss-motion-canvas")?.dataset.particleTargets==="ready");
    const generation=await field.getAttribute("data-particle-generation");
    const count=await field.getAttribute("data-particle-count");
    let formed;
    await check("One particle world with no visible mask or ring overlays",async()=>{
      ok(await page.locator(".uss-motion-canvas").count()===1,"Single renderer");
      ok(await page.locator(".uss-hero-orbit,.uss-motion-monas-photo,.uss-hero-mobile-art img,.uss-motion-stage svg").count()===0,"No solid logo/Monas or rings");
      ok(Number(count)===3800,"Bounded desktop density");
    });
    await check("Particles enter and converge into USS while idle",async()=>{
      const early=await score(page,"logo");
      await page.screenshot({path:path.join(output,"01-gathering.png"),caret:"initial"});
      await page.waitForTimeout(3200);
      formed=await score(page,"logo");
      report.silhouettes.logo={initial:early.ratio,formed:formed.ratio};
      ok(formed.ratio>.75,`USS mask agreement ${formed.ratio}`);
      ok(formed.ratio>early.ratio+.15,`Convergence is visible: ${early.ratio} -> ${formed.ratio}`);
      ok(formed.pixels>1200,"Logo is drawn by many particle pixels");
      ok(await field.getAttribute("data-particle-phase")==="FORMED","Logo hold reached without scroll");
      await page.screenshot({path:path.join(output,"02-uss-formed.png"),caret:"initial"});
    });
    await check("Formed logo remains alive, and pointer disturbance stays readable",async()=>{
      const before=await pixels();
      await page.waitForFunction(snapshot => document.querySelector(".uss-motion-canvas").toDataURL() !== snapshot,before,{timeout:4000});
      ok(before!==await pixels(),"Internal particle life continues in the held form");
      const text=await page.locator(".uss-motion-copy h1").boundingBox();
      await page.mouse.move(1040,450);await page.waitForTimeout(250);
      ok(await field.getAttribute("data-particle-pointer")==="on","Fine pointer enables restrained disturbance");
      ok((await score(page,"logo")).ratio>.72,"Pointer cannot destroy the silhouette");
      const after=await page.locator(".uss-motion-copy h1").boundingBox();
      ok(Math.abs(text.x-after.x)<.5&&Math.abs(text.y-after.y)<.5,"Text does not follow the pointer");
      await page.mouse.move(-1,-1);await page.waitForTimeout(250);
      ok(await field.getAttribute("data-particle-pointer")==="off","Pointer departure releases disturbance");
    });
    await check("USS particles disperse and stream instead of crossfading",async()=>{
      await travel(.4);
      ok(await field.getAttribute("data-particle-phase")==="DISPERSING","Departure phase");
      await travel(.47);
      ok(await field.getAttribute("data-particle-phase")==="TRAVELING","Directional stream phase");
      ok((await score(page,"logo")).ratio<formed.ratio-.2,"Material has left USS destinations");
      ok(await field.getAttribute("data-particle-generation")===generation,"Population buffer is retained");
      ok(await field.getAttribute("data-particle-count")===count,"Particles are not swapped for another layer");
      await page.screenshot({path:path.join(output,"03-stream.png"),caret:"initial"});
    });
    await check("The same particles gather into readable Monas and hold alive",async()=>{
      await travel(.59);
      ok(await field.getAttribute("data-particle-phase")==="ATTRACTING","Monas is assembled, not opacity swapped");
      await page.screenshot({path:path.join(output,"04-monas-assembling.png"),caret:"initial"});
      await travel(.76,1100);
      const monument=await score(page,"monas");
      report.silhouettes.monas=monument.ratio;
      ok(monument.ratio>.74,`Monas mask agreement ${monument.ratio}`);
      ok(monument.pixels>900,"Dense monument and structural edges");
      ok(await field.getAttribute("data-particle-phase")==="FORMED","Monument holds");
      ok(await field.getAttribute("data-particle-generation")===generation,"USS/Monas share the population");
      const before=await pixels();await page.waitForTimeout(350);
      ok(before!==await pixels(),"Monument shimmer/red energy remains alive");
      await page.screenshot({path:path.join(output,"05-monas-formed.png"),caret:"initial"});
    });
    await check("Release, reverse scroll, distance and native exit handoff",async()=>{
      await travel(.94);
      ok(await field.getAttribute("data-particle-form")==="release","Monas releases into the later scene");
      ok((await score(page,"monas")).ratio<.65,"Monument material departs its silhouette");
      await page.screenshot({path:path.join(output,"06-release.png"),caret:"initial"});
      await travel(.27,1100);
      ok((await score(page,"logo")).ratio>.73,"Reverse scrolling regroups the same particles into USS");
      ok(Math.abs(parseInt(await page.locator(".uss-motion-distance").textContent())-1350)<15,"Distance remains tied to native scroll");
      await travel(1.08);
      const opacity=await page.locator(".uss-motion-stage").evaluate(el=>Number(getComputedStyle(el).opacity));
      ok(opacity>0&&opacity<1,"Continuous exit fade after the particle story");
      await page.locator("#uss-next-runs").evaluate(el=>el.scrollIntoView({block:"start",behavior:"instant"}));
      await page.waitForTimeout(400);
      const still=await pixels();await page.waitForTimeout(250);
      ok(still===await pixels(),"Renderer pauses offscreen");
    });
    await check("Live reduced motion holds particle forms and disables pointer movement",async()=>{
      await page.emulateMedia({reducedMotion:"reduce"});
      await travel(.27,400);
      ok((await score(page,"logo")).ratio>.75,"Reduced-motion logo uses particles");
      const before=await pixels();await page.mouse.move(1100,450);await page.waitForTimeout(250);
      ok(before===await pixels(),"No continuous or pointer motion");
      ok(await field.getAttribute("data-particle-pointer")==="off","Pointer remains off");
      await travel(.76,400);
      ok((await score(page,"monas")).ratio>.75,"Reduced-motion monument remains a particle form");
      const monument=await pixels();await page.waitForTimeout(250);
      ok(monument===await pixels(),"Monument stays calm");
      await page.screenshot({path:path.join(output,"reduced-motion.png"),caret:"initial"});
      await page.emulateMedia({reducedMotion:"no-preference"});await page.waitForTimeout(300);
      ok(monument!==await pixels(),"Particle life resumes after preference change");
    });
    await check("Mobile preserves particle formation with a smaller population",async()=>{
      const context=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
      const mobile=await context.newPage();listen(mobile);
      await mobile.goto(process.env.FE_BASE_URL||"http://localhost:3100",{waitUntil:"networkidle"});
      await mobile.waitForFunction(()=>document.querySelector(".uss-motion-canvas").dataset.particleTargets==="ready");
      await mobile.waitForTimeout(3200);
      const canvas=mobile.locator(".uss-motion-canvas");
      ok(Number(await canvas.getAttribute("data-particle-count"))===1300,"Adaptive mobile density");
      ok((await score(mobile,"logo")).ratio>.7,"Mobile logo forms from particles");
      await mobile.mouse.move(280,240);await mobile.waitForTimeout(250);
      ok(await canvas.getAttribute("data-particle-pointer")==="off","Touch/coarse pointers cannot disturb the field");
      const before=await canvas.evaluate(el=>el.toDataURL());await mobile.waitForTimeout(300);
      ok(before!==await canvas.evaluate(el=>el.toDataURL()),"Mobile keeps internal particle motion");
      await mobile.screenshot({path:path.join(output,"mobile-uss.png"),caret:"initial"});
      await mobile.locator(".uss-hero-mobile-art").nth(1).evaluate(el => {
        const center=Math.min(240,Math.max(180,innerHeight*.28));
        scrollTo({top:el.getBoundingClientRect().top+scrollY+el.offsetHeight*.5-center,behavior:"instant"});
      });
      await mobile.waitForTimeout(1100);
      ok((await score(mobile,"monas")).ratio>.7,"Mobile monument uses the same particle language");
      ok(await mobile.locator(".uss-hero-mobile-art img").count()===0,"No static mobile replacement");
      ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"No mobile overflow");
      await mobile.screenshot({path:path.join(output,"mobile-monas.png"),caret:"initial"});
      await context.close();
    });
    await check("Mask failure degrades to atmosphere without runtime failure",async()=>{
      const context=await browser.newContext();const fallback=await context.newPage();listen(fallback);
      await fallback.route("**/monas-hero.svg",route=>route.abort());
      await fallback.goto(process.env.FE_BASE_URL||"http://localhost:3100",{waitUntil:"networkidle"});
      await fallback.waitForFunction(()=>document.querySelector(".uss-motion-canvas").dataset.particleTargets==="fallback");
      await travel(.76,300,fallback);
      ok(await fallback.locator(".uss-motion-canvas").getAttribute("data-particle-form")==="free","No fabricated monument after mask failure");
      ok(await fallback.locator(".uss-motion-copy a").first().getAttribute("href")!==null,"Navigation/content remain available");
      await context.close();
    });
    await check("Document visibility events pause and resume the renderer",async()=>{
      await page.evaluate(()=>{
        Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});
        document.dispatchEvent(new Event("visibilitychange"));
      });
      const still=await pixels();await page.waitForTimeout(250);
      ok(still===await pixels(),"No frame updates while visibility is hidden");
      ok(await page.locator(".uss-motion-story").getAttribute("data-motion-visible")==="false","Presentation reports paused state");
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event("visibilitychange"));});
      await page.waitForFunction(snapshot=>document.querySelector(".uss-motion-canvas").toDataURL()!==snapshot,still,{timeout:4000});
      ok(still!==await pixels(),"Renderer resumes from the same population");
    });
    await check("App Router unmount/remount cleans animation and observers",async()=>{
      await page.evaluate(()=>{
        window.__orphanParticleDraws=0;
        const canvas=document.querySelector(".uss-motion-canvas"),ctx=canvas.getContext("2d"),original=ctx.clearRect;
        ctx.clearRect=function(...args){if(!canvas.isConnected)window.__orphanParticleDraws++;return original.apply(this,args);};
      });
      await page.getByRole("navigation",{name:"Main navigation",exact:true}).getByRole("link",{name:"ABOUT",exact:true}).click();
      await page.waitForURL("**/about");
      await page.locator(".uss-motion-canvas").waitFor({state:"detached"});
      await page.waitForTimeout(350);
      ok(await page.locator(".uss-motion-canvas").count()===0,"No renderer outside homepage");
      ok(await page.evaluate(()=>window.__orphanParticleDraws)===0,"No orphan RAF draws after SPA unmount");
      await page.getByRole("link",{name:"USS Running home",exact:true}).click();
      await page.waitForURL(url=>url.pathname==="/");
      await page.waitForFunction(()=>document.querySelector(".uss-motion-canvas")?.dataset.particleTargets==="ready");
      ok(await field.count()===1,"Exactly one renderer after remount");
    });
    ok(report.runtime.length===0,"Zero runtime errors");ok(report.hydration.length===0,"Zero hydration warnings");ok(report.canvas.length===0,"Zero canvas/animation errors");
    report.result="PASS";
  }catch(error){report.result="FAIL";report.error=String(error);process.exitCode=1;}
  finally{await fs.writeFile(path.join(output,"motion-report.json"),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
