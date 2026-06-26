import { useMemo, useState } from "react";

import {
  VSCodeButton,
  VSCodeDivider,
  VSCodeTextArea,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import type {
  ContextCompressionReceipt,
  ContextPageItem,
  ContextPageResponse,
  HydrationPointer,
  RetrievalReceipt,
} from "@thorapi/model";
import { ContextPageTraverseRequestTraversalTypeEnum } from "@thorapi/model";
import {
  useCompileContextPageMutation,
  useGetContextPageQuery,
  useHydrateContextPageMutation,
  useRecompressContextPageMutation,
  useTraverseContextPageMutation,
} from "@thorapi/services/creditsApi";
import { v4 as uuidv4 } from "uuid";
import {
  FaBrain,
  FaCompressAlt,
  FaDatabase,
  FaExternalLinkAlt,
  FaExpandAlt,
  FaFileAlt,
  FaLink,
  FaProjectDiagram,
  FaReceipt,
  FaSearch,
  FaShieldAlt,
} from "react-icons/fa";

import { sanitizeReceiptPayload } from "./ReceiptTraceInspector";
import { vscode } from "@thorapi/utils/vscode";

type ContextPagePanelProps = {
  accountId: string;
};

const DEFAULT_CONTEXT_TOKEN_BUDGET = 100;
const CONTEXT_PAGE_HELP_URL =
  "https://valkyrlabs.comhttps://valkyrlabs.com/v1/Products/valoride/";

const getErrorText = (error: unknown): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const maybeData = (error as any).data;
    if (typeof (error as any).error === "string") return (error as any).error;
    if (typeof maybeData?.message === "string") return maybeData.message;
    if (typeof maybeData?.error === "string") return maybeData.error;
    if (typeof maybeData === "string") return maybeData;
    if (typeof (error as any).message === "string")
      return (error as any).message;
    try {
      return JSON.stringify(error);
    } catch {
      return "ContextPage operation failed";
    }
  }
  return "ContextPage operation failed";
};

const prettyJson = (value: unknown): string =>
  JSON.stringify(sanitizeReceiptPayload(value), null, 2);

const formatPercent = (value?: number): string | undefined => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return undefined;
  }
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
};

const compactLabel = (
  value?: string | number | boolean | null,
): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value).replace(/_/g, " ");
};

const joinList = (values?: string[]): string | undefined =>
  values?.filter(Boolean).join(", ") || undefined;

const splitRefs = (value: string): string[] =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const SourceMetric = ({
  title,
  value,
}: {
  title: string;
  value?: string | number | null;
}) => {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="context-source-metric">
      <span>{title}</span>
      <code>{String(value)}</code>
    </div>
  );
};

const SourceEvidenceDetails = ({
  title,
  payload,
}: {
  title: string;
  payload: unknown;
}) => (
  <details className="context-source-json">
    <summary>{title}</summary>
    <pre>{prettyJson(payload)}</pre>
  </details>
);

const ContextItemCard = ({ item }: { item: ContextPageItem }) => {
  const retrievalItem = item.retrievalReceiptItem;
  return (
    <details className="context-source-card">
      <summary>
        <span>{compactLabel(item.sourceType) || "source"}</span>
        <code>{item.itemRef}</code>
      </summary>
      {item.summary && <p>{item.summary}</p>}
      <div className="context-source-card-grid">
        <SourceMetric title="Source" value={item.sourceId} />
        <SourceMetric
          title="Relevance"
          value={formatPercent(item.relevanceScore)}
        />
        <SourceMetric
          title="Confidence"
          value={formatPercent(item.confidence)}
        />
        <SourceMetric title="Retained" value={compactLabel(item.retained)} />
        <SourceMetric title="Hydrated" value={compactLabel(item.hydrated)} />
        <SourceMetric title="Policy" value={item.policyDecision} />
        <SourceMetric title="Rank" value={retrievalItem?.rank} />
        <SourceMetric
          title="Final score"
          value={formatPercent(retrievalItem?.finalScore)}
        />
        <SourceMetric title="Text hash" value={retrievalItem?.textHash} />
      </div>
      {(retrievalItem?.textPreview || retrievalItem?.text) && (
        <p className="context-source-preview">
          {retrievalItem.textPreview || retrievalItem.text}
        </p>
      )}
      <SourceEvidenceDetails title="Item evidence" payload={item} />
    </details>
  );
};

const HydrationPointerCard = ({
  pointer,
  onSelect,
}: {
  pointer: HydrationPointer;
  onSelect: (pointerRef: string) => void;
}) => (
  <div className="context-source-card context-pointer-card">
    <div className="context-pointer-card-heading">
      <div>
        <span>{compactLabel(pointer.targetType) || "pointer"}</span>
        <code>{pointer.pointerRef}</code>
      </div>
      <VSCodeButton
        appearance="secondary"
        onClick={() => onSelect(pointer.pointerRef)}
        title="Use pointer for hydration"
      >
        <FaExpandAlt />
      </VSCodeButton>
    </div>
    {pointer.summary && <p>{pointer.summary}</p>}
    <div className="context-source-card-grid">
      <SourceMetric title="Target" value={pointer.targetId} />
      <SourceMetric title="Status" value={compactLabel(pointer.status)} />
      <SourceMetric title="Tokens" value={pointer.estimatedTokens} />
      <SourceMetric title="Policy" value={pointer.policy} />
      <SourceMetric title="URI" value={pointer.targetUri} />
      <SourceMetric
        title="Last hydrated"
        value={pointer.lastHydratedAt?.toLocaleString()}
      />
    </div>
  </div>
);

const RetrievalReceiptView = ({ receipt }: { receipt?: RetrievalReceipt }) => {
  if (!receipt) return null;
  return (
    <section className="context-source-section">
      <div className="context-source-section-title">
        <FaReceipt aria-hidden="true" />
        <h4>Retrieval Receipt</h4>
      </div>
      <div className="context-source-card-grid">
        <SourceMetric title="Receipt" value={receipt.receiptId} />
        <SourceMetric title="Trace" value={receipt.traceId} />
        <SourceMetric
          title="Mode"
          value={compactLabel(receipt.retrievalMode as any)}
        />
        <SourceMetric
          title="Status"
          value={compactLabel(receipt.retrievalStatus as any)}
        />
        <SourceMetric
          title="Action"
          value={compactLabel(receipt.recommendedAction as any)}
        />
        <SourceMetric
          title="Quality"
          value={formatPercent(receipt.quality?.overallScore)}
        />
        <SourceMetric title="Results" value={receipt.quality?.resultCount} />
        <SourceMetric
          title="Coverage"
          value={compactLabel(receipt.coverage?.coverageStatus)}
        />
        <SourceMetric title="Sources" value={receipt.provenance?.sourceCount} />
        <SourceMetric
          title="Source types"
          value={joinList(receipt.provenance?.sourceTypes)}
        />
        <SourceMetric title="RBAC" value={receipt.policy?.rbacDecision} />
        <SourceMetric
          title="Tenant checked"
          value={compactLabel(receipt.policy?.tenantScopeVerified)}
        />
        <SourceMetric
          title="Redactions"
          value={receipt.policy?.secureFieldRedactions}
        />
        <SourceMetric
          title="Restricted"
          value={receipt.policy?.restrictedRecordsExcluded}
        />
      </div>
      {receipt.items?.length ? (
        <div className="context-retrieval-items">
          {receipt.items.slice(0, 6).map((item, index) => (
            <div
              className="context-retrieval-item"
              key={`${item.memoryId || item.sourceId || "retrieval"}-${index}`}
            >
              <span>{compactLabel(item.sourceType) || "source"}</span>
              <code>
                {item.memoryId || item.sourceId || item.entityId || "item"}
              </code>
              <strong>
                {formatPercent(item.finalScore || item.similarityScore)}
              </strong>
              {(item.textPreview || item.text) && (
                <p>{item.textPreview || item.text}</p>
              )}
            </div>
          ))}
        </div>
      ) : null}
      <SourceEvidenceDetails title="Retrieval evidence" payload={receipt} />
    </section>
  );
};

const CompressionReceiptView = ({
  receipt,
}: {
  receipt?: ContextCompressionReceipt;
}) => {
  if (!receipt) return null;
  return (
    <section className="context-source-section">
      <div className="context-source-section-title">
        <FaCompressAlt aria-hidden="true" />
        <h4>Recompression</h4>
      </div>
      <div className="context-source-card-grid">
        <SourceMetric title="Receipt" value={receipt.receiptRef} />
        <SourceMetric title="Trace" value={receipt.traceId} />
        <SourceMetric title="Token delta" value={receipt.tokenDelta} />
        <SourceMetric
          title="Confidence change"
          value={formatPercent(receipt.confidenceChange)}
        />
        <SourceMetric title="Policy" value={receipt.policyDecision} />
        <SourceMetric
          title="Retained"
          value={receipt.retainedItemRefs?.length}
        />
        <SourceMetric
          title="Discarded"
          value={receipt.discardedItemRefs?.length}
        />
        <SourceMetric
          title="Hydrated sources"
          value={receipt.hydratedSourcesIncluded?.length}
        />
      </div>
      {receipt.newCompactSummary && (
        <p className="context-source-preview">{receipt.newCompactSummary}</p>
      )}
      <SourceEvidenceDetails title="Compression evidence" payload={receipt} />
    </section>
  );
};

const ContextSourceDrilldown = ({
  response,
  onSelectPointer,
}: {
  response: ContextPageResponse;
  onSelectPointer: (pointerRef: string) => void;
}) => {
  const page = response.contextPage;
  const retrievalReceipt = response.retrievalReceipt || page.retrievalReceipt;
  const compressionReceipt =
    response.compressionReceipt || page.compressionReceipt;
  const items = page.items || [];
  const pointers = page.hydrationPointers || [];

  return (
    <section
      className="context-source-drilldown"
      aria-label="Context source drilldown"
    >
      <div className="context-source-heading">
        <div>
          <span>{compactLabel(page.status) || "context"}</span>
          <h4>Source Hydration</h4>
        </div>
        <FaDatabase aria-hidden="true" />
      </div>

      <div className="context-source-card-grid">
        <SourceMetric
          title="Confidence"
          value={formatPercent(page.confidence)}
        />
        <SourceMetric title="Freshness" value={formatPercent(page.freshness)} />
        <SourceMetric title="Policy" value={page.policy} />
        <SourceMetric title="Recommended" value={page.recommendedAction} />
        <SourceMetric title="Parent" value={page.parentContextPage?.pageRef} />
        <SourceMetric title="Rating" value={page.rating?.rating} />
      </div>

      {items.length > 0 && (
        <section className="context-source-section">
          <div className="context-source-section-title">
            <FaFileAlt aria-hidden="true" />
            <h4>Included Sources</h4>
          </div>
          <div className="context-source-list">
            {items.slice(0, 10).map((item) => (
              <ContextItemCard item={item} key={item.itemRef} />
            ))}
          </div>
        </section>
      )}

      {pointers.length > 0 && (
        <section className="context-source-section">
          <div className="context-source-section-title">
            <FaLink aria-hidden="true" />
            <h4>Hydration Pointers</h4>
          </div>
          <div className="context-source-list">
            {pointers.slice(0, 10).map((pointer) => (
              <HydrationPointerCard
                key={pointer.pointerRef}
                pointer={pointer}
                onSelect={onSelectPointer}
              />
            ))}
          </div>
        </section>
      )}

      <RetrievalReceiptView receipt={retrievalReceipt} />
      <CompressionReceiptView receipt={compressionReceipt} />

      {(retrievalReceipt?.policy || page.policy) && (
        <section className="context-source-section">
          <div className="context-source-section-title">
            <FaShieldAlt aria-hidden="true" />
            <h4>Policy Boundary</h4>
          </div>
          <div className="context-source-card-grid">
            <SourceMetric title="Page policy" value={page.policy} />
            <SourceMetric
              title="RBAC"
              value={retrievalReceipt?.policy?.rbacDecision}
            />
            <SourceMetric
              title="Tenant scope"
              value={compactLabel(
                retrievalReceipt?.policy?.tenantScopeVerified,
              )}
            />
            <SourceMetric
              title="Policy notes"
              value={joinList(retrievalReceipt?.policy?.policyNotes)}
            />
          </div>
        </section>
      )}
    </section>
  );
};

const ContextPagePanel = ({ accountId }: ContextPagePanelProps) => {
  const [tenantId, setTenantId] = useState("main");
  const [taskIntent, setTaskIntent] = useState("");
  const [tokenBudget, setTokenBudget] = useState(
    String(DEFAULT_CONTEXT_TOKEN_BUDGET),
  );
  const [pageRefInput, setPageRefInput] = useState("");
  const [submittedPageRef, setSubmittedPageRef] = useState("");
  const [pointerRefsInput, setPointerRefsInput] = useState("");
  const [traverseFromScope, setTraverseFromScope] = useState("intent");
  const [traverseToScope, setTraverseToScope] = useState("app_generation");
  const [operationReason, setOperationReason] = useState("");
  const [localOperationError, setLocalOperationError] = useState("");
  const [latestResponse, setLatestResponse] = useState<
    ContextPageResponse | undefined
  >();

  const [compileContextPage, compileState] = useCompileContextPageMutation();
  const [hydrateContextPage, hydrateState] = useHydrateContextPageMutation();
  const [recompressContextPage, recompressState] =
    useRecompressContextPageMutation();
  const [traverseContextPage, traverseState] = useTraverseContextPageMutation();

  const lookupQuery = useGetContextPageQuery(submittedPageRef, {
    skip: !submittedPageRef,
  });

  const activeResponse = lookupQuery.data || latestResponse;
  const activePage = activeResponse?.contextPage;
  const activePageRef = activePage?.pageRef || submittedPageRef || "";
  const pointerRefs = useMemo(() => {
    const explicit = splitRefs(pointerRefsInput);
    if (explicit.length > 0) return explicit;
    return (activePage?.hydrationPointers || [])
      .map((pointer) => pointer.pointerRef)
      .filter(Boolean)
      .slice(0, 3);
  }, [activePage?.hydrationPointers, pointerRefsInput]);
  const retainedItemRefs = useMemo(
    () =>
      (activePage?.items || [])
        .filter((item) => item.retained !== false)
        .map((item) => item.itemRef)
        .filter(Boolean)
        .slice(0, 12),
    [activePage?.items],
  );

  const isWorking =
    compileState.isLoading ||
    hydrateState.isLoading ||
    recompressState.isLoading ||
    traverseState.isLoading ||
    lookupQuery.isFetching;
  const operationError =
    localOperationError ||
    getErrorText(
      compileState.error ||
        hydrateState.error ||
        recompressState.error ||
        traverseState.error ||
        lookupQuery.error,
    );
  const traceId = activePage?.traceId || `valoride-context-trace-${uuidv4()}`;
  const tokenBudgetValue = Number(tokenBudget) || DEFAULT_CONTEXT_TOKEN_BUDGET;

  const handleContextPageError = (error: unknown) => {
    setLocalOperationError(getErrorText(error));
  };

  const handleCompile = async () => {
    if (!taskIntent.trim()) return;
    setLocalOperationError("");
    try {
      const response = await compileContextPage({
        taskIntent: taskIntent.trim(),
        tenantId: tenantId.trim() || "main",
        traceId,
        tokenBudget: tokenBudgetValue,
        includeProcedures: true,
        includeRatings: true,
        filters: {
          accountId,
          sourceSurface: "valoride",
        },
      }).unwrap();
      setLatestResponse(response);
      setSubmittedPageRef("");
      setPageRefInput(response.contextPage?.pageRef || "");
    } catch (error) {
      handleContextPageError(error);
    }
  };

  const handleLookup = () => {
    const pageRef = pageRefInput.trim();
    if (!pageRef) return;
    setLocalOperationError("");
    setSubmittedPageRef(pageRef);
  };

  const handleHydrate = async () => {
    if (!activePageRef) return;
    setLocalOperationError("");
    try {
      const response = await hydrateContextPage({
        contextPageRef: activePageRef,
        pointerRefs,
        maxItems: pointerRefs.length || 3,
        traceId,
        reason:
          operationReason.trim() || "Hydrate source details for current task.",
      }).unwrap();
      setLatestResponse(response);
      setSubmittedPageRef("");
    } catch (error) {
      handleContextPageError(error);
    }
  };

  const handleRecompress = async () => {
    if (!activePageRef) return;
    setLocalOperationError("");
    try {
      const response = await recompressContextPage({
        contextPageRef: activePageRef,
        targetTokenBudget: tokenBudgetValue,
        retainedItemRefs,
        evictedItemRefs: [],
        traceId,
        reason:
          operationReason.trim() ||
          "Collapse hydrated details back into bounded operating context.",
      }).unwrap();
      setLatestResponse(response);
      setSubmittedPageRef("");
    } catch (error) {
      handleContextPageError(error);
    }
  };

  const handleTraverse = async () => {
    if (!activePageRef) return;
    setLocalOperationError("");
    try {
      const response = await traverseContextPage({
        contextPageRef: activePageRef,
        traversalType: ContextPageTraverseRequestTraversalTypeEnum.INTENTSHIFT,
        fromScope: traverseFromScope.trim() || undefined,
        toScope: traverseToScope.trim() || undefined,
        reason:
          operationReason.trim() || "Track task/context movement in ValorIDE.",
        traceId,
        metadata: {
          accountId,
          sourceSurface: "valoride",
        },
      }).unwrap();
      setLatestResponse(response);
      setSubmittedPageRef("");
    } catch (error) {
      handleContextPageError(error);
    }
  };

  const handleOpenHelp = () => {
    vscode.postMessage({
      type: "openInBrowser",
      url: CONTEXT_PAGE_HELP_URL,
    });
  };

  return (
    <div className="context-page-panel">
      <div className="context-page-header">
        <div>
          <h3>ContextPage</h3>
          <div className="context-page-subtitle">
            {accountId || "No account"}
          </div>
        </div>
        <div className="context-page-header-actions">
          <VSCodeButton appearance="secondary" onClick={handleOpenHelp}>
            <FaExternalLinkAlt />
            Help
          </VSCodeButton>
          <FaBrain aria-hidden="true" />
        </div>
      </div>

      <div className="context-page-grid">
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
          <span>Token budget</span>
          <VSCodeTextField
            value={tokenBudget}
            onInput={(event) =>
              setTokenBudget((event.target as HTMLInputElement).value)
            }
          />
        </label>
      </div>

      <label className="context-page-field">
        <span>Task intent</span>
        <VSCodeTextArea
          value={taskIntent}
          rows={4}
          onInput={(event) =>
            setTaskIntent((event.target as HTMLTextAreaElement).value)
          }
        />
      </label>

      <div className="context-page-actions">
        <VSCodeButton
          appearance="primary"
          disabled={!taskIntent.trim() || isWorking}
          onClick={handleCompile}
        >
          <FaBrain />
          Compile
        </VSCodeButton>
      </div>

      <VSCodeDivider />

      <div className="context-page-lookup">
        <VSCodeTextField
          value={pageRefInput}
          placeholder="contextPageRef"
          onInput={(event) =>
            setPageRefInput((event.target as HTMLInputElement).value)
          }
        />
        <VSCodeButton
          appearance="secondary"
          disabled={!pageRefInput.trim() || isWorking}
          onClick={handleLookup}
          title="Lookup ContextPage"
        >
          <FaSearch />
        </VSCodeButton>
      </div>

      <label className="context-page-field">
        <span>Pointer refs</span>
        <VSCodeTextArea
          value={pointerRefsInput}
          rows={3}
          onInput={(event) =>
            setPointerRefsInput((event.target as HTMLTextAreaElement).value)
          }
        />
      </label>

      <div className="context-page-grid">
        <label>
          <span>From</span>
          <VSCodeTextField
            value={traverseFromScope}
            onInput={(event) =>
              setTraverseFromScope((event.target as HTMLInputElement).value)
            }
          />
        </label>
        <label>
          <span>To</span>
          <VSCodeTextField
            value={traverseToScope}
            onInput={(event) =>
              setTraverseToScope((event.target as HTMLInputElement).value)
            }
          />
        </label>
      </div>

      <label className="context-page-field">
        <span>Reason</span>
        <VSCodeTextField
          value={operationReason}
          onInput={(event) =>
            setOperationReason((event.target as HTMLInputElement).value)
          }
        />
      </label>

      <div className="context-page-actions">
        <VSCodeButton
          appearance="secondary"
          disabled={!activePageRef || isWorking}
          onClick={handleHydrate}
        >
          <FaExpandAlt />
          Hydrate
        </VSCodeButton>
        <VSCodeButton
          appearance="secondary"
          disabled={!activePageRef || isWorking}
          onClick={handleRecompress}
        >
          <FaCompressAlt />
          Recompress
        </VSCodeButton>
        <VSCodeButton
          appearance="secondary"
          disabled={!activePageRef || isWorking}
          onClick={handleTraverse}
        >
          <FaProjectDiagram />
          Traverse
        </VSCodeButton>
      </div>

      {isWorking && <div className="context-page-alert">Working...</div>}
      {operationError && (
        <div className="context-page-alert error">{operationError}</div>
      )}

      <div className="context-page-summary">
        <div>
          <span>Page</span>
          <code>{activePage?.pageRef || "not compiled"}</code>
        </div>
        <div>
          <span>Trace</span>
          <code>{activePage?.traceId || "not compiled"}</code>
        </div>
        <div>
          <span>Status</span>
          <code>{activePage?.status || "none"}</code>
        </div>
        <div>
          <span>Tokens</span>
          <code>{activePage?.tokenEstimate ?? "unknown"}</code>
        </div>
        <div>
          <span>Items</span>
          <code>{activePage?.items?.length ?? 0}</code>
        </div>
        <div>
          <span>Pointers</span>
          <code>{activePage?.hydrationPointers?.length ?? 0}</code>
        </div>
      </div>

      {activePage?.compactSummary && (
        <div className="context-page-compact-summary">
          {activePage.compactSummary}
        </div>
      )}

      {activeResponse && (
        <ContextSourceDrilldown
          response={activeResponse}
          onSelectPointer={setPointerRefsInput}
        />
      )}

      {activeResponse && (
        <details className="context-page-json" open>
          <summary>Context evidence</summary>
          <pre>{prettyJson(activeResponse)}</pre>
        </details>
      )}
    </div>
  );
};

export default ContextPagePanel;
