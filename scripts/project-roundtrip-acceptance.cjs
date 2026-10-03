// Real VS Code commands and editor saves against an isolated loopback Blueprint API.
// Never signs in to a hosted account, mutates the owner fixture, publishes or deploys.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const {createHash, randomBytes} = require('node:crypto');
const assert = require('node:assert/strict');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const root = path.resolve(__dirname, '..');
const source = process.env.ROUNDTRIP_SOURCE_ROOT || path.resolve(root, '../ValkyrAI/examples/social-video-clipping');
const output = path.resolve(process.env.ROUNDTRIP_ACCEPTANCE_OUTPUT || path.join(root, 'output/roundtrip-acceptance'));
const esbuild = require(path.join(root, 'node_modules/esbuild'));
const AdmZip = require(path.join(root, 'node_modules/adm-zip'));
const {runTests} = require(path.join(root, 'node_modules/@vscode/test-electron'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

(async () => {
  const fixture = await fs.realpath(await fs.mkdtemp(path.join(process.platform === 'darwin' ? '/tmp' : os.tmpdir(), 'valoride-rt-')));
  let server; let failure; let result;
  try {
    const workspace = path.join(fixture, 'workspace');
    const extension = path.join(fixture, 'extension');
    await fs.mkdir(workspace); await fs.mkdir(extension); await fs.mkdir(output, {recursive:true});
    const manifestBytes = await fs.readFile(path.join(source, 'source-manifest.json'));
    const manifest = JSON.parse(manifestBytes);
    const files = new Map();
    for (const item of manifest.files) {
      assert(!path.isAbsolute(item.path) && !item.path.split(/[\\/]/).includes('..'));
      const bytes = await fs.readFile(path.join(source, item.path));
      assert.equal(sha(bytes), item.sha256, item.path); assert.equal(bytes.length, item.bytes);
      files.set(item.path, bytes);
    }
    const lineage = JSON.parse(files.get('generation-lineage.json'));
    assert.equal(lineage.scope, 'local_isolated_fixture'); assert.equal(lineage.productionGenerationProven, false);
    const generatedPath = `artifacts/generated-${manifest.version}.zip`;
    const generated = await fs.readFile(path.join(source, generatedPath)); assert.equal(sha(generated), lineage.packageSha256);
    const specificationPath = [...files.keys()].find(file => /\.openapi\.json$/.test(file)); assert(specificationPath);
    const specification = JSON.parse(files.get(specificationPath));
    const zip = new AdmZip(); for (const [file, bytes] of files) zip.addFile(file, bytes);
    zip.addFile('source-manifest.json', manifestBytes); zip.addFile(generatedPath, generated);
    let archiveBytes=zip.toBuffer();let portableExport;
    if(process.env.ROUNDTRIP_PORTABLE_EXPORT_PATH){
      archiveBytes=await fs.readFile(process.env.ROUNDTRIP_PORTABLE_EXPORT_PATH);
      const exported=new AdmZip(archiveBytes);const exportManifest=JSON.parse(exported.readAsText('export-manifest.json'));
      assert.equal(exportManifest.schemaVersion,1);
      for(const item of exportManifest.files){const bytes=exported.readFile(item.path);assert(bytes,item.path);assert.equal(sha(bytes),item.sha256,item.path);assert.equal(bytes.length,item.bytes,item.path);}
      assert.deepEqual(exported.readFile('project/source-manifest.json'),manifestBytes);assert.deepEqual(exported.readFile(generatedPath),generated);
      portableExport={sha256:sha(archiveBytes),entryCount:exported.getEntries().filter(entry=>!entry.isDirectory).length,files:exportManifest.files.map(item=>item.path)};
    }
    const archivePath = path.join(fixture, 'project-export.zip'); await fs.writeFile(archivePath, archiveBytes);
    const token = `fixture-${randomBytes(16).toString('hex')}`;
    let canonical = {applicationId:lineage.applicationId, specId:'22222222-2222-4222-8222-222222222222', filename:specificationPath, etag:'a'.repeat(64), specification};
    const requests = []; let puts = 0;
    server = http.createServer(async (req, res) => {
      const send = (status, body) => {res.writeHead(status, {'content-type':'application/json'}); res.end(JSON.stringify(body));};
      if (req.url === '/__fixture/state') return send(200, {requests, puts, canonical});
      if (req.url === '/__fixture/change') {
        canonical = {...canonical, etag:'c'.repeat(64), specification:{...canonical.specification, info:{...canonical.specification.info, description:'Remote fixture edit'}}};
        return send(200, canonical);
      }
      if (req.url !== `/v1/thorapi/applications/${lineage.applicationId}/openapi`) return send(404, {error:'fixture route unavailable'});
      requests.push({method:req.method, authenticated:req.headers.authorization === `Bearer ${token}` && req.headers.jwtsession === token});
      if (!requests.at(-1).authenticated) return send(401, {error:'unauthorized'});
      if (req.method === 'GET') return send(200, canonical);
      if (req.method !== 'PUT') return send(405, {error:'method unavailable'});
      const chunks=[]; for await (const chunk of req) chunks.push(chunk);
      const body=JSON.parse(Buffer.concat(chunks)); requests.at(-1).expectedEtag=body.expectedEtag;
      if (body.expectedEtag !== canonical.etag) return send(409, {error:'BLUEPRINT_REVISION_CONFLICT', currentEtag:canonical.etag});
      puts++; canonical={...canonical, specification:body.specification, etag:'b'.repeat(64)}; return send(200,canonical);
    });
    await new Promise((resolve,reject) => {server.once('error',reject);server.listen(0, '127.0.0.1', resolve);});
    const backend=`http://127.0.0.1:${server.address().port}/v1`;
    await fs.writeFile(path.join(extension,'package.json'),JSON.stringify({name:'valoride-roundtrip-fixture',publisher:'local-fixture',version:'1.0.0',engines:{vscode:'^1.103.0'},main:'./extension.cjs',activationEvents:['*'],contributes:{commands:[{command:'valoride.projects.import',title:'Import Local Project Package'},{command:'valoride.projects.syncBlueprint',title:'Synchronize Project Blueprint'},{command:'valoride.projects.publishSource',title:'Publish Project Source to GitHub'}]}}));
    await esbuild.build({stdin:{contents:`import * as vscode from 'vscode';import {registerProjectRoundTripCommands} from ${JSON.stringify(path.join(root,'src/commands/projectRoundTripCommands.ts'))};import {registerProjectGitPublishCommand} from ${JSON.stringify(path.join(root,'src/commands/projectGitPublishCommand.ts'))};export function activate(context){const channel=vscode.window.createOutputChannel('Round-trip fixture'),output={appendLine:message=>{console.log(message);channel.appendLine(message);}},resolve=target=>target instanceof vscode.Uri?target:undefined;context.subscriptions.push(...registerProjectRoundTripCommands(context,output,resolve,()=>{}),registerProjectGitPublishCommand(context,output,resolve));}`,resolveDir:root,loader:'ts'},outfile:path.join(extension,'extension.cjs'),bundle:true,platform:'node',format:'cjs',external:['vscode'],plugins:[{name:'fixture-session',setup(build){
      build.onResolve({filter:/(?:core\/storage\/state|utils\/serverValkyraiHost)$/},args=>({path:args.path,namespace:'fixture-session'}));
      build.onLoad({filter:/.*/,namespace:'fixture-session'},()=>({contents:`export const getSecret=async()=>process.env.ROUNDTRIP_FIXTURE_TOKEN;export const getValkyraiBasePath=()=>process.env.ROUNDTRIP_FIXTURE_BACKEND;`,loader:'js'}));
    }}]});
    const userData=path.join(fixture,'editor-user'); await fs.mkdir(path.join(userData,'User'),{recursive:true});
    await fs.writeFile(path.join(userData,'User/settings.json'),JSON.stringify({'security.workspace.trust.enabled':false,'telemetry.telemetryLevel':'off','update.mode':'none','extensions.autoCheckUpdates':false,'extensions.autoUpdate':false,'workbench.startupEditor':'none'}));
    const nativeCode=process.env.ROUNDTRIP_VSCODE_EXECUTABLE || '/Users/johnmcmahon/workspace/2025/valkyr/ValorIDE/.vscode-test/vscode-darwin-arm64-1.136.1/Visual Studio Code.app/Contents/MacOS/Code';
    await runTests({vscodeExecutablePath:nativeCode,extensionDevelopmentPath:extension,extensionTestsPath:path.join(root,'scripts/project-roundtrip-native-runner.cjs'),extensionTestsEnv:{ROUNDTRIP_FIXTURE:fixture,ROUNDTRIP_ARCHIVE:archivePath,ROUNDTRIP_SPECIFICATION_PATH:specificationPath,ROUNDTRIP_ORIGINAL_SHA:sha(generated),ROUNDTRIP_GENERATED_PATH:generatedPath,ROUNDTRIP_APPLICATION_ID:lineage.applicationId,ROUNDTRIP_PORTABLE_EXPORT:portableExport?'true':'false',ROUNDTRIP_FIXTURE_BACKEND:backend,ROUNDTRIP_FIXTURE_TOKEN:token},launchArgs:[workspace,'--disable-extensions','--skip-welcome','--skip-release-notes','--disable-telemetry',`--user-data-dir=${userData}`,`--extensions-dir=${path.join(fixture,'extensions')}`]});
    result=JSON.parse(await fs.readFile(path.join(fixture,'result.json'),'utf8'));
    assert(result.passed); assert(requests.every(item=>item.authenticated)); assert.equal(puts,1);
    result.requests=requests;result.ownerManifestSha256=sha(manifestBytes);result.ownerInputsUnchanged=sha(await fs.readFile(path.join(source,'source-manifest.json')))===sha(manifestBytes);
    if(portableExport){result.portableExport=portableExport;assert.equal(sha(await fs.readFile(process.env.ROUNDTRIP_PORTABLE_EXPORT_PATH)),portableExport.sha256);result.portableExport.ownerArchiveUnchanged=true;}
    for(const [relative,bytes] of files)assert.equal(sha(await fs.readFile(path.join(source,relative))),sha(bytes),relative);
    assert(result.ownerInputsUnchanged);
    const dependencies=JSON.parse(files.get('runtime/dependencies.json'));
    const storage=JSON.parse(files.get('runtime/storage-and-run.json'));
    assert(dependencies.required.includes('Python3.9+'));assert(dependencies.required.includes('FFmpeg'));assert.equal(storage.run.adapter,'runtime/render_clips.py');
    assert(dependencies.credentials.includes('secret references'));assert.equal(dependencies.verifiedLocal.usableOnAws,false);
    const generatedZip=new AdmZip(generated);
    const apiResolver=generatedZip.readAsText('typescript-redux-query/utils/resolveApiBaseUrl.ts');assert(apiResolver.includes('VITE_API_BASE_URL'));assert(apiResolver.includes('DEFAULT_LOCAL_REST_PORT'));
    const licenseFiles=generatedZip.getEntries().filter(entry=>/^(?:license|copying|notice)/i.test(path.basename(entry.entryName))).map(entry=>entry.entryName);
    result.portability={preservedSourceAndManifests:[...files.keys()],customerApiEndpointOverride:'VITE_API_BASE_URL',localApiPortDefault:8080,workflowRuntimeRequired:'Java17 compatible ValkyrAI LocalBashExecModule runtime',externalDependencies:['Python3.9+','FFmpeg','ffprobe','target H264 encoder'],modelProvidersConfigured:dependencies.inference.configured,privateStorageConfigured:Boolean(storage.storageKind),targetPlatformVerified:storage.deployment.targetPlatformVerified,credentials:'runtime secret references; no values copied',licenseFilesInOriginalGeneratedZip:licenseFiles,licenseInventoryComplete:licenseFiles.length>0,gplBuildFlagForSelectedLibx264:files.get('runtime/build-ffmpeg.sh').toString().includes('--enable-gpl'),fullIndependentBackendAuthAndModelExecutionProven:false};
    result.checks.portableSourcesDependencyRecipesAndCustomerEndpointOverrideCarried=true;
  } catch(error) {failure=error;result=await fs.readFile(path.join(fixture,'result.json'),'utf8').then(JSON.parse,()=>({passed:false,checks:{}}));result.error=error.message;}
  finally {
    if(server?.listening)await new Promise(resolve=>server.close(resolve));
    const processes=await promisify(execFile)('/bin/ps',['-axo','pid,ppid,command']);let stopped=0;
    for(const line of processes.stdout.split('\n')){const match=line.match(/^\s*(\d+)\s+\d+\s+(.+)$/);if(match&&match[2].includes(fixture)&&/Code|Electron|chrome_crashpad_handler/.test(match[2])){try{process.kill(Number(match[1]),'SIGTERM');stopped++;}catch{}}}
    await fs.rm(fixture,{recursive:true,force:true,maxRetries:10,retryDelay:100});
    result={...result,fixtureCleaned:true,ownedEditorProcessesStopped:stopped,noHostedWrites:true,noProductionRegistration:true};
    await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'project-roundtrip-native.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
  }
  if(failure)throw failure;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
