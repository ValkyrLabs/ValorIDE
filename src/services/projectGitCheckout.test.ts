import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { AppCheckoutPairing, resolveAppCheckout } from "./projectGitCheckout";

describe("generated app and authored workspace checkout resolution", () => {
  const id = "11111111-1111-4111-8111-111111111111", backend = "https://api.example/v1";
  let root: string, generated: string;
  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-app-checkout-")));
    generated = path.join(root, "thorapi", "MyApp-v1");
    await fs.mkdir(generated, {recursive:true}); await fs.mkdir(path.join(root, ".git"));
    await fs.writeFile(path.join(root, ".valoride-blueprint.json"), JSON.stringify({
      schemaVersion:1, applicationId:id, specificationPath:"my-api.yaml", baselineHash:"a".repeat(64), backend,
    }));
  });
  afterEach(async () => { await fs.rm(root, {recursive:true, force:true}); });
  it("includes the authored root only for an explicitly opened workspace with matching app and backend", async () => {
    expect(await resolveAppCheckout(generated,id,backend,[root])).toBe(root);
    expect(await resolveAppCheckout(generated,id,backend,[])).toBe(generated);
    expect(await resolveAppCheckout(generated,id,backend + "/staging",[root])).toBe(generated);
    expect(await resolveAppCheckout(generated,"different",backend,[root])).toBe(generated);
  });
  it("prefers a dedicated nested checkout and rejects linked paths", async () => {
    await fs.mkdir(path.join(generated, ".git"));
    expect(await resolveAppCheckout(generated,id,backend,[root])).toBe(generated);
    const linked = path.join(root, "linked"); await fs.symlink(generated, linked);
    await expect(resolveAppCheckout(linked,id,backend,[root])).rejects.toThrow(/symbolic link/);
  });

  describe("optional pairing for an authored clone without private ValorIDE markers", () => {
    const remote = "https://github.com/example/canonical.git";
    const run = (...args:string[]) => execFileSync("git",args,{cwd:root,stdio:"pipe"});
    let values:Map<string, any>, pairing:AppCheckoutPairing;
    beforeEach(async () => {
      await fs.unlink(path.join(root, ".valoride-blueprint.json"));
      run("init","-q"); run("remote","add","origin",remote);
      values = new Map();
      pairing = {
        bindings:[{bindingId:"app-binding",repository:"example/canonical"}],gitPath:"git",session:"session-a",
        state:{get:(key)=>values.get(key), update:async (key,value)=>{values.set(key,value);}},
        confirm:jest.fn(async ()=>true), assertCurrent:jest.fn(async ()=>{}),
      };
    });
    it("cancels without falling back to initializing a nested repo or remembering a refusal",async ()=>{
      pairing.confirm=jest.fn(async ()=>false);
      expect(await resolveAppCheckout(generated,id,backend,[root],pairing)).toBeUndefined();
      expect(values.size).toBe(0);
    });
    it("reuses approval only for the same authorized repo, account, app, backend and path; rechecks effective push URLs",async ()=>{
      expect(await resolveAppCheckout(generated,id,backend,[root],pairing)).toBe(root);
      expect(await resolveAppCheckout(generated,id,backend,[root],pairing)).toBe(root);
      expect(pairing.confirm).toHaveBeenCalledTimes(1);
      expect(pairing.confirm).toHaveBeenCalledWith(root,"example/canonical");
      for(const [app,host,session] of [[id,backend,"session-b"],[id,backend+"/staging","session-a"],["another",backend,"session-a"]])
        expect(await resolveAppCheckout(generated,app,host,[root],{...pairing,session})).toBe(root);
      expect(pairing.confirm).toHaveBeenCalledTimes(4);
      run("remote","set-url","--add","--push","origin",remote);
      run("remote","set-url","--add","--push","origin","https://github.com/elsewhere/other");
      await expect(resolveAppCheckout(generated,id,backend,[root],pairing)).rejects.toThrow(/no longer matches/);
      expect(await resolveAppCheckout(generated,id,backend,[root],{...pairing,session:"fresh"})).toBe(generated);
      expect(pairing.confirm).toHaveBeenCalledTimes(4);
    });
    it("never offers to pair a conflicting app marker even on a matching authorized GitHub repo",async ()=>{
      await fs.writeFile(path.join(root,".valoride-generation.json"),JSON.stringify({schemaVersion:2,applicationId:"another",
        applicationName:"wrong",applicationVersion:"1",files:{}}));
      expect(await resolveAppCheckout(generated,id,backend,[root],pairing)).toBe(generated);
      expect(pairing.confirm).not.toHaveBeenCalled();
    });
  });
});
