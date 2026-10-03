const vscode=require('vscode');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {randomUUID}=require('node:crypto');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
exports.run=async()=>{
  const fixture=process.env.ROUNDTRIP_FIXTURE;
  const result={checks:{},scope:'actual VS Code commands/editor against a local isolated Blueprint API; no production generation claimed'};
  const origin=new URL(process.env.ROUNDTRIP_FIXTURE_BACKEND).origin;
  const fetchOriginal=globalThis.fetch;
  globalThis.fetch=(url,init)=>{if(new URL(typeof url==='string'?url:url.url).origin!==origin)throw new Error('Off-host requests denied in native acceptance');return fetchOriginal(url,init);};
  const state=()=>fetch(`${origin}/__fixture/state`).then(response=>response.json());
  const bounded=async(promise,label)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} timed out`)),20000);})]);}finally{clearTimeout(timer);}};
  try{
    await vscode.extensions.getExtension('local-fixture.valoride-roundtrip-fixture').activate();
    const commands=await vscode.commands.getCommands(true);assert(commands.includes('valoride.projects.import'));assert(commands.includes('valoride.projects.syncBlueprint'));assert(commands.includes('valoride.projects.publishSource'));assert(commands.includes('notifications.clearAll'));
    result.checks.nativeCommandsRegistered=true;
    const archive=vscode.Uri.file(process.env.ROUNDTRIP_ARCHIVE),parent=vscode.Uri.file(path.join(fixture,'workspace','.thorapi'));
    const imported=await bounded(vscode.commands.executeCommand('valoride.projects.import',archive,parent),'native import');assert(imported);
    const root=imported.extractedPath;
    const generation=JSON.parse(await fs.readFile(path.join(root,'.valoride-generation.json'),'utf8'));
    assert.equal(generation.applicationId,process.env.ROUNDTRIP_APPLICATION_ID);assert.equal(generation.generation,undefined);
    assert.equal(sha(await fs.readFile(path.join(root,process.env.ROUNDTRIP_GENERATED_PATH))),process.env.ROUNDTRIP_ORIGINAL_SHA);
    for(const file of ['runtime/render_clips.py','workflow/module-draft.json','runtime/dependencies.json','runtime/storage-and-run.json','spring-server/pom.xml','ui/package.json'])await fs.access(path.join(root,file));
    result.checks.nativeImportCarriesActualClippingGeneratedCodeAndCustomSources=true;
    result.checks.noHostedSignupAndNoPromotedProductionReceipt=true;
    if(process.env.ROUNDTRIP_PORTABLE_EXPORT==='true'){
      const retained=path.join(root,'export-reference');const manifest=JSON.parse(await fs.readFile(path.join(retained,'export-manifest.json'),'utf8'));
      for(const item of manifest.files){const bytes=await fs.readFile(path.join(retained,item.path));assert.equal(sha(bytes),item.sha256,item.path);assert.equal(bytes.length,item.bytes,item.path);}
      for(const file of ['receipts/local-generation-receipt.json','workflow/native-graph-snapshot.json','workflow/disabled-task-snapshot.json','portability/acceptance-contract.json','notices/ffmpeg/LICENSE.md'])await fs.access(path.join(retained,file));
      const contract=JSON.parse(await fs.readFile(path.join(retained,'portability/acceptance-contract.json'),'utf8'));assert.equal(contract.productionReady,false);
      result.checks.completePortableExportReceiptGraphAndLicenseNoticesRetainedWithoutPromotingReadiness=true;
    }
    if(process.env.CLIPPING_FFMPEG_PATH&&process.env.CLIPPING_FFPROBE_PATH){
      const exec=promisify(execFile);await exec('python3',[path.join(root,'fixtures/create_synthetic_fixture.py')],{cwd:root,timeout:30000});
      const sourceReceipt=JSON.parse(await fs.readFile(path.join(root,'fixture/source-receipt.json'),'utf8'));
      const request={fixtureOnly:true,orderRef:randomUUID(),customerRef:randomUUID(),jobRef:randomUUID(),revision:1,sourcePath:path.join(root,'fixture/original-synthetic-source.avi'),sourceSha256:sourceReceipt.sha256,encoder:'h264_videotoolbox',width:180,height:320,windows:[{startSeconds:1,durationSeconds:3}]};
      const requestPath=path.join(fixture,'render-request.json');await fs.writeFile(requestPath,JSON.stringify(request));
      await fs.mkdir(path.join(fixture,'private-runtime'));
      const module=JSON.parse(await fs.readFile(path.join(root,'workflow/module-draft.json'),'utf8'));assert.equal(module.status,'disabled');
      const parameters=JSON.parse(module.execModuleConfig.payloadConfig.parameters);
      const rendered=await exec('/bin/bash',['-c',parameters.script],{cwd:root,env:{...process.env,CLIPPING_PROJECT_ROOT:root,CLIPPING_REQUEST_PATH:requestPath,CLIPPING_PRIVATE_ROOT:path.join(fixture,'private-runtime')},timeout:90000,maxBuffer:1024*1024});
      const receipt=JSON.parse(rendered.stdout),clip=receipt.outputs[0];assert.equal(receipt.customerDeliveryAuthorized,false);assert.equal(receipt.status,'awaiting_human_review');assert.equal(clip.codec,'h264');assert.equal(sha(await fs.readFile(clip.path)),clip.sha256);
      result.render={scope:'local synthetic fixture',codec:clip.codec,width:clip.width,height:clip.height,durationSeconds:clip.durationSeconds,bytes:clip.bytes,sha256:clip.sha256,status:receipt.status,customerDeliveryAuthorized:false};
      result.checks.actualImportedRendererRunsWithCustomerConfiguredLocalToolsWithoutHostedAccount=true;
    }
    const specUri=vscode.Uri.file(path.join(root,imported.specificationPath));
    const document=await vscode.workspace.openTextDocument(specUri);await vscode.window.showTextDocument(document,{preview:false});
    const specification=JSON.parse(document.getText());specification.info.description=(specification.info.description||'')+' Native editor round-trip edit.';
    const edit=new vscode.WorkspaceEdit();edit.replace(specUri,new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),JSON.stringify(specification,null,2)+'\n');
    assert(await vscode.workspace.applyEdit(edit));assert(document.isDirty);
    const synced=await bounded(vscode.commands.executeCommand('valoride.projects.syncBlueprint',vscode.Uri.file(root)),'native Blueprint sync');assert.equal(synced.status,'saved');
    assert.equal(document.isDirty,false);result.checks.actualNativeEditorEditSavedBySynchronization=true;
    const server=await state();assert.equal(server.puts,1);assert.equal(server.requests.at(-1).expectedEtag,'a'.repeat(64));assert.deepEqual(server.canonical.specification,specification);
    result.checks.nativeSyncPublishesSavedEditWithRetainedCanonicalEtag=true;
    const bindingBefore=await fs.readFile(path.join(root,'.valoride-blueprint.json'));
    assert(!bindingBefore.toString().includes(process.env.ROUNDTRIP_FIXTURE_TOKEN));
    await fs.appendFile(path.join(root,'runtime/render_clips.py'),'\n# Native import acceptance edit.\n');
    const repeated=await bounded(vscode.commands.executeCommand('valoride.projects.import',archive,parent),'repeat native import');
    assert.equal(repeated.extractedPath,root);assert(repeated.preservedFiles.includes(imported.specificationPath));assert(repeated.preservedFiles.includes('runtime/render_clips.py'));
    assert.equal(await fs.readFile(specUri.fsPath,'utf8'),JSON.stringify(specification,null,2)+'\n');
    assert.deepEqual(await fs.readFile(path.join(root,'.valoride-blueprint.json')),bindingBefore);
    result.checks.repeatedNativeImportPreservesSavedSpecAdapterEditsAndBoundRevision=true;
    await fetch(`${origin}/__fixture/change`,{method:'POST'});
    const before=(await state()).requests.length;
    const conflicted=vscode.commands.executeCommand('valoride.projects.syncBlueprint',vscode.Uri.file(root));
    for(let tries=0;tries<80;tries++){if((await state()).requests.length>before){await new Promise(resolve=>setTimeout(resolve,150));break;}await new Promise(resolve=>setTimeout(resolve,50));}
    await vscode.commands.executeCommand('notifications.clearAll');
    assert.equal(await bounded(conflicted,'cancel native conflict'),undefined);
    assert.equal((await state()).puts,1);assert.deepEqual(await fs.readFile(path.join(root,'.valoride-blueprint.json')),bindingBefore);
    assert.equal(JSON.parse(await fs.readFile(specUri.fsPath,'utf8')).info.description,specification.info.description);
    result.checks.nativeConflictCancellationDoesNotWriteOrAdoptNewEtag=true;
    result.checks.loopbackTransportOnlyAndBindingHasNoToken=true;
    result.passed=true;
  }catch(error){result.passed=false;result.error=error.message;throw error;}
  finally{globalThis.fetch=fetchOriginal;await fs.writeFile(path.join(fixture,'result.json'),JSON.stringify(result,null,2)+'\n');}
};
