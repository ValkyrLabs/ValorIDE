import { useMemo, useState } from "react";

import {
  VSCodeButton,
  VSCodeDivider,
  VSCodeTextArea,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import type {
  AppGenerationRequest,
  GenerationReceipt,
} from "@thorapi/model";
import { AppGenerationRequestStatusEnum } from "@thorapi/model";
import {
  useCreateAppGenerationRequestMutation,
  useGetAppGenerationTraceQuery,
  useRunAppGenerationRequestMutation,
} from "@thorapi/services/creditsApi";
import { v4 as uuidv4 } from "uuid";
import { FaBolt, FaCodeBranch, FaPlay, FaSave } from "react-icons/fa";

import { sanitizeReceiptPayload } from "./ReceiptTraceInspector";

type TenantAppGenerationPanelProps = {
  accountId: string;
};

const getErrorText = (error: unknown): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const maybeData = (error as any).data;
    if (typeof maybeData?.message === "string") return maybeData.message;
    if (typeof maybeData?.error === "string") return maybeData.error;
    if (typeof (error as any).message === "string") return (error as any).message;
  }
  return "App generation request failed";
};

const prettyJson = (value: unknown): string =>
  JSON.stringify(sanitizeReceiptPayload(value), null, 2);

const requiredMessage = (accountId: string, applicationId: string): string => {
  if (!accountId) return "Account scope is required.";
  if (!applicationId.trim()) return "Application id is required before run.";
  return "";
};

const TenantAppGenerationPanel = ({
  accountId,
}: TenantAppGenerationPanelProps) => {
  const [tenantId, setTenantId] = useState("main");
  const [applicationId, setApplicationId] = useState("");
  const [intentSummary, setIntentSummary] = useState("");
  const [clarifyingQuestionsJson, setClarifyingQuestionsJson] = useState("");
  const [createdRequest, setCreatedRequest] = useState<
    AppGenerationRequest | undefined
  >();
  const [runReceipt, setRunReceipt] = useState<GenerationReceipt | undefined>();

  const [
    createAppGenerationRequest,
    {
      isLoading: isCreating,
      error: createError,
    },
  ] = useCreateAppGenerationRequestMutation();
  const [
    runAppGenerationRequest,
    {
      isLoading: isRunning,
      error: runError,
    },
  ] = useRunAppGenerationRequestMutation();

  const activeReceiptRef = runReceipt?.receiptRef || "";
  const traceQuery = useGetAppGenerationTraceQuery(activeReceiptRef, {
    skip: !activeReceiptRef,
  });

  const canCreate = Boolean(accountId && applicationId.trim());
  const canRun = Boolean(createdRequest?.requestRef && !isCreating && !isRunning);
  const validationMessage = requiredMessage(accountId, applicationId);
  const operationError = getErrorText(createError || runError || traceQuery.error);

  const requestPreview = useMemo(
    () => ({
      tenantId: tenantId.trim() || "main",
      accountId,
      applicationId: applicationId.trim(),
      status: AppGenerationRequestStatusEnum.READY,
    }),
    [accountId, applicationId, tenantId],
  );

  const handleCreate = async () => {
    if (!canCreate) return;

    const requestRef = `valoride-appgen-req-${uuidv4()}`;
    const traceId = `valoride-appgen-trace-${uuidv4()}`;
    const request: AppGenerationRequest = {
      requestRef,
      traceId,
      tenantId: tenantId.trim() || "main",
      accountId,
      applicationId: applicationId.trim(),
      status: AppGenerationRequestStatusEnum.READY,
      intentSummary: intentSummary.trim() || `Generate ${applicationId.trim()}`,
      clarifyingQuestionsJson: clarifyingQuestionsJson.trim() || undefined,
      idempotencyKey: `valoride-appgen-${uuidv4()}`,
      createdAt: new Date(),
    };

    const created = await createAppGenerationRequest(request).unwrap();
    setCreatedRequest(created);
    setRunReceipt(undefined);
  };

  const handleRun = async () => {
    const requestRef = createdRequest?.requestRef;
    if (!requestRef) return;
    const receipt = await runAppGenerationRequest(requestRef).unwrap();
    setRunReceipt(receipt);
  };

  return (
    <div className="tenant-app-generation-panel">
      <div className="tenant-app-generation-header">
        <div>
          <h3>Tenant App Generation</h3>
          <div className="tenant-app-generation-subtitle">
            {accountId || "No account"}
          </div>
        </div>
        <FaCodeBranch aria-hidden="true" />
      </div>

      <div className="tenant-app-generation-grid">
        <label>
          <span>Scope</span>
          <VSCodeTextField
            value={tenantId}
            onInput={(event) =>
              setTenantId((event.target as HTMLInputElement).value)
            }
          />
        </label>
        <label>
          <span>Application id</span>
          <VSCodeTextField
            value={applicationId}
            onInput={(event) =>
              setApplicationId((event.target as HTMLInputElement).value)
            }
          />
        </label>
      </div>

      <label className="tenant-app-generation-field">
        <span>Intent</span>
        <VSCodeTextArea
          value={intentSummary}
          rows={4}
          onInput={(event) =>
            setIntentSummary((event.target as HTMLTextAreaElement).value)
          }
        />
      </label>

      <label className="tenant-app-generation-field">
        <span>Clarifying JSON</span>
        <VSCodeTextArea
          value={clarifyingQuestionsJson}
          rows={3}
          onInput={(event) =>
            setClarifyingQuestionsJson(
              (event.target as HTMLTextAreaElement).value,
            )
          }
        />
      </label>

      <div className="tenant-app-generation-actions">
        <VSCodeButton
          appearance="primary"
          disabled={!canCreate || isCreating || isRunning}
          onClick={handleCreate}
        >
          <FaSave />
          Create
        </VSCodeButton>
        <VSCodeButton
          appearance="secondary"
          disabled={!canRun}
          onClick={handleRun}
        >
          <FaPlay />
          Run
        </VSCodeButton>
      </div>

      {validationMessage && (
        <div className="tenant-app-generation-alert">{validationMessage}</div>
      )}
      {(isCreating || isRunning || traceQuery.isFetching) && (
        <div className="tenant-app-generation-alert">Working...</div>
      )}
      {operationError && (
        <div className="tenant-app-generation-alert error">{operationError}</div>
      )}

      <div className="tenant-app-generation-summary">
        <div>
          <span>Request</span>
          <code>{createdRequest?.requestRef || "not created"}</code>
        </div>
        <div>
          <span>Trace</span>
          <code>{createdRequest?.traceId || "not created"}</code>
        </div>
        <div>
          <span>Receipt</span>
          <code>{runReceipt?.receiptRef || "not run"}</code>
        </div>
        <div>
          <span>Status</span>
          <code>{runReceipt?.status || createdRequest?.status || "draft"}</code>
        </div>
      </div>

      <VSCodeDivider />

      <details className="tenant-app-generation-json">
        <summary>
          <FaBolt aria-hidden="true" />
          Request preview
        </summary>
        <pre>{prettyJson(requestPreview)}</pre>
      </details>

      {createdRequest && (
        <details className="tenant-app-generation-json" open>
          <summary>Created request</summary>
          <pre>{prettyJson(createdRequest)}</pre>
        </details>
      )}

      {runReceipt && (
        <details className="tenant-app-generation-json" open>
          <summary>Generation receipt</summary>
          <pre>{prettyJson(runReceipt)}</pre>
        </details>
      )}

      {traceQuery.data && (
        <details className="tenant-app-generation-json" open>
          <summary>Generation trace</summary>
          <pre>{prettyJson(traceQuery.data)}</pre>
        </details>
      )}
    </div>
  );
};

export default TenantAppGenerationPanel;
