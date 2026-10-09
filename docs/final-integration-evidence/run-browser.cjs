const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const pw=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const name=process.argv[2],allowed=['verify-fe-01','verify-public-shell','verify-workspace-fe01','verify-fe-02-browser','verify-fe-02-visual','verify-fe-03-browser','verify-fe-03-visual','browser-check','browser-interactions'];
if(!allowed.includes(name))throw Error('Unknown existing audit');
const out=path.join(process.cwd(),'docs/final-integration-evidence');
for(const folder of ['fe01','fe02','fe03','fe04-fe05'])fs.mkdirSync(path.join(out,folder),{recursive:true});
const warnings=[],watched=new WeakSet();
function watch(p){if(watched.has(p))return;watched.add(p);p.on('console',m=>{if(/hydrat|didn't match|server rendered HTML/i.test(m.text()))warnings.push({url:p.url(),type:m.type(),text:m.text()});});p.on('pageerror',e=>warnings.push({url:p.url(),type:'pageerror',text:e.message}));}
const launch=pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch=async(...args)=>{const b=await launch(...args),nc=b.newContext.bind(b),np=b.newPage.bind(b);b.newContext=async(...a)=>{const c=await nc(...a);c.on('page',watch);return c;};b.newPage=async(...a)=>{const p=await np(...a);watch(p);return p;};return b;};
process.on('exit',()=>fs.writeFileSync(path.join(out,name+'-console.json'),JSON.stringify(warnings,null,2)));
process.env.FE_BASE_URL='http://127.0.0.1:3114';process.env.FE03_URL=process.env.FE_BASE_URL;
const filename=path.join(process.cwd(),name.startsWith('browser-')?'docs/fe-04-05-evidence':'scripts',name+'.cjs');
let source=fs.readFileSync(filename,'utf8').replaceAll('http://localhost:3000',process.env.FE_BASE_URL).replaceAll('http://127.0.0.1:3000',process.env.FE_BASE_URL);
for(const [old,fresh]of [['fe-01','fe01'],['fe-02','fe02'],['fe-03','fe03'],['fe-04-05','fe04-fe05']])source=source.replaceAll('docs/'+old+'-evidence','docs/final-integration-evidence/'+fresh);
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(path.dirname(filename));runner._compile(source,filename);
