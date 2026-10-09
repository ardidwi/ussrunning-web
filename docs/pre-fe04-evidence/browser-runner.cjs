const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const playwright = require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const suite = process.argv[2];
const output = path.join(process.cwd(),'docs/pre-fe04-evidence');
fs.mkdirSync(output,{recursive:true});
const warnings=[];
const watched=new WeakSet();
function watch(page){if(watched.has(page))return;watched.add(page);page.on('console',m=>{if(/hydrat|didn't match|server rendered HTML/i.test(m.text()))warnings.push({url:page.url(),type:m.type(),text:m.text()});});page.on('pageerror',e=>warnings.push({url:page.url(),type:'pageerror',text:e.message}));}
const launch=playwright.chromium.launch.bind(playwright.chromium);
playwright.chromium.launch=async (...args)=>{const browser=await launch(...args);const nc=browser.newContext.bind(browser);browser.newContext=async(...a)=>{const c=await nc(...a);c.on('page',watch);return c;};const np=browser.newPage.bind(browser);browser.newPage=async(...a)=>{const p=await np(...a);watch(p);return p;};return browser;};
process.on('exit',()=>fs.writeFileSync(path.join(output,suite+'-console.json'),JSON.stringify(warnings,null,2)));
process.env.FE_BASE_URL='http://127.0.0.1:3104';process.env.FE03_URL='http://127.0.0.1:3104';
const filename=path.join(process.cwd(),'scripts',suite+'.cjs');
const source=fs.readFileSync(filename,'utf8').replaceAll('http://127.0.0.1:3000','http://127.0.0.1:3104');
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(path.dirname(filename));runner._compile(source,filename);
