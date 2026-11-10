/* Browser contract smoke. Run the matching ValkyrAI website with Vite on
 * 127.0.0.1:5228 first. All browser HTTP is intercepted; no production network,
 * credentials, documents or actual generation are used. */
const fs = require("node:fs/promises"), path = require("node:path"), os = require("node:os");
const assert = require("node:assert/strict"), Module = require("node:module");
const puppeteer = require("puppeteer-core"), esbuild = require("esbuild");
const website = "https://valkyrlabs.com", parent = "https://harness.vscode-webview.net";
const dev = new URL(process.env.BLUEPRINT_VITE_ORIGIN || "http://127.0.0.1:5228");
if (dev.hostname !== "127.0.0.1") throw new Error("This smoke uses a loopback Vite server only.");
const id="11111111-1111-4111-8111-111111111111", rev="22222222-2222-4222-8222-222222222222", next="33333333-3333-4333-8333-333333333333";
const spec = {openapi:"3.0.3",info:{title:"Browser smoke",version:"1.0"},paths:{"/first":{}},components:{
  schemas:{Customer:{type:"object",properties:{name:{type:"string"}}}},
  parameters:{PageSize:{name:"limit",in:"query",schema:{type:"integer"},"x-example":"preserve"}}}};
const uri = fsPath => ({scheme:"file",fsPath});
async function main() {
  const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),"valoride-blueprint-browser-")));
  let browser;
  try {
    const upload=path.join(dir,"input.yaml"), exported=path.join(dir,"out.json"), project=path.join(dir,"projects","Browser-smoke-v1.0");
    await fs.mkdir(project,{recursive:true});await fs.writeFile(path.join(project,".valoride-generation.json"),JSON.stringify({
      schemaVersion:2,applicationId:id,applicationName:spec.info.title,applicationVersion:spec.info.version,files:{}}));
    await fs.writeFile(upload,"openapi: 3.0.3\ninfo: {title: Browser smoke, version: '1.0', description: Imported}\npaths: {/fixture: {}}\nx-probe: kept\n");
    let onMessage, page, html, generation;
    const writes=[], siteApiCalls=[];
    const doc={applicationId:id,specId:rev,etag:"a".repeat(64),specification:spec,filename:"demo.yaml"};
    const stubs = {
      vscode:{ViewColumn:{Active:-1},Uri:{joinPath:(base,p)=>uri(path.join(base.fsPath,p))},workspace:{isTrusted:true,getConfiguration:()=>({get:()=>"thorapi"}),workspaceFolders:[{uri:uri(dir)}],fs:{
        stat:u=>fs.stat(u.fsPath),readFile:u=>fs.readFile(u.fsPath),writeFile:(u,b)=>fs.writeFile(u.fsPath,b)}},window:{
        createWebviewPanel:()=>({webview:{set html(s){html=s;},onDidReceiveMessage:h=>{onMessage=h;},postMessage:m=>page.evaluate(m=>window.postMessage(m,location.origin),m)},onDidDispose:()=>{}}),
        showOpenDialog:async()=>[uri(upload)],showSaveDialog:async()=>uri(exported),showWarningMessage:async()=>"Save and regenerate"}},
      core:{getSecret:async()=>"fixture-only"},host:{getValkyraiBasePath:()=>"https://api-0.valkyrlabs.com/v1"},
      download:{downloadApplicationArtifact:async q=>{generation=q;return{extractedPath:dir};}},
      rtk:{ValkyrLabsApiError:class extends Error{},getValkyrLabsRtkApiClient:()=>({request:async q=>{
        assert.equal(new URL(q.url).pathname,`/v1/thorapi/applications/${id}/openapi`);
        if(q.method==="PUT"){assert.equal(q.json.expectedEtag,doc.etag);writes.push(q.json.specification);Object.assign(doc,{specification:q.json.specification,specId:next,etag:"b".repeat(64)});}
        return {data:{...doc}};}})}
    };
    globalThis.blueprintSmoke = stubs;
    const compiled=await esbuild.build({entryPoints:["src/views/openapi/OpenAPIEditorPanel.ts"],platform:"node",write:false,format:"cjs",bundle:true,packages:"external",plugins:[{
      name:"offline-host",setup(build){ for(const [filter,name] of [[/^vscode$/,"vscode"],[/@core\/storage\/state$/,"core"],[/serverValkyraiHost$/,"host"],[/applicationArtifactDownload$/,"download"],[/ValkyrLabsRtkApi$/,"rtk"]]){
        build.onResolve({filter},()=>({path:name,namespace:"host"}));}
        build.onLoad({filter:/.*/,namespace:"host"},a=>({contents:`module.exports=globalThis.blueprintSmoke.${a.path}`}));
      }}]});
    const mod=new Module("blueprintSmoke",module);mod.paths=module.paths;mod._compile(compiled.outputFiles[0].text,"OpenAPIEditorPanel.cjs");
    mod.exports.OpenAPIEditorPanel.open({},{applicationId:id,applicationName:"Browser fixture",selectedWorkspace:uri(dir),selectedProject:uri(project)});
    browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true,
      args:["--disable-background-networking","--disable-extensions","--no-first-run","--disable-component-update","--disable-features=Translate,MediaRouter"]});
    page=await browser.newPage(); await page.setViewport({width:1100,height:820});
    await page.exposeFunction("sendToNative",m=>onMessage(m));
    await page.evaluateOnNewDocument(origin=>{if(location.origin===origin)window.acquireVsCodeApi=()=>({postMessage:window.sendToNative});},parent);
    await page.setRequestInterception(true);
    page.on("request",async request=>{
      try {
        const url=new URL(request.url());
        if(url.origin===parent) return await request.respond({status:200,contentType:"text/html",body:html});
        if(url.origin!==website){ if(["data:","blob:"].includes(url.protocol))return await request.continue(); return await request.abort(); }
        // The native test intercepts auth and canonical writes. A website attempting
        // to fetch private specs or initiate generation is a contract violation.
        if(/^\/(v1|api)\//.test(url.pathname)) { siteApiCalls.push(url.pathname); throw new Error("Unexpected website API request: "+url.pathname); }
        const r=await fetch(new URL(url.pathname+url.search,dev),{redirect:"error"});
        return await request.respond({status:r.status,contentType:r.headers.get("content-type")||"application/octet-stream",body:Buffer.from(await r.arrayBuffer())});
      }catch(e){console.error(String(e));await request.abort().catch(()=>{});}
    });
    page.on("pageerror",e=>console.error("renderer:",e.message));
    await page.goto(parent,{waitUntil:"domcontentloaded",timeout:90000});
    // Initial Vite optimization can exceed the release build's readiness timeout;
    // the handshake remains valid and clears the retry UI once chunks arrive.
    await page.waitForFunction(()=>document.getElementById("status").textContent.includes("Editing this application"),{timeout:180000});
    const studio=page.frames().find(f=>f.url().includes("/openapi-designer/valoride"));
    assert.ok(studio);await studio.waitForSelector("main[aria-label='Application Blueprint']");
    const clickText=(f,label)=>f.evaluate(label=>{
      const b=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()===label);if(!b)throw Error("Missing "+label);b.click();
    },label);
    assert.match(await studio.evaluate(()=>document.body.innerText),/Customer/);
    await studio.evaluate(()=>[...document.querySelectorAll('[aria-label="component type"] button')].find(b=>b.textContent.startsWith("Parameters")).click());
    const [,newComponent]=await studio.$$(".openapi-studio-component-toolbar input");
    await newComponent.type("NewVersion");await clickText(studio,"Add");
    await studio.waitForFunction(()=>document.querySelector(".openapi-studio-component-layout")?.textContent.includes("NewVersion"));
    await page.click("#export");await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("Downloaded"));
    const built=JSON.parse(await fs.readFile(exported,"utf8"));assert.deepEqual(built.components.parameters.PageSize,spec.components.parameters.PageSize);
    assert.equal(built.components.parameters.NewVersion.name,"NewVersion");assert.equal(built.components.parameters.limit,undefined);
    await page.click("#import");
    await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("Local file loaded"));
    await clickText(studio,"Source");
    const editor=await studio.waitForSelector(".monaco-editor textarea, .monaco-editor .native-edit-context",{timeout:45000});
    await editor.focus(); await page.keyboard.down("Meta");await page.keyboard.press("a");await page.keyboard.up("Meta");
    await (await page.createCDPSession()).send("Input.insertText",{text:"openapi: 3.0.3\ninfo: {title: Browser smoke, version: '1.0', description: Edited in the hosted designer}\npaths: {/fixture: {}}\nx-probe: kept\n"});
    await page.click("#export");await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("Downloaded"));
    const downloaded=JSON.parse(await fs.readFile(exported,"utf8"));assert.equal(downloaded.info.description,"Edited in the hosted designer");assert.equal(downloaded["x-probe"],"kept");
    await page.click("#generate");await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("Regenerated project"));
    assert.deepEqual(writes,[downloaded]);assert.equal(generation.applicationId,id);assert.equal(generation.expectedSpecId,next);assert.equal(generation.selectedProjectRoot,project);assert.deepEqual(siteApiCalls,[]);
    console.log("PASS: real hosted Design Center Build + Source; local file -> edit -> download -> ETag save -> pinned generation handoff (fixture).");
  } finally { if(browser)await browser.close(); delete globalThis.blueprintSmoke; await fs.rm(dir,{recursive:true,force:true}); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
