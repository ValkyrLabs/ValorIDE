// Local import/package acceptance against the clipping owner's immutable fixture.
// This never publishes a Blueprint, invents a generation receipt, or deploys.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {createHash, randomUUID} = require('node:crypto');
const {execFile, spawn} = require('node:child_process');
const {promisify} = require('node:util');
const exec = promisify(execFile);
const valor = process.env.CLIPPING_VALORIDE_ROOT || path.resolve(__dirname, '..');
const source = process.env.CLIPPING_SOURCE_ROOT || path.resolve(valor, '../ValkyrAI/examples/social-video-clipping');
const output = path.resolve(process.env.CLIPPING_ACCEPTANCE_OUTPUT || path.join(valor, 'output/clipping-acceptance'));
const sha = data => createHash('sha256').update(data).digest('hex');
const esbuild = require(path.join(valor, 'node_modules/esbuild'));
const AdmZip = require(path.join(valor, 'node_modules/adm-zip'));
const net = require('node:net');

(async()=>{
  const temporary = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'valoride-clipping-')));
  const result = {scope:'local_isolated_fixture', productionGenerationProven:false, noHostedWrites:true, noPaidAws:true, checks:{}, blockers:[]};
  let ui;
  try {
    await fs.mkdir(output,{recursive:true});
    const manifestBytes=await fs.readFile(path.join(source,'source-manifest.json'));
    const manifest=JSON.parse(manifestBytes); result.sourceManifestSha256=sha(manifestBytes);
    assert.equal(manifest.awsReady,false);
    const files=new Map();
    for(const item of manifest.files){
      assert(!path.isAbsolute(item.path) && !item.path.split(/[\\/]/).includes('..'));
      const bytes=await fs.readFile(path.join(source,item.path));
      assert.equal(sha(bytes),item.sha256,item.path);assert.equal(bytes.length,item.bytes,item.path);
      files.set(item.path,bytes);
    }
    files.set('source-manifest.json',manifestBytes);
    const lineage=JSON.parse(files.get('generation-lineage.json'));assert.equal(lineage.scope,'local_isolated_fixture');assert.equal(lineage.productionGenerationProven,false);
    const original=await fs.readFile(path.join(source,`artifacts/generated-${manifest.version}.zip`));
    assert.equal(sha(original),lineage.packageSha256);result.generatedZipSha256=sha(original);
    const specification=JSON.parse(files.get('clipping-service.openapi.json'));
    const identity={applicationId:lineage.applicationId,applicationName:specification.info.title,applicationVersion:manifest.version};
    assert.equal(specification.info.version,manifest.version);
    const exchange=new AdmZip();for(const [relative,bytes] of files)exchange.addFile(relative,bytes);
    exchange.addFile(`artifacts/generated-${manifest.version}.zip`,original);
    const exchangeBytes=exchange.toBuffer();
    const exportFile=path.join(output,`John-Social-Video-Clipping-v${manifest.version}-project-export.zip`);
    await fs.writeFile(exportFile,exchangeBytes);result.projectExport={path:exportFile,sha256:sha(exchangeBytes),bytes:exchangeBytes.length,scope:lineage.scope};
    result.checks.currentOwnerManifestAndImmutableArtifactVerified=true;
    result.checks.projectExportCarriesAuthoredSourcesAndOriginalNestedZip=true;
    const tools=path.join(temporary,'tools.cjs');
    await esbuild.build({stdin:{contents:`export * from ${JSON.stringify(path.join(valor,'src/services/generatedProjectInstall.ts'))};export * from ${JSON.stringify(path.join(valor,'src/services/generatedProjectConfiguration.ts'))};export * from ${JSON.stringify(path.join(valor,'src/integrations/explorer/projectRuntime.ts'))};export {createApplicationSourceArchive} from ${JSON.stringify(path.join(valor,'src/services/applicationSourcePublish.ts'))};export {extractLocalZip} from ${JSON.stringify(path.join(valor,'src/utils/zipExtractor.ts'))};`,resolveDir:valor,loader:'ts'},outfile:tools,bundle:true,platform:'node',format:'cjs',plugins:[{name:'isolated-fixture-boundary',setup(build){
      build.onResolve({filter:/^vscode$/},()=>({path:'vscode',namespace:'fixture'}));
      build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`const fs=require('node:fs/promises');exports.Uri={file:fsPath=>({fsPath})};exports.workspace={fs:{createDirectory:u=>fs.mkdir(u.fsPath,{recursive:true}),writeFile:(u,b)=>fs.writeFile(u.fsPath,b)}};`,loader:'js'}));
      build.onResolve({filter:/^@core\/storage\/state$|^@utils\/(path|serverValkyraiHost)$|\.\/valkyrai\/ValkyrLabsRtkApi$/},args=>({path:args.path,namespace:'deny-hosted'}));
      build.onLoad({filter:/.*/,namespace:'deny-hosted'},()=>({contents:`exports.getSecret=()=>{throw new Error('Hosted writes are forbidden in this fixture')};exports.getWorkspacePath=()=>undefined;exports.getValkyraiBasePath=()=>undefined;exports.getValkyrLabsRtkApiClient=()=>{throw new Error('Hosted writes are forbidden in this fixture')};`,loader:'js'}));
    }}]});
    const api=require(tools),incomingParent=path.join(temporary,'incoming');await fs.mkdir(incomingParent);
    const archive=path.join(temporary,'original.zip');await fs.writeFile(archive,original);
    const incoming=await api.extractLocalZip(archive,incomingParent,identity.applicationName,{fresh:true});
    for(const [relative,bytes] of files){const target=path.join(incoming,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}
    const nested=path.join(incoming,`artifacts/generated-${manifest.version}.zip`);await fs.mkdir(path.dirname(nested),{recursive:true});await fs.writeFile(nested,original);
    await api.initializeGeneratedProject(incoming,identity.applicationName,identity.applicationVersion);
    const installed=await api.installGeneratedProject(incoming,path.join(temporary,'workspace'),identity);
    const project=installed.extractedPath;
    for(const [relative,bytes] of files)assert.equal(sha(await fs.readFile(path.join(project,relative))),sha(bytes),relative);
    const localBaseline=await api.readGenerationManifest(project);assert.equal(localBaseline.generation,undefined);
    assert.equal(JSON.parse(await fs.readFile(path.join(project,'generation-lineage.json'),'utf8')).productionGenerationProven,false);
    result.checks.realGeneratedSourcesAndCustomAssetsImportThroughValorideServices=true;
    result.checks.localLineageNeverPromotedToProductionReceipt=true;
    const edited='\n# Local acceptance edit preserved on repeated import.\n';
    await fs.appendFile(path.join(project,'runtime/render_clips.py'),edited);
    const editable=JSON.parse(await fs.readFile(path.join(project,'clipping-service.openapi.json'),'utf8'));editable.info.description=(editable.info.description||'')+' Local edit awaiting canonical Blueprint save.';
    await fs.writeFile(path.join(project,'clipping-service.openapi.json'),JSON.stringify(editable,null,2)+'\n');
    const editedManifest=structuredClone(manifest);
    for(const item of editedManifest.files){const bytes=await fs.readFile(path.join(project,item.path));item.sha256=sha(bytes);item.bytes=bytes.length;}
    editedManifest.localEdits={scope:'local_isolated_fixture',importedSourceManifestSha256:result.sourceManifestSha256};
    await fs.writeFile(path.join(project,'source-manifest.json'),JSON.stringify(editedManifest,null,2)+'\n');
    const repeated=await api.installGeneratedProject(incoming,path.dirname(project),identity);
    assert(repeated.preservedFiles.includes('runtime/render_clips.py'));assert(repeated.preservedFiles.includes('clipping-service.openapi.json'));
    assert((await fs.readFile(path.join(project,'runtime/render_clips.py'),'utf8')).endsWith(edited));
    result.checks.repeatedImportPreservesAdapterAndEditableSpecChanges=true;
    if(process.env.CLIPPING_ACCEPTANCE_BUILD==='1'){
      const repository=path.join(temporary,'maven-cache');await exec('/bin/cp',[process.platform==='darwin'?'-cR':'-a',path.join(os.homedir(),'.m2/repository'),repository],{timeout:90000});
      const env={...process.env,MAVEN_ARGS:`-o -Dmaven.repo.local=${repository}`};
      const layout=await api.discoverProjectRuntime(project);assert.equal(layout.build.directory,project);assert.equal(layout.frontend.directory,path.join(project,'ui'));
      const command=await api.projectCommand(layout.build,'build');
      const compiled=await exec('/bin/bash',['-c',command],{cwd:layout.build.directory,env,timeout:180000,maxBuffer:32*1024*1024});
      await fs.writeFile(path.join(output,'java-build.log'),compiled.stdout+compiled.stderr);result.checks.actualImportedJavaProjectBuildsWithPrivateOfflineCache=true;
      let dependencies=process.env.CLIPPING_UI_DEPENDENCIES;
      if(dependencies){await fs.symlink(dependencies,path.join(layout.frontend.directory,'node_modules'));}
      else {
        const installedDependencies=await exec('npm',['install','--ignore-scripts','--no-fund','--no-audit','--cache',path.join(temporary,'npm-cache'),...(process.env.CLIPPING_UI_OFFLINE==='1'?['--offline']:[])],{cwd:layout.frontend.directory,timeout:180000,maxBuffer:4*1024*1024});
        await fs.writeFile(path.join(output,'ui-install.log'),installedDependencies.stdout+installedDependencies.stderr);
        dependencies=path.join(layout.frontend.directory,'node_modules');
      }
      const uiBuild=await exec('/bin/bash',['-c',await api.projectCommand(layout.frontend,'build')],{cwd:layout.frontend.directory,timeout:90000,maxBuffer:16*1024*1024});
      await fs.writeFile(path.join(output,'ui-build.log'),uiBuild.stdout+uiBuild.stderr);result.checks.actualImportedUiProjectBuilds=true;
      const listener=net.createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
      ui=spawn(process.execPath,[path.join(dependencies,'vite/bin/vite.js'),'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:layout.frontend.directory,stdio:['ignore','pipe','pipe'],detached:true});
      await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(new Error('Imported UI did not start')),15000);ui.stdout.on('data',chunk=>{text+=chunk;if(text.includes(`127.0.0.1:${port}`)){clearTimeout(timer);resolve();}});ui.on('exit',code=>{if(code){clearTimeout(timer);reject(new Error(`Imported UI exited ${code}`));}});ui.on('error',reject);});
      const response=await fetch(`http://127.0.0.1:${port}`,{signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);assert((await response.text()).includes('<html'));
      result.checks.actualImportedUiServesOnLoopback=true;
    }
    if(process.env.CLIPPING_FFMPEG_PATH && process.env.CLIPPING_FFPROBE_PATH){
      await exec('python3',[path.join(project,'fixtures/create_synthetic_fixture.py')],{cwd:project,timeout:30000});
      const privateRoot=path.join(temporary,'private-runtime');await fs.mkdir(privateRoot);
      const fixtureReceipt=JSON.parse(await fs.readFile(path.join(project,'fixture/source-receipt.json'),'utf8'));
      const request={fixtureOnly:true,orderRef:randomUUID(),customerRef:randomUUID(),jobRef:randomUUID(),revision:1,sourcePath:path.join(project,'fixture/original-synthetic-source.avi'),sourceSha256:fixtureReceipt.sha256,encoder:'h264_videotoolbox',width:180,height:320,windows:[{startSeconds:1,durationSeconds:3}]};
      const requestFile=path.join(temporary,'request.json');await fs.writeFile(requestFile,JSON.stringify(request));
      const module=JSON.parse(await fs.readFile(path.join(project,'workflow/module-draft.json'),'utf8'));
      assert.equal(module.status,'disabled');const parameters=JSON.parse(module.execModuleConfig.payloadConfig.parameters);
      const rendered=await exec('/bin/bash',['-c',parameters.script],{cwd:project,env:{...process.env,CLIPPING_PROJECT_ROOT:project,CLIPPING_REQUEST_PATH:requestFile,CLIPPING_PRIVATE_ROOT:privateRoot},timeout:150000,maxBuffer:1024*1024});
      const receipt=JSON.parse(rendered.stdout);assert.equal(receipt.status,'awaiting_human_review');assert.equal(receipt.fixtureOnly,true);assert.equal(receipt.customerDeliveryAuthorized,false);
      const clip=receipt.outputs[0];assert.equal(clip.codec,'h264');assert.equal(clip.width,180);assert.equal(clip.height,320);assert.equal(clip.durationSeconds,3);assert.equal(sha(await fs.readFile(clip.path)),clip.sha256);
      result.checks.importedEditedPortableModuleRendersActualSyntheticClip=true;
      result.render={scope:'local_synthetic_fixture',status:receipt.status,customerDeliveryAuthorized:false,codec:clip.codec,width:clip.width,height:clip.height,durationSeconds:clip.durationSeconds,bytes:clip.bytes,sha256:clip.sha256};
    }
    await fs.writeFile(path.join(project,'.valorideignore'),'fixture/\n');
    const prepared=await api.createApplicationSourceArchive(project,identity.applicationId,identity.applicationName);
    assert.equal(prepared.manifest.backendRoot,'spring-server');assert.equal(prepared.manifest.frontendRoot,'ui');assert.equal(prepared.manifest.openApiInputPath,'spring-server/src/main/resources/openapi.yaml');
    const sourceZip=new AdmZip(prepared.buffer);
    for(const relative of ['runtime/render_clips.py','runtime/dependencies.json','runtime/storage-and-run.json','workflow/module-draft.json','workflow/order-to-delivery.contract.json','clipping-service.openapi.json','generation-lineage.json'])assert(sourceZip.getEntry(relative),relative);
    assert(sourceZip.readAsText('runtime/render_clips.py').endsWith(edited));
    assert.equal(sourceZip.getEntry(`artifacts/generated-${manifest.version}.zip`),null);
    assert.equal(sourceZip.getEntry('.valoride-generation.json'),null);
    assert.equal(JSON.parse(sourceZip.readAsText('runtime/dependencies.json')).awsTarget.status,'requires target-platform build and codec verification');
    const preparedPath=path.join(output,`John-Social-Video-Clipping-v${manifest.version}-source-snapshot.zip`);await fs.writeFile(preparedPath,prepared.buffer);
    result.sourceSnapshot={path:preparedPath,sha256:prepared.checksumSha256,bytes:prepared.buffer.length,manifest:prepared.manifest,uploaded:false,awsReady:false};
    result.checks.prepareDeploySourceCarriesEditsAndDependenciesWithoutMacBinaries=true;
    // The shared example is an owner-controlled input, never rewritten by acceptance.
    assert.equal(sha(await fs.readFile(path.join(source,'source-manifest.json'))),result.sourceManifestSha256);
    for(const item of manifest.files)assert.equal(sha(await fs.readFile(path.join(source,item.path))),item.sha256,item.path);
    result.checks.ownerInputsUnchangedDuringAcceptance=true;
    result.blockers=[
      'Production Application registration and tenant selection remain with the clipping owner; local lineage is not production proof.',
      'The native UI has no local project-export import command; this acceptance calls its real extraction/install services directly.',
      'Blueprint save exists at PUT /v1/thorapi/applications/{applicationId}/openapi with expectedEtag, but local file edits are not automatically synchronized.',
      'Source snapshots feed GeneratedTenantRuntimeArtifactService deployment builds, not ThorAPI generation packages; regeneration must pin and return authored asset/source revisions.',
      'Linux target FFmpeg/ffprobe/H264 verification, storage and deployment choices, paid order/intake/review/private delivery integration remain unproven.'
    ];
    result.passed=true;
  }catch(error){result.passed=false;result.error=error.message;result.commandOutput=String(error.stdout||'').slice(-4000)+String(error.stderr||'').slice(-4000);process.exitCode=1;}
  finally{if(ui?.pid){try{process.kill(-ui.pid,'SIGTERM');}catch{}}await fs.rm(temporary,{recursive:true,force:true,maxRetries:10,retryDelay:200});result.temporaryFixtureCleaned=true;await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'clipping-project-acceptance.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
})();
