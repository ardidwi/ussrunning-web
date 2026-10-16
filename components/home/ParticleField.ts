import { generateTargets, type ParticleTargets } from "./particle-targets";
import { particleBudget, particlePose, particleProjection, seed, staggerBlend, type ParticleShape } from "./particle-motion";

/** One persistent particle population; masks only supply destinations, never visible layers. */
export class ParticleField {
  private ctx: CanvasRenderingContext2D | null;
  private targets: ParticleTargets | null = null;
  private positions = new Float32Array(0);
  private seeds = new Float32Array(0);
  private previous = new Float32Array(0);
  private rendered = new Float32Array(0);
  private tails = new Float32Array(0);
  private destination = new Float32Array(3);
  private width = 1;
  private height = 1;
  private mobile = false;
  private count = 0;
  private frame = 0;
  private lastTime = 0;
  private clock = 0;
  private formationStart = 0;
  private generation = 0;
  private disposed = false;
  private visible = true;
  private reduced = false;
  private progress = 0;
  private pointer = { x:0, y:0, active:false };

  constructor(private canvas: HTMLCanvasElement, private onFrame: (delta: number) => void = () => {}) { this.ctx = canvas.getContext("2d"); }

  resize() {
    if (this.disposed || !this.canvas.isConnected) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1,rect.width); this.height = Math.max(1,rect.height);
    this.mobile = window.innerWidth <= 860;
    this.setPointer(0,0,false);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(this.width*dpr); this.canvas.height = Math.round(this.height*dpr);
    this.ctx?.setTransform(dpr,0,0,dpr,0,0);
    const count = particleBudget(window.innerWidth);
    if (count !== this.count) {
      this.count = count; this.targets = null;
      this.positions = new Float32Array(count*3);
      this.seeds = new Float32Array(count);
      this.previous = new Float32Array(count*2);
      this.rendered = new Float32Array(count*4);
      this.tails = new Float32Array(count*2);
      this.previous.fill(Number.NaN);
      for (let i=0;i<count;i++) {
        this.seeds[i] = seed(i+17);
        this.writeShape("free",i,this.positions,i*3);
      }
      const generation = ++this.generation;
      this.canvas.dataset.particleGeneration = String(generation);
      generateTargets(count,this.mobile).then(targets => {
        if (this.disposed || generation !== this.generation) return;
        this.targets = targets;
        this.formationStart = this.clock;
        this.canvas.dataset.particleTargets = targets.ready ? "ready" : "fallback";
        this.request();
      }).catch(() => {
        // Art degrades to atmosphere; page content/navigation remain usable.
        if (!this.disposed && generation === this.generation) this.canvas.dataset.particleTargets = "unavailable";
      });
    }
    this.canvas.dataset.particleCount = String(count);
    this.request();
  }

  setProgress(progress: number) { this.progress = progress; this.request(); }
  setReduced(reduced: boolean) { this.reduced = reduced; this.setPointer(0,0,false); this.request(); }
  setPointer(x: number,y: number,active: boolean) {
    this.pointer = {x,y,active:active && !this.mobile && !this.reduced};
    this.canvas.dataset.particlePointer = this.pointer.active ? "on" : "off";
  }
  setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) { cancelAnimationFrame(this.frame); this.frame=0; this.lastTime=0; }
    else this.request();
  }
  destroy() {
    if (this.disposed) return;
    this.disposed=true; this.generation++; cancelAnimationFrame(this.frame); this.frame=0;
  }

  private request() {
    if (!this.frame && !this.disposed && this.visible && this.ctx) this.frame=requestAnimationFrame(this.draw);
  }

  private writeShape(shape: ParticleShape,index: number,out: Float32Array,offset: number) {
    const s = this.seeds[index], phase = index * 2.399963;
    if ((shape === "logo" || shape === "monas") && this.targets?.ready) {
      const points = this.targets[shape];
      out[offset]=points[index*3]; out[offset+1]=points[index*3+1]; out[offset+2]=points[index*3+2];
    } else if (shape === "logo" && this.targets) {
      out[offset]=this.targets.logo[index*3]; out[offset+1]=this.targets.logo[index*3+1]; out[offset+2]=0;
    } else if (shape === "stream" || shape === "release") {
      const u = (s + this.clock * (.000035 + seed(index+31)*.000025)) % 1;
      out[offset]=(u-.5)*9;
      out[offset+1]=(u-.5)*(shape === "release" ? -3.8 : 2.8) + Math.sin(phase+this.clock*.0004)*.22;
      out[offset+2]=(seed(index+71)-.5)*1.4;
    } else {
      out[offset]=Math.cos(phase)*(3.5+s*2.8);
      out[offset+1]=Math.sin(phase)*(2+s*1.8);
      out[offset+2]=(s-.5)*2;
    }
  }

  private draw = (time: number) => {
    this.frame=0;
    // React can detach the canvas before passive effect cleanup runs.
    if (!this.canvas.isConnected) { this.destroy(); return; }
    if (!this.ctx || !this.visible || this.disposed) return;
    const dt = Math.min(48,this.lastTime ? time-this.lastTime : 16);
    this.lastTime=time;
    this.onFrame(dt);
    if (!this.reduced) this.clock+=dt;
    const entrance = this.targets ? Math.min(1,(this.clock-this.formationStart)/2600) : 0;
    const pose = particlePose(this.progress,entrance,this.reduced);
    const unavailable = !this.targets || (pose.to === "monas" && !this.targets.ready);
    this.canvas.dataset.particlePhase=unavailable ? "FREE" : pose.phase;
    this.canvas.dataset.particleForm=unavailable ? "free" : pose.to;
    const ctx=this.ctx;
    ctx.clearRect(0,0,this.width,this.height);
    const { scale,x:cx,y:cy }=particleProjection(this.width,this.height,this.mobile);
    const t=this.reduced ? 0 : this.clock;
    const energy=-2.5+(t%6500)/6500*5;
    for (let i=0;i<this.count;i++) {
      const offset=i*3, s=this.seeds[i];
      this.writeShape(pose.from,i,this.destination,0);
      const ax=this.destination[0],ay=this.destination[1],az=this.destination[2];
      this.writeShape(pose.to,i,this.destination,0);
      const blend=staggerBlend(pose.blend,s);
      const life=this.reduced ? 0 : i%19===0 ? .065 : .012;
      let tx=ax+(this.destination[0]-ax)*blend+Math.sin(t*.0011+i*.73)*life;
      let ty=ay+(this.destination[1]-ay)*blend+Math.cos(t*.0009+i*.37)*life;
      const tz=az+(this.destination[2]-az)*blend;
      if (this.pointer.active && !this.mobile && !this.reduced) {
        const dx=cx+this.positions[offset]*scale-this.pointer.x;
        const dy=cy-this.positions[offset+1]*scale-this.pointer.y;
        const distance=Math.hypot(dx,dy)||1;
        if (distance<100) {
          const force=(1-distance/100)**2*5/scale;
          tx+=dx/distance*force; ty-=dy/distance*force;
        }
      }
      const ease=this.reduced ? 1 : 1-Math.exp(-dt/(90+s*130));
      this.positions[offset]+=(tx-this.positions[offset])*ease;
      this.positions[offset+1]+=(ty-this.positions[offset+1])*ease;
      this.positions[offset+2]+=(tz-this.positions[offset+2])*ease;
      const depth=12/(12-this.positions[offset+2]);
      const x=cx+this.positions[offset]*scale*depth, y=cy-this.positions[offset+1]*scale*depth;
      const red=i%53===0 || (pose.to==="monas" && Math.abs(this.positions[offset+1]-energy)<.085 && i%4===0);
      const alpha=i%19===0 ? .38 : .68+(this.reduced ? 0 : Math.sin(t*.0016+i)*.15);
      this.tails[i*2]=x; this.tails[i*2+1]=y;
      if (!this.reduced && pose.phase!=="FORMED" && i%7===0 && Number.isFinite(this.previous[i*2])) {
        const dx=x-this.previous[i*2],dy=y-this.previous[i*2+1],length=Math.hypot(dx,dy)||1;
        const tail=Math.min(this.mobile ? 5 : 12,length*2)/length;
        this.tails[i*2]=x-dx*tail; this.tails[i*2+1]=y-dy*tail;
      }
      this.rendered[i*4]=x; this.rendered[i*4+1]=y;
      this.rendered[i*4+2]=(this.mobile ? .6 : .65)+s*.5;
      this.rendered[i*4+3]=red ? (alpha>.75 ? 5 : 4) : i%19===0 ? 0 : alpha<.62 ? 1 : alpha<.74 ? 2 : 3;
      this.previous[i*2]=x; this.previous[i*2+1]=y;
    }
    // Batch canvas submissions by a small shimmer palette instead of thousands of fills.
    const palette=["rgba(248,247,242,.34)","rgba(248,247,242,.58)","rgba(248,247,242,.72)","rgba(248,247,242,.86)","rgba(255,59,33,.65)","rgba(255,59,33,.88)"];
    for (let bin=0;bin<palette.length;bin++) {
      ctx.beginPath();
      for(let i=0;i<this.count;i++)if(this.rendered[i*4+3]===bin) {
        const x=this.rendered[i*4],y=this.rendered[i*4+1],r=this.rendered[i*4+2];
        ctx.moveTo(x+r,y); ctx.arc(x,y,r,0,Math.PI*2);
      }
      ctx.fillStyle=palette[bin]; ctx.fill();
    }
    if (!this.reduced && pose.phase!=="FORMED") for(let red=0;red<2;red++) {
      ctx.beginPath();
      for(let i=0;i<this.count;i+=7)if(Number(this.rendered[i*4+3]>=4)===red) {
        ctx.moveTo(this.tails[i*2],this.tails[i*2+1]);ctx.lineTo(this.rendered[i*4],this.rendered[i*4+1]);
      }
      ctx.lineWidth=.6; ctx.strokeStyle=red ? "rgba(255,59,33,.25)" : "rgba(245,244,240,.12)";ctx.stroke();
    }
    if (!this.reduced) this.request();
  };
}
