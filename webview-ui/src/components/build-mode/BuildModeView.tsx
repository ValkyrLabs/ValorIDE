import { useMemo, useState, type ReactNode } from "react";
import {
  FaBolt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaPlay,
  FaShieldAlt,
  FaTimes,
} from "react-icons/fa";
import type {
  BuildModeApprovalThreshold,
  BuildModeCommand,
  BuildModeCommandApproval,
  BuildModePromptExecutionContext,
  ValorTaskBridgePayload,
} from "@shared/BuildMode";
import {
  createScheduledAutomationCommand,
  createWorkflowMcpCommand,
  deriveBuildModeAutonomousQueuePlan,
  deriveBuildModeAutonomyDecision,
  formatBuildModeMcpToolCommandLine,
  getBuildModeCurrentConsecutiveCommandCount,
  getBuildModeCommandCatalog,
  getBuildModeMcpToolCommands,
  getBuildModeMcpToolTarget,
  getBuildModePromptExecutionContext,
  getNextBuildModeExecutionAction,
  formatAppBundleDiffArtifactRef,
  formatEvidenceArtifactProof,
  renderBuildModeFinalReport,
} from "./valorTaskBridge";
import "./BuildModeView.css";

interface BuildModeViewProps {
  payload: ValorTaskBridgePayload;
  onClose?: () => void;
  onOpenArtifact?: (uri: string) => void;
  onOpenPreview?: (url: string) => void;
  onRunDueAutomations?: (
    commands: BuildModeCommand[],
    providerRoute?: ValorTaskBridgePayload["selectedProviderRoute"],
    promptContext?: BuildModePromptExecutionContext,
  ) => void;
  onRunAutonomousQueue?: (
    commands: BuildModeCommand[],
    providerRoute?: ValorTaskBridgePayload["selectedProviderRoute"],
    promptContext?: BuildModePromptExecutionContext,
    commandCatalog?: BuildModeCommand[],
  ) => void;
  onRunCommand?: (
    command: BuildModeCommand,
    approval?: BuildModeCommandApproval,
    providerRoute?: ValorTaskBridgePayload["selectedProviderRoute"],
    promptContext?: BuildModePromptExecutionContext,
    commandCatalog?: BuildModeCommand[],
  ) => void;
  onSetAutomationStatus?: (id: string, status: "paused" | "scheduled") => void;
}

const routeLabel: Record<
  ValorTaskBridgePayload["selectedProviderRoute"],
  string
> = {
  "bring-your-own-key": "Use my API key",
  "valkyr-credits": "Use Valkyr credits",
  "local-model": "Use local model",
  "enterprise-proxy": "Use enterprise proxy",
};

const approvalThresholdRank: Record<BuildModeApprovalThreshold, number> = {
  none: 0,
  operator: 1,
  owner: 2,
  admin: 3,
};

const maxApprovalThreshold = (
  current: BuildModeApprovalThreshold,
  candidate: BuildModeApprovalThreshold,
): BuildModeApprovalThreshold =>
  approvalThresholdRank[candidate] > approvalThresholdRank[current]
    ? candidate
    : current;

const Panel = ({
  children,
  id,
  title,
}: {
  children: ReactNode;
  id?: string;
  title: string;
}) => (
  <section className="build-mode__panel" aria-label={title} id={id}>
    <h2>{title}</h2>
    {children}
  </section>
);

const StatusPill = ({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "good" | "neutral" | "warn" | "danger";
}) => (
  <span className={`build-mode__status-pill build-mode__status-pill--${tone}`}>
    {children}
  </span>
);

const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="build-mode__stat">
    <span className="build-mode__label">{label}</span>
    <span className="build-mode__value">{value}</span>
  </div>
);

const List = ({ values }: { values: string[] }) => (
  <ul className="build-mode__list">
    {values.map((value) => (
      <li key={value}>{value}</li>
    ))}
  </ul>
);

const canOpenBuildModeArtifact = (uri: string): boolean => {
  if (!uri || /<redacted/i.test(uri)) {
    return false;
  }
  try {
    const parsed = new URL(uri);
    if (
      parsed.protocol !== "valoride:" ||
      parsed.hostname !== "build-mode" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      !parsed.pathname.startsWith("/artifacts/")
    ) {
      return false;
    }
    const segments = parsed.pathname
      .split("/")
      .filter(Boolean)
      .slice(1)
      .map((segment) => decodeURIComponent(segment));
    return (
      segments.length === 3 &&
      segments.every(
        (segment) =>
          segment &&
          segment !== "." &&
          segment !== ".." &&
          !segment.includes("/") &&
          !segment.includes("\\"),
      )
    );
  } catch {
    return false;
  }
};

const canOpenBuildModePreviewUrl = (url: string | undefined): boolean => {
  if (!url || /<redacted/i.test(url)) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
};

const formatScheduledAutomationScheduler = (
  scheduler: ValorTaskBridgePayload["scheduledAutomations"][number]["scheduler"],
): string =>
  (scheduler ?? "valkyrai-cron") === "valkyrai-cron"
    ? "ValkyrAI cron workflow launcher"
    : "unknown scheduler";

const hasValkyraiCronRegistration = (
  automation: ValorTaskBridgePayload["scheduledAutomations"][number],
): boolean =>
  (automation.scheduler ?? "valkyrai-cron") === "valkyrai-cron" &&
  Boolean(automation.valkyraiScheduleUri);

export const BuildModeView = ({
  payload,
  onClose,
  onOpenArtifact,
  onOpenPreview,
  onRunAutonomousQueue,
  onRunDueAutomations,
  onSetAutomationStatus,
  onRunCommand,
}: BuildModeViewProps) => {
  const [providerRoute, setProviderRoute] = useState(
    payload.selectedProviderRoute,
  );
  const [promptProfileId, setPromptProfileId] = useState(
    payload.selectedPromptProfileId,
  );
  const selectedPromptProfile =
    payload.promptProfiles.find((profile) => profile.id === promptProfileId) ??
    payload.promptProfiles[0];
  const selectedPromptBundle =
    payload.promptBundles.find(
      (bundle) => bundle.id === selectedPromptProfile?.promptBundleRef,
    ) ??
    payload.promptBundles.find(
      (bundle) => bundle.id === payload.selectedPromptBundleId,
    ) ??
    payload.promptBundles[0];
  const selectedPayload = useMemo(
    () => ({
      ...payload,
      selectedProviderRoute: providerRoute,
      selectedPromptBundleId:
        selectedPromptBundle?.id ?? payload.selectedPromptBundleId,
      selectedPromptProfileId: selectedPromptProfile?.id ?? promptProfileId,
    }),
    [
      payload,
      promptProfileId,
      providerRoute,
      selectedPromptBundle?.id,
      selectedPromptProfile?.id,
    ],
  );
  const finalReportMarkdown = useMemo(
    () => renderBuildModeFinalReport(selectedPayload),
    [selectedPayload],
  );
  const commandById = useMemo(
    () =>
      new Map(
        getBuildModeCommandCatalog(selectedPayload).map((command) => [
          command.id,
          command,
        ]),
      ),
    [selectedPayload],
  );
  const mcpToolCommands = useMemo(
    () => getBuildModeMcpToolCommands(selectedPayload),
    [selectedPayload],
  );
  const latestReceiptByCommandId = useMemo(() => {
    const latest = new Map<
      string,
      ValorTaskBridgePayload["commandReceipts"][number]
    >();
    for (const receipt of selectedPayload.commandReceipts) {
      const current = latest.get(receipt.commandId);
      if (
        !current ||
        Date.parse(receipt.createdAt) >= Date.parse(current.createdAt)
      ) {
        latest.set(receipt.commandId, receipt);
      }
    }
    return latest;
  }, [selectedPayload.commandReceipts]);
  const nextExecutionAction = useMemo(
    () => getNextBuildModeExecutionAction(selectedPayload),
    [selectedPayload],
  );
  const autonomyDecision = useMemo(
    () => deriveBuildModeAutonomyDecision(selectedPayload),
    [selectedPayload],
  );
  const autonomousQueuePlan = useMemo(
    () => deriveBuildModeAutonomousQueuePlan(selectedPayload),
    [selectedPayload],
  );
  const currentConsecutiveCommands = useMemo(
    () =>
      getBuildModeCurrentConsecutiveCommandCount(
        selectedPayload.commandReceipts,
      ),
    [selectedPayload.commandReceipts],
  );
  const readinessPassedCount = selectedPayload.readinessGates.filter(
    (gate) => gate.status === "passed",
  ).length;
  const blockingGateCount = selectedPayload.readinessGates.filter(
    (gate) => gate.blocksRun && gate.status !== "passed",
  ).length;
  const commandStatusCounts = selectedPayload.commands.reduce(
    (counts, command) => ({
      ...counts,
      [command.status]: (counts[command.status] ?? 0) + 1,
    }),
    {} as Record<string, number>,
  );
  const cronRegisteredCount = selectedPayload.scheduledAutomations.filter(
    hasValkyraiCronRegistration,
  ).length;
  const nextCommand = nextExecutionAction?.command;
  const canRunNextExecutionStep = autonomyDecision.status === "continue";
  const canApproveNextExecutionStep =
    autonomyDecision.status === "approval-required";
  const dispatchableAutonomousCommands =
    autonomousQueuePlan.dispatchableCommandIds
      .map((commandId) => commandById.get(commandId))
      .filter((command): command is BuildModeCommand => Boolean(command));
  const isNextExecutionCommand = (command: BuildModeCommand) =>
    nextExecutionAction?.command.id === command.id;
  const canRunCommandFromRunner = (command: BuildModeCommand) =>
    isNextExecutionCommand(command) && canRunNextExecutionStep;
  const canApproveCommandFromRunner = (command: BuildModeCommand) =>
    isNextExecutionCommand(command) && canApproveNextExecutionStep;
  const canUseGuardedCommandControl = (command: BuildModeCommand) =>
    canRunCommandFromRunner(command) || canApproveCommandFromRunner(command);
  const createApproval = (
    command: BuildModeCommand,
  ): BuildModeCommandApproval => {
    const permission = payload.toolPermissions.find(
      (item) => item.capabilityId === command.capabilityId,
    );
    const permissionThreshold =
      permission?.approvalThreshold && permission.approvalThreshold !== "none"
        ? permission.approvalThreshold
        : "operator";
    const decisionThreshold =
      autonomyDecision.status === "approval-required" &&
      autonomyDecision.nextCommandId === command.id &&
      autonomyDecision.requiredApprovalThreshold
        ? autonomyDecision.requiredApprovalThreshold
        : "operator";
    return {
      approved: true,
      approverPrincipalId: payload.scope.principalId,
      approverRoles: payload.scope.roles,
      threshold: maxApprovalThreshold(permissionThreshold, decisionThreshold),
      reason: `Approved in Build Mode for ${command.label}.`,
      createdAt: new Date().toISOString(),
    };
  };
  const runCommand = (
    command: BuildModeCommand,
    approval?: BuildModeCommandApproval,
  ) =>
    onRunCommand?.(
      command,
      approval,
      providerRoute,
      getBuildModePromptExecutionContext(selectedPayload, promptProfileId),
      Array.from(commandById.values()),
    );
  const runRunnableCommand = (command: BuildModeCommand) => {
    if (canRunCommandFromRunner(command)) {
      runCommand(command);
    }
  };
  const approveAndRunCommand = (command: BuildModeCommand) => {
    if (canApproveCommandFromRunner(command)) {
      runCommand(command, createApproval(command));
    }
  };
  const runGuardedCommand = (command: BuildModeCommand) => {
    if (canApproveCommandFromRunner(command)) {
      approveAndRunCommand(command);
      return;
    }
    runRunnableCommand(command);
  };
  const runAutonomousQueue = () => {
    if (!dispatchableAutonomousCommands.length) {
      return;
    }
    onRunAutonomousQueue?.(
      dispatchableAutonomousCommands,
      providerRoute,
      getBuildModePromptExecutionContext(selectedPayload, promptProfileId),
      Array.from(commandById.values()),
    );
  };

  return (
    <main className="build-mode" data-testid="build-mode-view">
      <header className="build-mode__header">
        <div>
          <h1 className="build-mode__title">
            Build Mode: {payload.appBundle.name}
          </h1>
          <p className="build-mode__primary-line">{payload.primaryLine}</p>
        </div>
        <div className="build-mode__meta">
          <span className="build-mode__chip">{payload.source}</span>
          <span className="build-mode__chip">{payload.taskId}</span>
          <span className="build-mode__chip">
            Context {payload.grayMatterContextPack.id}
          </span>
          {onClose && (
            <button
              className="build-mode__button"
              onClick={onClose}
              type="button"
              title="Close Build Mode"
            >
              <FaTimes aria-hidden="true" />
              Close
            </button>
          )}
        </div>
      </header>

      <section className="build-mode__operator-strip" aria-label="Build Mode status">
        <div className="build-mode__operator-main">
          <div className="build-mode__operator-kicker">Next</div>
          <div className="build-mode__operator-title">
            {nextExecutionAction
              ? `${nextExecutionAction.step.label}: ${nextExecutionAction.command.label}`
              : "No runnable command"}
          </div>
          <div className="build-mode__operator-detail">
            {nextCommand ? nextCommand.command : autonomyDecision.summary}
          </div>
        </div>
        <div className="build-mode__operator-metrics" aria-label="Build Mode metrics">
          <StatusPill tone={blockingGateCount ? "warn" : "good"}>
            <FaShieldAlt aria-hidden="true" />
            {readinessPassedCount}/{selectedPayload.readinessGates.length} gates
          </StatusPill>
          <StatusPill tone={autonomyDecision.status === "continue" ? "good" : "warn"}>
            <FaBolt aria-hidden="true" />
            {autonomyDecision.status}
          </StatusPill>
          <StatusPill tone={commandStatusCounts.failed ? "danger" : "neutral"}>
            <FaCheckCircle aria-hidden="true" />
            {commandStatusCounts.succeeded ?? 0} done
          </StatusPill>
          <StatusPill tone="neutral">
            <FaClock aria-hidden="true" />
            {cronRegisteredCount}/{selectedPayload.scheduledAutomations.length} cron
          </StatusPill>
          <StatusPill tone={blockingGateCount ? "warn" : "neutral"}>
            <FaExclamationTriangle aria-hidden="true" />
            {blockingGateCount} blockers
          </StatusPill>
        </div>
        <div className="build-mode__operator-actions">
          <button
            aria-label="Run next Build Mode command"
            className="build-mode__button build-mode__button--primary"
            disabled={!nextCommand || !canRunNextExecutionStep}
            onClick={() => nextCommand && runRunnableCommand(nextCommand)}
            title="Run next Build Mode command"
            type="button"
          >
            <FaPlay aria-hidden="true" />
            Run
          </button>
          <button
            aria-label="Approve and run next Build Mode command"
            className="build-mode__button"
            disabled={!nextCommand || !canApproveNextExecutionStep}
            onClick={() => nextCommand && approveAndRunCommand(nextCommand)}
            title="Approve and run next Build Mode command"
            type="button"
          >
            <FaCheckCircle aria-hidden="true" />
            Approve
          </button>
        </div>
      </section>

      <nav className="build-mode__section-nav" aria-label="Build Mode sections">
        <a href="#build-mode-runbook">Runbook</a>
        <a href="#build-mode-automation">Automation</a>
        <a href="#build-mode-context">Context</a>
        <a href="#build-mode-evidence">Evidence</a>
        <a href="#build-mode-report">Report</a>
      </nav>

      <div className="build-mode__body">
        <div className="build-mode__column">
          <Panel id="build-mode-context" title="App Bundle Inspector">
            <div className="build-mode__grid">
              <Stat label="Bundle ID" value={payload.appBundle.id} />
              <Stat label="Version" value={payload.appBundle.version} />
              <Stat
                label="Product Line"
                value={payload.appBundle.productLine}
              />
              <Stat
                label="Source Session"
                value={payload.appBundle.sourceSessionId}
              />
            </div>
            <h3>Intent</h3>
            <p>{payload.appBundle.intent}</p>
            <div className="build-mode__muted">
              proof: {payload.appBundle.receiptIds?.join(", ") || "none"}
            </div>
            <h3>Artifacts</h3>
            <List
              values={payload.appBundle.artifacts.map(
                (artifact) => `${artifact.path} (${artifact.kind})`,
              )}
            />
          </Panel>

          <Panel title="Scope And RBAC">
            <div className="build-mode__grid">
              <Stat label="Tenant" value={payload.scope.tenantId} />
              <Stat label="Principal" value={payload.scope.principalId} />
              <Stat label="Workspace" value={payload.scope.workspaceRoot} />
              <Stat
                label="Project"
                value={payload.scope.projectId ?? "not set"}
              />
            </div>
            <h3>Roles</h3>
            <List values={payload.scope.roles} />
            <h3>Policy Refs</h3>
            <List values={payload.scope.policyRefs} />
            <h3>Ignored Path Patterns</h3>
            <List
              values={
                payload.scope.ignoredPathPatterns?.length
                  ? payload.scope.ignoredPathPatterns
                  : ["none"]
              }
            />
          </Panel>

          <Panel title="Component Bundle Inspector">
            <div className="build-mode__cards">
              {payload.componentBundles.map((bundle) => (
                <article className="build-mode__item" key={bundle.id}>
                  <div className="build-mode__item-title">{bundle.name}</div>
                  <div className="build-mode__muted">
                    {bundle.framework} - {bundle.generatedBy} - {bundle.status}
                  </div>
                  <div className="build-mode__muted">
                    proof: {bundle.receiptIds?.join(", ") || "none"}
                  </div>
                  <h3>Entrypoints</h3>
                  <List values={bundle.entrypoints} />
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="ExecModule Registry">
            <div className="build-mode__cards">
              {payload.execModules.map((module) => (
                <article className="build-mode__item" key={module.id}>
                  <div className="build-mode__item-title">{module.name}</div>
                  <div>{module.capability}</div>
                  <div className="build-mode__muted">
                    {module.version} - {module.safetyLevel}
                  </div>
                  <div className="build-mode__muted">
                    proof: {module.receiptIds?.join(", ") || "none"}
                  </div>
                  <code>{module.id}</code>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="ThorAPI And VAIX">
            <div className="build-mode__cards">
              {payload.thorApiVaixBindings.map((binding) => (
                <article className="build-mode__item" key={binding.id}>
                  <div className="build-mode__item-title">
                    {binding.serviceName}
                  </div>
                  <div className="build-mode__muted">
                    {binding.surface} - {binding.policy}
                  </div>
                  <code>{binding.clientRef}</code>
                  <h3>Operations</h3>
                  <List values={binding.operationRefs} />
                  <h3>Generated</h3>
                  <List values={binding.generatedPaths} />
                  <h3>Editable Adapters</h3>
                  <List values={binding.editableAdapterPaths} />
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Capability Matrix">
            <div className="build-mode__cards">
              {payload.capabilities.map((capability) => (
                <article className="build-mode__item" key={capability.id}>
                  <div className="build-mode__item-title">
                    {capability.label}
                  </div>
                  <div className="build-mode__muted">
                    {capability.kind} - {capability.risk}
                    {capability.requiresApproval ? " - approval required" : ""}
                  </div>
                  <div>{capability.enabled ? "Enabled" : "Disabled"}</div>
                  <div className="build-mode__muted">
                    proof: {capability.receiptIds?.join(", ") || "none"}
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Guardrails">
            <div className="build-mode__cards">
              {payload.guardrails.map((guardrail) => (
                <article className="build-mode__item" key={guardrail.id}>
                  <div className="build-mode__item-title">
                    {guardrail.label}
                  </div>
                  <div className="build-mode__muted">
                    {guardrail.enforcement}
                  </div>
                  <div className="build-mode__muted">
                    receipts: {guardrail.receiptIds?.join(", ") || "none"}
                  </div>
                  <div>{guardrail.summary}</div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Tool Permissions">
            <div className="build-mode__cards">
              {payload.toolPermissions.map((permission) => (
                <article className="build-mode__item" key={permission.id}>
                  <div className="build-mode__item-title">
                    {permission.label}
                  </div>
                  <div className="build-mode__muted">
                    {permission.capabilityId} - {permission.decision} -
                    threshold {permission.approvalThreshold}
                  </div>
                  <div>{permission.reason}</div>
                  <div className="build-mode__muted">
                    receipts{" "}
                    {permission.receiptRequired ? "required" : "optional"}
                  </div>
                  <div className="build-mode__muted">
                    proof: {permission.receiptIds?.join(", ") || "none"}
                  </div>
                  <List values={permission.scopeRefs} />
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Autonomy Policy">
            <p>{payload.autonomyPolicy.label}</p>
            <div className="build-mode__grid">
              <Stat label="Mode" value={payload.autonomyPolicy.mode} />
              <Stat
                label="Command Cap"
                value={payload.autonomyPolicy.maxConsecutiveCommands}
              />
              <Stat label="Current Chain" value={currentConsecutiveCommands} />
              <Stat
                label="Credit Cap"
                value={payload.autonomyPolicy.maxEstimatedCredits}
              />
              <Stat
                label="Estimated Credits"
                value={payload.creditEstimate.estimatedCredits}
              />
              <Stat
                label="Receipts"
                value={
                  payload.autonomyPolicy.receiptRequired
                    ? "required"
                    : "optional"
                }
              />
            </div>
            <div className="build-mode__muted">
              policy proof:{" "}
              {payload.autonomyPolicy.receiptIds?.join(", ") || "none"}
            </div>
            <h3>Autonomy Decision</h3>
            <div className="build-mode__item">
              <div className="build-mode__item-title">
                {autonomyDecision.status}
              </div>
              <div>{autonomyDecision.summary}</div>
              <div className="build-mode__muted">
                {autonomyDecision.nextCommandId ?? "no next command"} -{" "}
                {autonomyDecision.capabilityId ?? "no capability"}
              </div>
            </div>
            <h3>Decision Reasons</h3>
            <List values={autonomyDecision.reasonCodes} />
            <h3>Autonomous Queue Plan</h3>
            <div className="build-mode__item">
              <div className="build-mode__item-title">
                {autonomousQueuePlan.status}
              </div>
              <div>{autonomousQueuePlan.summary}</div>
              <div className="build-mode__muted">
                dispatchable{" "}
                {autonomousQueuePlan.dispatchableCommandIds.join(", ") ||
                  "none"}{" "}
                - approval{" "}
                {autonomousQueuePlan.approvalCommandIds.join(", ") || "none"}
              </div>
              <div className="build-mode__muted">
                blocked{" "}
                {autonomousQueuePlan.blockedCommandIds.join(", ") || "none"} -
                receipt {autonomousQueuePlan.receiptRequired ? "yes" : "no"}
              </div>
              <div className="build-mode__actions">
                <button
                  aria-label="Run Autonomous Queue"
                  className="build-mode__button"
                  disabled={!dispatchableAutonomousCommands.length}
                  onClick={runAutonomousQueue}
                  type="button"
                >
                  Run Queue
                </button>
              </div>
            </div>
            <h3>Allowed Capabilities</h3>
            <List values={payload.autonomyPolicy.allowedCapabilityIds} />
            <h3>Approval Required</h3>
            <List
              values={payload.autonomyPolicy.approvalRequiredCapabilityIds}
            />
            <h3>Stop Conditions</h3>
            <List values={payload.autonomyPolicy.stopConditions} />
            <h3>Escalation</h3>
            <List values={payload.autonomyPolicy.escalationRefs} />
          </Panel>

          <Panel title="Command Policy">
            <div className="build-mode__cards">
              {payload.commandPolicyRules.map((rule) => (
                <article className="build-mode__item" key={rule.id}>
                  <div className="build-mode__item-title">{rule.label}</div>
                  <div className="build-mode__muted">
                    {rule.effect} - {rule.enabled ? "enabled" : "disabled"}
                  </div>
                  <div>{rule.reason}</div>
                  <code>{rule.pattern}</code>
                  <div className="build-mode__muted">
                    proof: {rule.receiptIds?.join(", ") || "none"}
                  </div>
                  {rule.commandKinds?.length ? (
                    <List values={rule.commandKinds} />
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Checkpoints And Rollback">
            <div className="build-mode__cards">
              {payload.checkpoints.map((checkpoint) => {
                const createCommand = checkpoint.commandId
                  ? commandById.get(checkpoint.commandId)
                  : undefined;
                const rollbackCommand = checkpoint.rollbackCommandId
                  ? commandById.get(checkpoint.rollbackCommandId)
                  : undefined;

                return (
                  <article className="build-mode__item" key={checkpoint.id}>
                    <div className="build-mode__item-title">
                      {checkpoint.label}
                    </div>
                    <div>{checkpoint.summary}</div>
                    <div className="build-mode__muted">
                      {checkpoint.status}
                      {checkpoint.hash ? ` - ${checkpoint.hash}` : ""}
                    </div>
                    <List values={checkpoint.receiptIds} />
                    <div className="build-mode__actions">
                      {createCommand ? (
                        <button
                          aria-label={`Run ${createCommand.label}`}
                          className="build-mode__button"
                          disabled={!canUseGuardedCommandControl(createCommand)}
                          onClick={() => runGuardedCommand(createCommand)}
                          type="button"
                        >
                          Create
                        </button>
                      ) : null}
                      {rollbackCommand ? (
                        <button
                          aria-label={`Rollback ${checkpoint.label}`}
                          className="build-mode__button build-mode__button--danger"
                          disabled={
                            !canUseGuardedCommandControl(rollbackCommand)
                          }
                          onClick={() => runGuardedCommand(rollbackCommand)}
                          type="button"
                        >
                          Rollback
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel title="Safe Edits">
            <div className="build-mode__cards">
              {payload.safeEditPlans.map((plan) => {
                const editCommand = commandById.get(plan.commandId);

                return (
                  <article className="build-mode__item" key={plan.id}>
                    <div className="build-mode__item-title">{plan.label}</div>
                    <div>{plan.summary}</div>
                    <div className="build-mode__muted">
                      {plan.tool} - {plan.status}
                    </div>
                    <h3>Targets</h3>
                    <List values={plan.targetPaths} />
                    <h3>Protected</h3>
                    <List values={plan.protectedPaths} />
                    {plan.receiptIds.length ? (
                      <>
                        <h3>Receipts</h3>
                        <List values={plan.receiptIds} />
                      </>
                    ) : null}
                    {editCommand ? (
                      <div className="build-mode__actions">
                        <button
                          aria-label={`Apply ${plan.label}`}
                          className="build-mode__button"
                          disabled={!canUseGuardedCommandControl(editCommand)}
                          onClick={() => runGuardedCommand(editCommand)}
                          type="button"
                        >
                          Apply
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="build-mode__column">
          <Panel title="Agent Loop">
            <div className="build-mode__cards">
              {payload.agentLoop.map((phase) => (
                <article className="build-mode__item" key={phase.id}>
                  <div className="build-mode__item-title">{phase.label}</div>
                  <div className="build-mode__muted">{phase.status}</div>
                  <h3>Capabilities</h3>
                  <List values={phase.capabilityIds} />
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Readiness Gates">
            <div className="build-mode__cards">
              {payload.readinessGates.map((gate) => (
                <article className="build-mode__item" key={gate.id}>
                  <div className="build-mode__item-title">{gate.label}</div>
                  <div>{gate.summary}</div>
                  <div className="build-mode__muted">
                    {gate.status}
                    {gate.blocksRun ? " - blocks run" : ""}
                  </div>
                  <h3>Capabilities</h3>
                  <List values={gate.requiredCapabilityIds} />
                  {gate.requiredReceiptIds.length ? (
                    <>
                      <h3>Receipts</h3>
                      <List values={gate.requiredReceiptIds} />
                    </>
                  ) : null}
                  {gate.evidenceArtifactIds.length ? (
                    <>
                      <h3>Evidence</h3>
                      <List values={gate.evidenceArtifactIds} />
                    </>
                  ) : null}
                  {gate.commandIds.length ? (
                    <>
                      <h3>Commands</h3>
                      <List values={gate.commandIds} />
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel id="build-mode-runbook" title="Execution Plan">
            {nextExecutionAction ? (
              <article className="build-mode__item build-mode__command">
                <div>
                  <div className="build-mode__item-title">
                    Next: {nextExecutionAction.step.label}
                  </div>
                  <code>{nextExecutionAction.command.command}</code>
                  <div className="build-mode__muted">
                    {nextExecutionAction.command.capabilityId} -{" "}
                    {nextExecutionAction.command.status}
                  </div>
                  {nextExecutionAction.command.assignedSwarmRole ? (
                    <div className="build-mode__muted">
                      role {nextExecutionAction.command.assignedSwarmRole} -{" "}
                      {nextExecutionAction.command.assignedRuntimeId}
                    </div>
                  ) : null}
                </div>
                <div className="build-mode__actions">
                  <button
                    aria-label="Run Next Execution Step"
                    className="build-mode__button"
                    disabled={!canRunNextExecutionStep}
                    onClick={() =>
                      runRunnableCommand(nextExecutionAction.command)
                    }
                    type="button"
                  >
                    Run Next
                  </button>
                  {nextExecutionAction.command.requiresApproval ||
                  nextExecutionAction.command.status === "approval-required" ||
                  canApproveCommandFromRunner(nextExecutionAction.command) ? (
                    <button
                      aria-label="Approve Next Execution Step"
                      className="build-mode__button"
                      disabled={!canApproveNextExecutionStep}
                      onClick={() =>
                        approveAndRunCommand(nextExecutionAction.command)
                      }
                      type="button"
                    >
                      Approve & Run Next
                    </button>
                  ) : null}
                </div>
              </article>
            ) : null}
            <div className="build-mode__cards">
              {payload.executionPlan.map((step) => (
                <article className="build-mode__item" key={step.id}>
                  <div className="build-mode__item-title">{step.label}</div>
                  <div>{step.summary}</div>
                  <div className="build-mode__muted">
                    {step.status} - {step.runtimeId}
                  </div>
                  <div>{step.nextAction}</div>
                  {step.dependencyStepIds.length ? (
                    <>
                      <h3>Dependencies</h3>
                      <List values={step.dependencyStepIds} />
                    </>
                  ) : null}
                  {step.commandIds.length ? (
                    <>
                      <h3>Commands</h3>
                      <List values={step.commandIds} />
                    </>
                  ) : null}
                  {step.readinessGateIds.length ? (
                    <>
                      <h3>Gates</h3>
                      <List values={step.readinessGateIds} />
                    </>
                  ) : null}
                  {step.receiptIds.length ? (
                    <>
                      <h3>Receipts</h3>
                      <List values={step.receiptIds} />
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Agent Runtime Lanes">
            <div className="build-mode__cards">
              {payload.agentRuntimes.map((runtime) => (
                <article className="build-mode__item" key={runtime.id}>
                  <div className="build-mode__item-title">{runtime.label}</div>
                  <div className="build-mode__muted">
                    {runtime.runtime} - {runtime.status} -{" "}
                    {runtime.handoffPolicy}
                  </div>
                  <div>{runtime.ownerRole}</div>
                  <div className="build-mode__muted">
                    {runtime.promptProfileId} - {runtime.providerRoute}
                  </div>
                  <h3>Loop Phases</h3>
                  <List values={runtime.loopPhaseIds} />
                  {runtime.receiptIds.length ? (
                    <>
                      <h3>Receipts</h3>
                      <List values={runtime.receiptIds} />
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Local Model Runtime">
            <div className="build-mode__cards">
              {payload.localModelRuntimes.map((runtime) => (
                <article className="build-mode__item" key={runtime.id}>
                  <div className="build-mode__item-title">{runtime.label}</div>
                  <div className="build-mode__muted">
                    {runtime.modelRef} - {runtime.status} -{" "}
                    {runtime.executionMode}
                  </div>
                  <div>Runtime: {runtime.runtimeId}</div>
                  <div>Provider: {runtime.providerCredentialId}</div>
                  <div className="build-mode__muted">
                    Endpoint: {runtime.endpointRef}
                  </div>
                  {runtime.healthCheckCommandId ? (
                    <div>Health check: {runtime.healthCheckCommandId}</div>
                  ) : null}
                  <h3>Capabilities</h3>
                  <List values={runtime.capabilityIds} />
                  {runtime.receiptIds.length ? (
                    <>
                      <h3>Receipts</h3>
                      <List values={runtime.receiptIds} />
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Swarm Roles">
            <div className="build-mode__cards">
              {payload.swarmRoles.map((assignment) => (
                <article className="build-mode__item" key={assignment.role}>
                  <div className="build-mode__item-title">
                    {assignment.role}
                  </div>
                  <div className="build-mode__muted">
                    {assignment.status} - {assignment.owner}
                  </div>
                  <div>{assignment.currentFocus}</div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="GrayMatter Context Pack">
            <div className="build-mode__grid">
              <Stat
                label="Context Pack ID"
                value={payload.grayMatterContextPack.id}
              />
              <Stat
                label="Policy"
                value={payload.grayMatterContextPack.policy}
              />
              <Stat
                label="Answer Policy"
                value={payload.grayMatterContextPack.answerPolicy}
              />
              <Stat
                label="Retrieval Status"
                value={payload.grayMatterContextPack.retrievalStatus}
              />
              <Stat
                label="Invariant Preflight"
                value={payload.grayMatterContextPack.invariantPreflightStatus}
              />
              <Stat
                label="Compiled"
                value={payload.grayMatterContextPack.compiledAt}
              />
              <Stat
                label="Trace"
                value={payload.grayMatterContextPack.retrievalTraceId ?? "none"}
              />
              <Stat
                label="Preflight Receipt"
                value={
                  payload.grayMatterContextPack.preflightReceiptId ?? "none"
                }
              />
            </div>
            <p>{payload.grayMatterContextPack.summary}</p>
            <h3>Receipt IDs</h3>
            <List values={payload.grayMatterContextPack.retrievalReceiptIds} />
            <h3>Memory Entries</h3>
            <List values={payload.grayMatterContextPack.memoryEntryIds} />
            {payload.grayMatterContextPack.sourceRefs.length ? (
              <>
                <h3>Source Refs</h3>
                <List values={payload.grayMatterContextPack.sourceRefs} />
              </>
            ) : null}
            {payload.grayMatterContextPack.majorTaskRefs.length ? (
              <>
                <h3>Major Task Refs</h3>
                <List values={payload.grayMatterContextPack.majorTaskRefs} />
              </>
            ) : null}
          </Panel>

          <Panel title="Receipt Trail">
            <div className="build-mode__cards">
              {payload.receipts.map((receipt) => (
                <article className="build-mode__item" key={receipt.id}>
                  <div className="build-mode__item-title">{receipt.id}</div>
                  <div>{receipt.title}</div>
                  <div className="build-mode__muted">
                    {receipt.kind} - {receipt.status} - {receipt.actor}
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Credits And Provider Route">
            <div className="build-mode__grid">
              <Stat
                label="Estimated Credits"
                value={`${payload.creditEstimate.estimatedCredits} ${payload.creditEstimate.currency}`}
              />
              <Stat
                label="Hosted Infrastructure"
                value={`${payload.creditEstimate.estimatedHostedInfrastructureCredits} credits`}
              />
              <Stat
                label="Actual Usage"
                value={`${payload.creditUsageReceipts.reduce((sum, receipt) => sum + receipt.actualCredits, 0)} credits`}
              />
            </div>
            <div className="build-mode__muted">
              estimate proof:{" "}
              {payload.creditEstimate.receiptIds?.join(", ") || "none"}
            </div>
            <h3>Provider Route</h3>
            <select
              aria-label="Provider route"
              className="build-mode__select"
              value={providerRoute}
              onChange={(event) =>
                setProviderRoute(
                  event.target
                    .value as ValorTaskBridgePayload["selectedProviderRoute"],
                )
              }
            >
              {payload.providerCredentials.map((credential) => (
                <option key={credential.id} value={credential.route}>
                  {routeLabel[credential.route]} - {credential.displayName}
                </option>
              ))}
            </select>
            <h3>Usage Ledger</h3>
            <List
              values={payload.creditUsageReceipts.map(
                (receipt) =>
                  `${receipt.commandId} (${receipt.capabilityId}, ${receipt.providerRoute}, ${receipt.commandStatus}): ${receipt.actualCredits} credits (${receipt.providerCredits} provider, ${receipt.hostedInfrastructureCredits} hosted)${receipt.billingSummary ? ` - ${receipt.billingSummary}` : ""}`,
              )}
            />
            <h3>Estimate Assumptions</h3>
            <List values={payload.creditEstimate.assumptions} />
            <h3>Credential References</h3>
            <List
              values={payload.providerCredentials.map(
                (credential) =>
                  `${credential.id} (${credential.tenantScoped ? "tenant scoped" : "local"}; proof: ${credential.receiptIds?.join(", ") || "none"})`,
              )}
            />
          </Panel>

          <Panel title="Prompt Profile">
            <select
              aria-label="Prompt profile"
              className="build-mode__select"
              value={promptProfileId}
              onChange={(event) => setPromptProfileId(event.target.value)}
            >
              {payload.promptProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            {selectedPromptProfile && (
              <>
                <p>
                  {selectedPromptProfile.description} (
                  {selectedPromptProfile.promptBundleRef})
                </p>
                <div className="build-mode__muted">
                  proof: {selectedPromptProfile.receiptIds?.join(", ") || "none"}
                </div>
              </>
            )}
          </Panel>

          <Panel title="Prompt Bundle">
            {selectedPromptBundle ? (
              <>
                <div className="build-mode__grid">
                  <Stat label="Bundle" value={selectedPromptBundle.name} />
                  <Stat label="Version" value={selectedPromptBundle.version} />
                  <Stat label="Source" value={selectedPromptBundle.source} />
                  <Stat label="Policy" value={selectedPromptBundle.policy} />
                </div>
                <h3>Receipts</h3>
                <List values={selectedPromptBundle.receiptIds} />
                <h3>Sections</h3>
                <div className="build-mode__cards">
                  {selectedPromptBundle.sections.map((section) => (
                    <article className="build-mode__item" key={section.id}>
                      <div className="build-mode__item-title">
                        {section.title}
                      </div>
                      <div>{section.purpose}</div>
                      <div className="build-mode__muted">
                        {section.sourceRef}
                      </div>
                      {section.checksum ? (
                        <code>{section.checksum}</code>
                      ) : null}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p>No prompt bundle loaded.</p>
            )}
          </Panel>

          <Panel title="Connector Access">
            <div className="build-mode__cards">
              {payload.connectorBindings.length ? (
                payload.connectorBindings.map((binding) => (
                  <article className="build-mode__item" key={binding.id}>
                    <div className="build-mode__item-title">
                      {binding.connectorName}
                    </div>
                    <div>
                      {binding.connectorId} - {binding.status}
                    </div>
                    <div className="build-mode__muted">
                      data: {binding.dataClasses.join(", ") || "none"}
                    </div>
                    <div className="build-mode__muted">
                      actions: {binding.allowedActions.join(", ") || "none"}
                    </div>
                    <div className="build-mode__muted">
                      commands: {binding.commandIds.join(", ") || "none"}
                    </div>
                    <div className="build-mode__muted">
                      proof: {binding.receiptIds?.join(", ") || "none"}
                    </div>
                  </article>
                ))
              ) : (
                <p>No connector access bindings loaded.</p>
              )}
            </div>
          </Panel>

          <Panel title="MCP Server And Workflow Tools">
            <h3>MCP Servers</h3>
            <div className="build-mode__cards">
              {payload.mcpServers.length ? (
                payload.mcpServers.map((server) => (
                  <article className="build-mode__item" key={server.id}>
                    <div className="build-mode__item-title">
                      {server.name}
                    </div>
                    <div>
                      {server.transport} - {server.status} - {server.scope}
                    </div>
                    <div className="build-mode__muted">
                      tools: {server.toolIds.join(", ") || "none"}
                    </div>
                    <div className="build-mode__muted">
                      proof: {server.receiptIds?.join(", ") || "none"}
                    </div>
                  </article>
                ))
              ) : (
                <p>No MCP servers loaded.</p>
              )}
            </div>
            <h3>MCP Tool Registry</h3>
            <div className="build-mode__cards">
              {payload.mcpTools.length ? (
                payload.mcpTools.map((tool) => (
                  <article className="build-mode__item" key={tool.id}>
                    <div className="build-mode__item-title">{tool.name}</div>
                    <div>
                      {tool.capabilityId} - {tool.status}
                    </div>
                    <div className="build-mode__muted">
                      server: {tool.serverId}
                    </div>
                    {tool.execModuleId ? (
                      <div className="build-mode__muted">
                        ExecModule {tool.execModuleId}
                      </div>
                    ) : null}
                    {tool.workflowRef ? <code>{tool.workflowRef}</code> : null}
                    <div className="build-mode__muted">
                      proof: {tool.receiptIds?.join(", ") || "none"}
                    </div>
                  </article>
                ))
              ) : (
                <p>No MCP tool registry loaded.</p>
              )}
            </div>
            <h3>Connected MCP Tools</h3>
            <div className="build-mode__cards">
              {mcpToolCommands.length ? (
                mcpToolCommands.map((command) => {
                  const receipt = latestReceiptByCommandId.get(command.id);
                  const target = getBuildModeMcpToolTarget(command, receipt);
                  const resultArtifact = receipt?.artifacts?.find(
                    (artifact) =>
                      artifact.kind === "mcp_result" &&
                      artifact.commandId === command.id,
                  );

                  return (
                    <article className="build-mode__item" key={command.id}>
                      <div className="build-mode__item-title">
                        {command.label}
                      </div>
                      <div>
                        {target.serverName ?? "mcp"}{" "}
                        {target.toolName ? `- ${target.toolName}` : ""}
                      </div>
                      <div className="build-mode__muted">
                        {command.capabilityId} - {command.status}
                      </div>
                      <div className="build-mode__muted">
                        proof: {receipt?.id ?? command.receiptId ?? "none"}
                      </div>
                      {resultArtifact ? (
                        <div className="build-mode__muted">
                          artifact: {resultArtifact.id}
                        </div>
                      ) : null}
                      {command.assignedSwarmRole ? (
                        <div className="build-mode__muted">
                          role: {command.assignedSwarmRole} -{" "}
                          {command.assignedRuntimeId}
                        </div>
                      ) : null}
                      <code>
                        {formatBuildModeMcpToolCommandLine(command, receipt)}
                      </code>
                      <button
                        aria-label={`Run ${command.label}`}
                        className="build-mode__button"
                        disabled={!canUseGuardedCommandControl(command)}
                        onClick={() => runGuardedCommand(command)}
                        type="button"
                      >
                        Run Tool
                      </button>
                    </article>
                  );
                })
              ) : (
                <p>No connected MCP tool commands loaded.</p>
              )}
            </div>
            <h3>Workflow MCP Bindings</h3>
            <div className="build-mode__cards">
              {payload.workflowMcpBindings.map((binding) => {
                const generatedCommand = createWorkflowMcpCommand(binding);
                const command =
                  commandById.get(generatedCommand.id) ?? generatedCommand;

                return (
                  <article className="build-mode__item" key={binding.id}>
                    <div className="build-mode__item-title">
                      {binding.toolName}
                    </div>
                    <div>{binding.serverName}</div>
                    <div className="build-mode__muted">
                      {binding.workflowRef} -{" "}
                      {binding.approvalRequired ? "approval required" : "auto"}
                    </div>
                    <div className="build-mode__muted">
                      ExecModule {binding.execModuleId}
                    </div>
                    <div className="build-mode__muted">
                      proof: {binding.receiptIds?.join(", ") || "none"}
                    </div>
                    <code>{binding.inputContractRef}</code>
                    {command.assignedSwarmRole ? (
                      <div className="build-mode__muted">
                        role: {command.assignedSwarmRole} -{" "}
                        {command.assignedRuntimeId}
                      </div>
                    ) : null}
                    <button
                      aria-label={`Run ${binding.toolName}`}
                      className="build-mode__button"
                      disabled={!canUseGuardedCommandControl(command)}
                      onClick={() => runGuardedCommand(command)}
                      type="button"
                    >
                      Run Tool
                    </button>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel id="build-mode-automation" title="Scheduled Automations">
            <button
              aria-label="Refresh scheduled automations"
              className="build-mode__button"
              onClick={() =>
                onRunDueAutomations?.(
                  Array.from(commandById.values()),
                  providerRoute,
                  getBuildModePromptExecutionContext(
                    selectedPayload,
                    promptProfileId,
                  ),
                )
              }
              type="button"
            >
              Refresh
            </button>
            <div className="build-mode__cards">
              {payload.scheduledAutomations.map((automation) => {
                const generatedCommand =
                  createScheduledAutomationCommand(automation);
                const command =
                  commandById.get(generatedCommand.id) ?? generatedCommand;

                return (
                  <article className="build-mode__item" key={automation.id}>
                    <div className="build-mode__item-title">
                      {automation.label}
                    </div>
                    <div>{automation.workflowRef}</div>
                    <div className="build-mode__muted">
                      {automation.schedule} - {automation.status}
                      {automation.approvalRequired
                        ? " - approval required"
                        : ""}
                    </div>
                    <div className="build-mode__muted">
                      scheduler:{" "}
                      {formatScheduledAutomationScheduler(automation.scheduler)}
                      {automation.valkyraiWorkflowId
                        ? ` - ${automation.valkyraiWorkflowId}`
                        : ""}
                    </div>
                    {command.assignedSwarmRole ? (
                      <div className="build-mode__muted">
                        role: {command.assignedSwarmRole} -{" "}
                        {command.assignedRuntimeId}
                      </div>
                    ) : null}
                    {automation.providerRoute ? (
                      <div className="build-mode__muted">
                        provider: {automation.providerRoute}
                      </div>
                    ) : null}
                    {automation.promptContext ? (
                      <div className="build-mode__muted">
                        prompt: {automation.promptContext.promptProfileName} -{" "}
                        {automation.promptContext.promptBundleId}@
                        {automation.promptContext.promptBundleVersion}
                      </div>
                    ) : null}
                    {automation.nextRunAt && (
                      <div className="build-mode__muted">
                        next run: {automation.nextRunAt}
                      </div>
                    )}
                    {automation.lastRunAt && (
                      <div className="build-mode__muted">
                        last run: {automation.lastRunStatus ?? "unknown"} at{" "}
                        {automation.lastRunAt}
                      </div>
                    )}
                    {automation.lastRunReceiptId && (
                      <code>{automation.lastRunReceiptId}</code>
                    )}
                    {automation.runHistory?.length ? (
                      <>
                        <h3>Recent Runs</h3>
                        <List
                          values={automation.runHistory
                            .slice(0, 3)
                            .map(
                              (run) =>
                                `${run.status} at ${run.completedAt} (${run.receiptId})${run.error ? ` - ${run.error}` : ""}`,
                            )}
                        />
                      </>
                    ) : null}
                    {automation.status === "scheduled" ? (
                      <button
                        aria-label={`Pause ${automation.label}`}
                        className="build-mode__button"
                        disabled={!hasValkyraiCronRegistration(automation)}
                        onClick={() => {
                          if (hasValkyraiCronRegistration(automation)) {
                            onSetAutomationStatus?.(automation.id, "paused");
                          }
                        }}
                        type="button"
                      >
                        Pause
                      </button>
                    ) : null}
                    {automation.status === "paused" ? (
                      <button
                        aria-label={`Resume ${automation.label}`}
                        className="build-mode__button"
                        disabled={!hasValkyraiCronRegistration(automation)}
                        onClick={() => {
                          if (hasValkyraiCronRegistration(automation)) {
                            onSetAutomationStatus?.(automation.id, "scheduled");
                          }
                        }}
                        type="button"
                      >
                        Resume
                      </button>
                    ) : null}
                    <button
                      aria-label={`Schedule ${automation.label}`}
                      className="build-mode__button"
                      disabled={!canUseGuardedCommandControl(command)}
                      onClick={() => runGuardedCommand(command)}
                      type="button"
                    >
                      Schedule
                    </button>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel title="Command Runner">
            <div className="build-mode__cards">
              {payload.commands.map((payloadCommand) => {
                const command =
                  commandById.get(payloadCommand.id) ?? payloadCommand;
                return (
                  <article
                    className="build-mode__item build-mode__command"
                    key={command.id}
                  >
                    <div>
                      <div className="build-mode__item-title">
                        {command.label}
                      </div>
                      <code>{command.command}</code>
                      <div className="build-mode__muted">
                        {command.kind}
                        {command.requiresApproval ? " - approval required" : ""}
                      </div>
                      <div className="build-mode__muted">
                        {command.capabilityId} - {command.status}
                      </div>
                      {command.assignedSwarmRole ? (
                        <div className="build-mode__muted">
                          role: {command.assignedSwarmRole} -{" "}
                          {command.assignedRuntimeId}
                        </div>
                      ) : null}
                    </div>
                    <div className="build-mode__actions">
                      <button
                        aria-label={`Run ${command.label}`}
                        className="build-mode__button"
                        disabled={!canRunCommandFromRunner(command)}
                        onClick={() => runRunnableCommand(command)}
                        type="button"
                      >
                        Run
                      </button>
                      {command.requiresApproval ||
                      command.status === "approval-required" ||
                      canApproveCommandFromRunner(command) ? (
                        <button
                          aria-label={`Approve ${command.label}`}
                          className="build-mode__button"
                          disabled={!canApproveCommandFromRunner(command)}
                          onClick={() => approveAndRunCommand(command)}
                          type="button"
                        >
                          Approve & Run
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel title="Command Receipts">
            <div className="build-mode__cards">
              {payload.commandReceipts.map((receipt) => (
                <article className="build-mode__item" key={receipt.id}>
                  <div className="build-mode__item-title">{receipt.id}</div>
                  <div>{receipt.summary}</div>
                  <div className="build-mode__muted">
                    {receipt.capabilityId} - {receipt.status}
                    {receipt.requiresApproval ? " - approval required" : ""}
                  </div>
                  <div className="build-mode__muted">
                    {receipt.executionMode ?? "legacy-receipt"} - next:{" "}
                    {receipt.nextOperatorAction ?? "inspect"}
                  </div>
                  {receipt.assignedSwarmRole ? (
                    <div className="build-mode__muted">
                      Role {receipt.assignedSwarmRole} -{" "}
                      {receipt.assignedRuntimeId}
                    </div>
                  ) : null}
                  {receipt.promptContext ? (
                    <div className="build-mode__muted">
                      Prompt {receipt.promptContext.promptProfileName} -{" "}
                      {receipt.promptContext.promptBundleId}@
                      {receipt.promptContext.promptBundleVersion}
                    </div>
                  ) : null}
                  {receipt.grayMatterContextProof ? (
                    <div className="build-mode__muted">
                      Context {receipt.grayMatterContextProof.contextPackId} -{" "}
                      {receipt.grayMatterContextProof.retrievalStatus} -{" "}
                      {receipt.grayMatterContextProof.invariantPreflightStatus}
                    </div>
                  ) : null}
                  {receipt.operatorActionSummary ? (
                    <div>{receipt.operatorActionSummary}</div>
                  ) : null}
                  {receipt.artifacts?.length ? (
                    <List
                      values={receipt.artifacts.map(
                        (artifact) => `${artifact.title} (${artifact.kind})`,
                      )}
                    />
                  ) : null}
                  {receipt.policyReasons?.length ? (
                    <ul className="build-mode__policy-list">
                      {receipt.policyReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                  {receipt.approval ? (
                    <div className="build-mode__muted">
                      approved by {receipt.approval.approverPrincipalId} at{" "}
                      {receipt.approval.threshold}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Browser Verification">
            <div className="build-mode__grid">
              <Stat label="Status" value={payload.browserVerification.status} />
              <Stat
                label="Console Errors"
                value={payload.browserVerification.consoleErrorCount}
              />
              <Stat
                label="Preview"
                value={payload.browserVerification.previewUrl ?? "Not ready"}
              />
              <Stat
                label="Artifacts"
                value={payload.browserVerification.artifactIds.length}
              />
            </div>
            {payload.browserVerification.previewUrl && (
              <div className="build-mode__actions">
                <button
                  className="build-mode__button"
                  disabled={
                    !canOpenBuildModePreviewUrl(
                      payload.browserVerification.previewUrl,
                    )
                  }
                  onClick={() => {
                    if (
                      canOpenBuildModePreviewUrl(
                        payload.browserVerification.previewUrl,
                      )
                    ) {
                      onOpenPreview?.(payload.browserVerification.previewUrl!);
                    }
                  }}
                  type="button"
                >
                  Open Preview
                </button>
                {Array.from(commandById.values())
                  .filter((command) => command.kind === "verify")
                  .map((command) => (
                    <button
                      aria-label={`Run ${command.label} from Browser Verification panel`}
                      className="build-mode__button"
                      disabled={!canUseGuardedCommandControl(command)}
                      key={command.id}
                      onClick={() => runGuardedCommand(command)}
                      type="button"
                    >
                      Run {command.label}
                    </button>
                  ))}
              </div>
            )}
          </Panel>

          <Panel id="build-mode-evidence" title="Evidence Artifacts">
            <div className="build-mode__cards">
              {payload.evidenceArtifacts.map((artifact) => {
                const proof = formatEvidenceArtifactProof(artifact);
                return (
                  <article className="build-mode__item" key={artifact.id}>
                    <div className="build-mode__item-title">
                      {artifact.title}
                    </div>
                    <div className="build-mode__muted">
                      {artifact.kind} - {artifact.createdAt}
                    </div>
                    <code>{artifact.uri}</code>
                    {artifact.summary ? <div>{artifact.summary}</div> : null}
                    {proof ? (
                      <div className="build-mode__muted">{proof}</div>
                    ) : null}
                    {canOpenBuildModeArtifact(artifact.uri) ? (
                      <button
                        className="build-mode__button"
                        onClick={() => onOpenArtifact?.(artifact.uri)}
                        type="button"
                      >
                        Open Artifact
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel title="App Bundle Diff">
            {payload.appBundleDiffs.map((diff) => (
              <article className="build-mode__item" key={diff.id}>
                <div className="build-mode__item-title">{diff.title}</div>
                <div className="build-mode__muted">
                  {diff.appBundleId} - {diff.generatedAt}
                </div>
                <h3>Added</h3>
                <List
                  values={diff.addedArtifacts.map((artifactPath) =>
                    formatAppBundleDiffArtifactRef(
                      payload.appBundle,
                      artifactPath,
                    ),
                  )}
                />
                <h3>Changed</h3>
                <List
                  values={diff.changedArtifacts.map((artifactPath) =>
                    formatAppBundleDiffArtifactRef(
                      payload.appBundle,
                      artifactPath,
                    ),
                  )}
                />
                <h3>Removed</h3>
                <List
                  values={diff.removedArtifacts.map((artifactPath) =>
                    formatAppBundleDiffArtifactRef(
                      payload.appBundle,
                      artifactPath,
                    ),
                  )}
                />
                <h3>Receipts</h3>
                <List values={diff.receiptIds} />
                <h3>Evidence</h3>
                <List values={diff.evidenceArtifactIds} />
              </article>
            ))}
          </Panel>

          <Panel id="build-mode-report" title="Final Report">
            <pre className="build-mode__code">{finalReportMarkdown}</pre>
          </Panel>
        </div>
      </div>
    </main>
  );
};

export default BuildModeView;
