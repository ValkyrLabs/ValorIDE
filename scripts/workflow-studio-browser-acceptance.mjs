import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

// Real browser interactions against the same isolated CEO runtime as native Studio.
// Authentication enters through the login form; HTTP is used only for evidence and cleanup.
export async function runBrowserJourney({ executablePath, frontendUrl, baseUrl, report, evidenceDir, password }) {
  for (const address of [frontendUrl, baseUrl]) {
    assert(["localhost", "127.0.0.1"].includes(new URL(address).hostname));
  }
  const browser = await puppeteer.launch({ executablePath, headless: true,
    defaultViewport: { width: 1600, height: 1100 } });
  const page = await browser.newPage();
  page.setDefaultTimeout(45_000);
  let token, executionId, originalFormula, formulaId, editedCellId;
  let edited = false;
  const stateReadbacks = [];
  const requests = [];
  const clicks = [];
  await page.exposeFunction("recordAcceptanceClick", click => { clicks.push(click); });
  await page.evaluateOnNewDocument(() => document.addEventListener("click", event => {
    const target = event.target;
    window.recordAcceptanceClick({ tag: target.tagName, text: target.textContent?.trim().slice(0, 80),
      button: target.closest("button")?.textContent?.trim().slice(0, 80),
      label: target.closest("label")?.textContent?.trim().slice(0, 80) });
  }, true));
  const observeFailures = (scope, view) => scope.on("response", response => {
    if (response.status() >= 400) requests.push({ view, path: new URL(response.url()).pathname, status: response.status() });
  });
  observeFailures(page, "studio");
  const evidence = (name, value) => fs.writeFileSync(path.join(evidenceDir, name), JSON.stringify(value, null, 2));
  let stage = "login";
  const progress = value => {
    stage = value;
    evidence("browser-progress.json", { stage, at: new Date().toISOString() });
  };
  const read = async (route, options = {}) => {
    const response = await fetch(new URL(route, baseUrl), { ...options,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers },
      signal: AbortSignal.timeout(30_000) });
    assert(response.ok, `Evidence ${route}: HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  const clickText = async (scope, selector, text) => {
    await scope.waitForFunction((selector, text) => [...document.querySelectorAll(selector)]
      .some(element => element.textContent.trim() === text && element.getBoundingClientRect().width > 0),
    {}, selector, text);
    const handle = await scope.evaluateHandle((selector, text) => [...document.querySelectorAll(selector)]
      .find(element => element.textContent.trim() === text && element.getBoundingClientRect().width > 0), selector, text);
    await handle.asElement().click();
    await handle.dispose();
  };
  const awaitLiveWorkbook = async scope => scope.waitForFunction(() =>
    [...document.querySelectorAll('[role="status"]')].some(element =>
      element.textContent.trim() === "Live collaboration connected"), { timeout: 15_000 });
  const awaitState = async expected => {
    // Warm the actual generated read before the worker transition. Waiting for a
    // cache TTL to expire must not make stale runtime evidence pass this gate.
    const initial = await read(`/v1/WorkflowExecution/${executionId}`);
    await page.waitForFunction(expected => {
      const status = document.querySelector('.ws-debugger-state strong[data-status]')?.dataset.status;
      return status === expected || ["ERROR", "FAILED", "TIMEOUT", "CANCELLED", "SUCCESS"].includes(status);
    }, { timeout: 360_000 }, expected);
    const uiState = await page.$eval('.ws-debugger-state strong[data-status]', element => element.dataset.status);
    assert.equal(uiState, expected, `Live Studio expected ${expected}, got ${uiState}`);
    const observedAt = Date.now();
    const deadline = observedAt + 10_000;
    let polls = 0;
    while (Date.now() < deadline) {
      const readAt = Date.now();
      const execution = await read(`/v1/WorkflowExecution/${executionId}`);
      evidence("browser-execution-state.json", { executionId, state: execution.state,
        checkpointId: execution.currentCheckpointId, errorMessage: execution.errorMessage,
        expected, uiState, initialState: initial.state, polls: ++polls,
        elapsedSinceUiMs: Date.now() - observedAt, readDurationMs: Date.now() - readAt });
      if (execution.state === expected) {
        assert(Date.now() <= deadline, `Generated ${expected} readback exceeded 10 seconds after the live UI transition`);
        stateReadbacks.push({ expected, initialState: initial.state, elapsedSinceUiMs: Date.now() - observedAt, polls });
        return execution;
      }
      assert(!["ERROR", "FAILED", "TIMEOUT", "CANCELLED", "SUCCESS"].includes(execution.state),
        `Expected ${expected}, got ${execution.state}: ${execution.errorMessage || ""}`);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error(`Live Studio reached ${expected}, but generated execution reads stayed stale for 10 seconds`);
  };
  try {
    const destination = `/studio?workflowId=${report.workflow.id}&workflowVersionId=${report.workflow.versionId}`;
    await page.goto(`${frontendUrl}/login?redirect=${encodeURIComponent(destination)}`, { waitUntil: "domcontentloaded" });
    await clickText(page, ".cookie-actions button", "Deselect Optional");
    await page.waitForSelector(".cookie-actions", { hidden: true });
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', "super");
    await page.type('input[name="password"]', password);
    const loginResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/v1/auth/login"
      && response.request().method() === "POST");
    await page.click('button[type="submit"]');
    const login = await loginResponse;
    assert(login.ok(), `Browser login: HTTP ${login.status()}`);
    token = (await login.json()).token;
    assert(token, "Browser login did not authenticate");
    progress("authenticated-studio");
    await page.waitForSelector('input[placeholder="Workflow name"]');
    await page.waitForFunction((name, versionId) =>
      document.querySelector('input[placeholder="Workflow name"]')?.value === name
      && document.querySelector('[aria-label="Selected immutable workflow version"]')?.value === versionId,
    {}, report.workflow.name, report.workflow.versionId);
    assert.equal(await page.$eval('input[placeholder="Workflow name"]', element => element.value), report.workflow.name);
    const baseline = await read(`/v1/WorkflowExecution/${report.executions[0].id}`);
    const priorContext = baseline.contextData;
    const priorReceipt = JSON.parse(priorContext).evaluationReceipt;
    const workbookId = priorReceipt.workbookId;
    const grid = await read(`/v1/Workbook/${workbookId}/grid`);
    const sheet = grid.sheets.find(value => value.name === "Cadence");
    assert(sheet, "Bound workbook has no Cadence sheet");
    const cells = await read(`/v1/Workbook/${workbookId}/sheets/${sheet.id}/cells?page=0&size=128`);
    const cell = cells.items.find(value => value.row.rowIndex === 1 && value.column.colIndex === 1);
    originalFormula = cell.formula.expression;
    formulaId = cell.formula.id;

    progress("canvas-breakpoint");
    await page.click('.ws-workspace-nav button:first-child');
    await page.click('[aria-label="Workflow editor actions"] button[aria-label="Add Step"]');
    await page.waitForSelector('[role="dialog"][aria-label="Add Step"]');
    await page.click('[role="dialog"][aria-label="Add Step"] button[aria-label="Close floating toolbar"]');
    await page.waitForSelector('[role="dialog"][aria-label="Add Step"]', { hidden: true });
    const portfolioWorkbookId = JSON.parse(priorContext).portfolioDecisionReceipt?.policyEvaluationReceipt?.workbookId;
    assert(portfolioWorkbookId, "CEO execution lacks a portfolio Sheetster receipt");
    await page.waitForSelector('.react-flow__node[data-id="portfolio_decision"]');
    await page.click('.react-flow__controls-fitview');
    await page.click('.react-flow__node[data-id="portfolio_decision"]');
    const portfolioLink = '.ws-inspector a[title="Open workbook in Sheetster"]';
    await page.waitForSelector(portfolioLink);
    assert.equal(new URL(await page.$eval(portfolioLink, element => element.href)).searchParams.get("workbookId"), portfolioWorkbookId);
    const portfolioPopup = new Promise(resolve => page.once("popup", resolve));
    await page.click(portfolioLink);
    const policyPage = await Promise.race([portfolioPopup, new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Portfolio policy link did not open Sheetster")), 30_000))]);
    policyPage.setDefaultTimeout(45_000);
    await policyPage.waitForFunction(id => document.querySelector('[aria-label="Open workbook"]')?.value === id,
      {}, portfolioWorkbookId);
    await clickText(policyPage, '[role="tab"]', "Decisions");
    await policyPage.bringToFront();
    await policyPage.screenshot({ path: path.join(evidenceDir, "browser-portfolio-policy-workbook.png") });
    evidence("browser-portfolio-policy-binding.json", { workbookId: portfolioWorkbookId, openedFromCanvas: true });
    await policyPage.close();
    await page.bringToFront();
    await page.waitForSelector('.react-flow__node[data-id="adaptive_cadence"]');
    await page.click('.react-flow__controls-fitview');
    await page.click('.react-flow__node[data-id="adaptive_cadence"]');
    await page.waitForSelector('.ws-inspector input[type="checkbox"]');
    await page.click('.ws-inspector input[type="checkbox"]');
    assert(await page.$eval('.ws-inspector input[type="checkbox"]', element => element.checked),
      "Canvas breakpoint checkbox did not accept the click");
    await page.screenshot({ path: path.join(evidenceDir, "browser-breakpoint-before-save.png") });
    await clickText(page, ".ws-inspector button", "Save");
    assert(await page.$eval('.ws-inspector input[type="checkbox"]', element => element.checked),
      "Canvas breakpoint checkbox was cleared while saving");
    const workbookLink = '.ws-inspector a[title="Open workbook in Sheetster"]';
    await page.waitForSelector(workbookLink);
    assert.equal(new URL(await page.$eval(workbookLink, element => element.href)).searchParams.get("workbookId"), workbookId);
    await page.screenshot({ path: path.join(evidenceDir, "browser-studio-workbook-binding.png") });

    progress("studio-test-launch");
    await page.click('button[aria-label="Test"]');
    await page.waitForSelector('.ws-debugger-controls button.start');
    await page.click('.ws-debugger-controls button.start');
    await page.waitForSelector('.ws-launch-contract button[type="submit"]');
    const startedResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/v1/vaiworkflow/test-sessions"
      && response.request().method() === "POST");
    await page.click('.ws-launch-contract button[type="submit"]');
    const started = await startedResponse;
    assert(started.ok(), `Studio launch: HTTP ${started.status()}`);
    const request = JSON.parse(started.request().postData());
    executionId = (await started.json()).executionId;
    assert.equal(request.parameters.dryRun, true, "Studio did not retain the reviewed dry-run default");
    assert.equal(request.parameters.maxLoopCount, 1, "Studio test must remain bounded to one cycle");
    evidence("browser-test-launch.json", { executionId, breakpoints: request.breakpoints });
    assert(request.breakpoints.includes("adaptive_cadence"), "Reviewed canvas breakpoint was lost at launch");
    const paused = await awaitState("PAUSED");
    assert(paused.currentCheckpointId, "Studio pause has no durable checkpoint");
    assert.equal(JSON.parse(paused.contextData).currentBreakpoint, "adaptive_cadence");
    await page.waitForFunction(() => [...document.querySelectorAll('.ws-debugger-controls button')]
      .some(button => button.textContent.includes("RESUME") && !button.disabled));
    await page.screenshot({ path: path.join(evidenceDir, "browser-studio-paused.png") });

    progress("open-bound-workbook");
    const popup = new Promise(resolve => page.once("popup", resolve));
    await page.click(workbookLink);
    const workbookPage = await Promise.race([popup, new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Sheetster link did not open a workbook view")), 30_000))]);
    observeFailures(workbookPage, "workbook-editor");
    workbookPage.setDefaultTimeout(45_000);
    await workbookPage.waitForSelector('[aria-label="Open workbook"]');
    await workbookPage.waitForFunction(id => document.querySelector('[aria-label="Open workbook"]')?.value === id,
      {}, workbookId);
    assert.equal(await workbookPage.$eval('[aria-label="Open workbook"]', element => element.value), workbookId);
    await awaitLiveWorkbook(workbookPage);
    await clickText(workbookPage, '[role="tab"]', "Cadence");
    const selectedCell = 'td[data-row="1"][data-col="1"]';
    await workbookPage.waitForSelector(selectedCell);
    // A second normal workbook view must receive the committed edit without a reload.
    const observerPage = await browser.newPage();
    observeFailures(observerPage, "workbook-observer");
    observerPage.setDefaultTimeout(45_000);
    await observerPage.goto(workbookPage.url(), { waitUntil: "domcontentloaded" });
    await observerPage.waitForFunction(id => document.querySelector('[aria-label="Open workbook"]')?.value === id,
      {}, workbookId);
    await awaitLiveWorkbook(observerPage);
    await clickText(observerPage, '[role="tab"]', "Cadence");
    await observerPage.waitForSelector(selectedCell);
    await observerPage.click(selectedCell);
    assert.notEqual(await observerPage.$eval(selectedCell, element => element.textContent.trim()), "1234");
    await workbookPage.bringToFront();
    progress("edit-workbook-formula");
    await workbookPage.click(selectedCell, { clickCount: 2 });
    await workbookPage.waitForSelector(`${selectedCell} input`);
    await workbookPage.click(`${selectedCell} input`, { clickCount: 3 });
    await workbookPage.type(`${selectedCell} input`, "=1234");
    const savedResponse = workbookPage.waitForResponse(response => new URL(response.url()).pathname === `/v1/Cell/${cell.id}`
      && response.request().method() === "PUT");
    await workbookPage.keyboard.press("Enter");
    const saved = await savedResponse;
    assert(saved.ok(), `Workbook formula save: HTTP ${saved.status()}`);
    const savedCell = await saved.json();
    evidence("browser-workbook-save.json", { workbookId, cellId: cell.id,
      status: saved.status(), submitted: JSON.parse(saved.request().postData()),
      returned: { id: savedCell.id, value: savedCell.value, formula: savedCell.formula } });
    edited = true;
    editedCellId = cell.id;
    await observerPage.waitForFunction(selector =>
      document.querySelector(selector)?.textContent.trim() === "1234"
      && document.querySelector('[aria-label="Edit selected cell formula or value"]')?.textContent.trim() === "=1234",
    { timeout: 15_000, polling: 100 }, selectedCell);
    progress("live-workbook-update-verified");
    evidence("browser-live-workbook-update.json", { workbookId, value: 1234,
      formula: "=1234", visibility: await observerPage.evaluate(() => document.visibilityState),
      receivedWithoutReload: true });
    // Assert the background update first; activate only for screenshot painting.
    await observerPage.bringToFront();
    await observerPage.screenshot({ path: path.join(evidenceDir, "browser-sheetster-live-observer.png") });
    await observerPage.close();
    // The grid replaces the cell's formula relationship when saving an edit.
    // Verify the committed cell, rather than assuming the old Formula id changed.
    const committedCell = await read(`/v1/Workbook/${workbookId}/sheets/${sheet.id}/cells/${cell.id}`);
    assert.equal(committedCell.formula.expression, "=1234");
    assert.equal((await read(`/v1/Formula/${committedCell.formula.id}`)).expression, "=1234");
    await workbookPage.bringToFront();
    await workbookPage.reload({ waitUntil: "domcontentloaded" });
    await workbookPage.waitForSelector('[aria-label="Open workbook"]');
    await workbookPage.waitForFunction(id => document.querySelector('[aria-label="Open workbook"]')?.value === id,
      {}, workbookId);
    await awaitLiveWorkbook(workbookPage);
    await clickText(workbookPage, '[role="tab"]', "Cadence");
    await workbookPage.waitForSelector(selectedCell);
    await workbookPage.click(selectedCell);
    await workbookPage.waitForFunction(() =>
      document.querySelector('[aria-label="Edit selected cell formula or value"]')?.textContent.trim() === "=1234");
    await workbookPage.screenshot({ path: path.join(evidenceDir, "browser-sheetster-edited.png") });

    await page.bringToFront();
    progress("resume-studio-test");
    await page.click('.ws-debugger-controls button.pause');
    const completed = await awaitState("SUCCESS");
    const context = JSON.parse(completed.contextData);
    assert.equal(context.outputs.cycleIntervalSeconds, 1234);
    assert.equal(context.evaluationReceipt.workbookId, workbookId);
    assert.notEqual(context.evaluationReceipt.workbookHash, priorReceipt.workbookHash);
    assert.equal((await read(`/v1/WorkflowExecution/${baseline.id}`)).contextData, priorContext);
    await page.waitForFunction(() => document.querySelector('.ws-debugger')?.textContent.includes("SUCCESS"));
    await page.screenshot({ path: path.join(evidenceDir, "browser-studio-resumed.png") });
    const proof = { status: "passed", browserLogin: true, canvasWorkbookLink: true,
      portfolioWorkbookId, portfolioWorkbookOpenedFromCanvas: true,
      workflowId: report.workflow.id, workflowVersionId: report.workflow.versionId,
      executionId, workbookId, checkpointId: paused.currentCheckpointId,
      formulaEditedThroughUi: true, persistedEditReadback: true, resumedThroughUi: true,
      liveWorkbookUpdates: true,
      stateReadbacks,
      result: context.outputs.cycleIntervalSeconds, workbookHash: context.evaluationReceipt.workbookHash,
      priorEvidenceUnchanged: true };
    evidence("browser-verification.json", proof);
    return proof;
  } catch (error) {
    const workbookViews = [];
    for (const view of await browser.pages()) {
      const state = await view.evaluate(() => ({ path: location.pathname,
        visibility: document.visibilityState,
        workbookId: document.querySelector('[aria-label="Open workbook"]')?.value,
        value: document.querySelector('td[data-row="1"][data-col="1"]')?.textContent.trim(),
        formula: document.querySelector('[aria-label="Edit selected cell formula or value"]')?.textContent.trim(),
        status: [...document.querySelectorAll('[role="status"], [role="alert"]')].map(element => element.textContent.slice(0, 500))
      })).catch(() => ({}));
      if (state.workbookId) workbookViews.push(state);
    }
    evidence("browser-failure-workbooks.json", workbookViews);
    // A background page can suspend screenshot rendering. Keep failure capture
    // bounded so a failed assertion cannot strand the owned acceptance runtime.
    await page.bringToFront().catch(() => {});
    await page.screenshot({ path: path.join(evidenceDir, "browser-failure.png") }).catch(() => {});
    evidence("browser-failure.json", { stage, message: error.message, failedRequests: requests, clicks,
      ui: await page.evaluate(() => ({ path: location.pathname,
        alerts: [...document.querySelectorAll('[role="alert"]')].map(value => value.textContent.slice(0, 500)),
        buttons: [...document.querySelectorAll('button')].map(value => value.textContent.trim()).filter(Boolean).slice(0, 80) })).catch(() => ({})) });
    throw error;
  } finally {
    try {
      if (token && executionId) {
        const execution = await read(`/v1/WorkflowExecution/${executionId}`);
        if (["RUNNING", "PAUSED", "WAITING_APPROVAL"].includes(execution.state)) {
          await read(`/v1/vaiworkflow/test-sessions/${executionId}/stop`, { method: "POST" });
        }
      }
      if (token && formulaId && edited) await read(`/v1/Formula/${formulaId}`, {
        method: "PATCH", headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify({ expression: originalFormula }) });
      if (token && editedCellId && edited) await read(`/v1/Cell/${editedCellId}`, {
        method: "PATCH", headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify({ formula: { id: formulaId } }) });
    } finally {
      await browser.close();
    }
  }
}
