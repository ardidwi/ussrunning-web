import test from "node:test";
import assert from "node:assert/strict";
import { loader } from "./frontend-loader.mjs";
const load = loader();
const { particlePose, staggerBlend, particleBudget, seed, mobileParticleProgress, particleProjection } = load("components/home/particle-motion.ts");
const { sampleMask } = load("components/home/particle-targets.ts");
const { motionEase, smoothRange } = load("components/home/hero-motion.ts");
for (const [p, entrance, phase, target] of [
  [0,0,"FREE","logo"], [.1,.4,"ATTRACTING","logo"], [.25,1,"FORMED","logo"],
  [.39,1,"DISPERSING","stream"], [.48,1,"TRAVELING","stream"],
  [.6,1,"ATTRACTING","monas"], [.76,1,"FORMED","monas"],
  [.89,1,"DISPERSING","release"], [.97,1,"TRAVELING","release"],
]) test(`particle choreography at ${p}: ${phase} toward ${target}`, () => {
  const pose=particlePose(p,entrance,false);
  assert.equal(pose.phase,phase); assert.equal(pose.to,target);
  assert.ok(pose.blend>=0 && pose.blend<=1);
});
test("idle opening assembles instead of waiting for scroll", () => {
  assert.equal(particlePose(0,0,false).blend,0);
  assert.ok(particlePose(0,.5,false).blend>0);
  assert.equal(particlePose(0,1,false).phase,"FORMED");
});
test("each handoff shares a complete endpoint with the next state", () => {
  for (const boundary of [.2,.35,.5,.7,.85]) {
    const before=particlePose(boundary-1e-8,1,false), after=particlePose(boundary+1e-8,1,false);
    assert.equal(before.to,after.from);
    assert.ok(before.blend>.9999);
    assert.ok(after.blend<.0001 || after.from===after.to);
  }
});
test("staggering varies timing but preserves arrivals and departures", () => {
  assert.notEqual(staggerBlend(.5,.1),staggerBlend(.5,.9));
  for (const seed of [0,.2,.5,1]) {
    assert.equal(staggerBlend(0,seed),0); assert.equal(staggerBlend(1,seed),1);
  }
});
test("scroll poses are reversible and independent of earlier requests", () => {
  const first=particlePose(.6,1,false); particlePose(.98,1,false);
  assert.deepEqual(particlePose(.6,1,false),first);
});
test("reduced motion resolves stable particle forms, never a solid asset", () => {
  for (const p of [0,.2,.4,.5,.8,1]) {
    const pose=particlePose(p,0,true);
    assert.equal(pose.phase,"FORMED"); assert.equal(pose.from,pose.to);
    assert.equal(pose.to,p<.5?"logo":"monas");
  }
});
test("responsive budgets are bounded and smaller on mobile", () => {
  assert.equal(particleBudget(320),1300);
  assert.ok(particleBudget(768)<particleBudget(1024));
  assert.ok(particleBudget(1024)<particleBudget(1920));
  assert.equal(particleBudget(10000),3800);
});
test("seed phases are deterministic, bounded and varied", () => {
  const values=Array.from({length:100},(_,i)=>seed(i));
  assert.ok(values.every(x=>x>=0&&x<1)); assert.equal(new Set(values).size,100);
  assert.equal(seed(42),seed(42));
});
function mask() {
  const data=new Uint8ClampedArray(16*16*4);
  for(let y=4;y<12;y++)for(let x=4;x<12;x++)data.set([255,255,255,255],(y*16+x)*4);
  return data;
}
test("mask targets use occupied pixels rather than the entire rectangle", () => {
  const points=sampleMask(mask(),16,16,100,4,4,1);
  assert.equal(points.length,300);
  for(let i=0;i<100;i++) {
    assert.ok(points[i*3]>=-1&&points[i*3]<=.75);
    assert.ok(points[i*3+1]>=-.75&&points[i*3+1]<=1);
    assert.ok(Math.abs(points[i*3+2])<=.1);
  }
});
test("important contours receive an explicit sampling share", () => {
  const points=sampleMask(mask(),16,16,100,4,4,1);
  for(let i=0;i<100;i++)if(i%10<4) {
    const x=points[i*3],y=points[i*3+1];
    assert.ok(x===-1||x===.75||y===1||y===-.75);
  }
});
test("empty/black masks fail safely instead of fabricating a form", () => {
  assert.equal(sampleMask(new Uint8ClampedArray(16*16*4),16,16,50,4,4,1),null);
  const black=new Uint8ClampedArray(16*16*4); for(let i=3;i<black.length;i+=4)black[i]=255;
  assert.equal(sampleMask(black,16,16,50,4,4,1),null);
});
test("frame interpolation remains consistent across refresh rates and resume gaps", () => {
  const half=motionEase(32);
  assert.ok(Math.abs(1-(1-half)**2-motionEase(64))<1e-12);
  assert.equal(motionEase(2000),motionEase(64)); assert.equal(motionEase(-1),0);
  assert.equal(smoothRange(0,1,-1),0); assert.equal(smoothRange(0,1,2),1);
});

test("mobile Monas hold aligns to its reserved artwork slot", () => {
  const progress=mobileParticleProgress(1700,80,1700,2700);
  assert.ok(progress>.7&&progress<.85);
  assert.equal(particlePose(progress,1,false).to,"monas");
  assert.equal(particlePose(progress,1,false).phase,"FORMED");
});
test("mobile progression stays continuous, monotone and bounded", () => {
  let last=0;
  for(let scroll=0;scroll<=3000;scroll++) {
    const next=mobileParticleProgress(scroll,80,1700,2700);
    assert.ok(next>=last&&next<=1&&next-last<.01);last=next;
  }
});

test("mobile/tablet particle Monas fits below header without cropping the flame", () => {
  for(const [w,h] of [[310,568],[365,812],[420,932],[758,1024],[850,900]]) {
    const pose=particleProjection(w,h,true);
    assert.ok(pose.y-pose.scale*2.5>=93.99);
    assert.ok(pose.scale*5<=260);
    assert.ok(pose.x-pose.scale*3.2>=0);
    assert.ok(pose.x+pose.scale*3.2<=w);
  }
});
