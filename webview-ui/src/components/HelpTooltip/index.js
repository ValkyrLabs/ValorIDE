import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
/**
 * HelpTooltip Component
 *
 * A comprehensive tooltip system that provides contextual help throughout the ValkyrAI platform.
 * Designed with Tufte's principles: information-dense, minimal chrome, maximum clarity.
 *
 * Features:
 * - Quick summary text in tooltip
 * - Optional link to full documentation
 * - Keyboard accessible
 * - Consistent styling across LCARS/dashboard UX
 */
import { useState, useRef, useEffect } from "react";
import { Overlay, Popover } from "react-bootstrap";
import { FaQuestionCircle, FaExternalLinkAlt, FaBook } from "react-icons/fa";
import "./styles.css";
import { vscode } from "@thorapi/utils/vscode";
const DOCS_BASE = "https://valkyrlabs.com";
// ============================================================================
// DOCUMENTATION REGISTRY - Real URLs from Docusaurus docs
// ============================================================================
export const DOC_URLS = {
  // === WORKFLOW ENGINE ===
  "workflow-engine": {
    title: "Workflow Engine",
    summary:
      "Orchestrates multi-step automations with ExecModules, scheduling, and event triggers.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/workflow-engine-overview",
    category: "Workflows",
  },
  "workflow-builder": {
    title: "Workflow Builder",
    summary:
      "Visual drag-and-drop interface for designing workflows. Connect ExecModules to create automation pipelines.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/workflow-ui-builder",
    category: "Workflows",
  },
  "workflow-scheduling": {
    title: "Scheduling & Events",
    summary:
      "Configure CRON schedules and event triggers to automate workflow execution.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/scheduling-and-events",
    category: "Workflows",
  },
  "workflow-architecture": {
    title: "Workflow Architecture",
    summary:
      "Deep dive into workflow state management, task execution order, and parallel processing.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/workflow-architecture",
    category: "Workflows",
  },
  "workflow-design-ai": {
    title: "AI Workflow Designer",
    summary:
      "Describe workflows in natural language and let AI create them. Chat-based workflow creation with real-time canvas updates.",
    url: "https://valkyrlabs.com/v1/Products/ValkyrAI/workflow-engine/ai-workflow-designer",
    category: "Workflows",
  },
  // === EXEC MODULES ===
  "exec-modules": {
    title: "Execution Modules",
    summary:
      "Pluggable task units that perform specific actions: Email, REST, AWS, Social, Analytics, Payments.",
    url: "/docs/guides/execmodule-development",
    category: "ExecModules",
  },
  "email-module": {
    title: "Email Module",
    summary:
      "Send transactional emails via MailerSend or Mailtrap with automatic failover.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/Execution-Modules/email-module",
    category: "ExecModules",
  },
  "stripe-module": {
    title: "Stripe Module",
    summary:
      "Process payments, create checkout sessions, and manage subscriptions via Stripe.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/Execution-Modules/stripe-module",
    category: "ExecModules",
  },
  "social-modules": {
    title: "Social Media Modules",
    summary:
      "Post to Twitter/X, LinkedIn, Instagram, TikTok, and more from workflows.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/Execution-Modules/social-media-modules",
    category: "ExecModules",
  },
  "messaging-modules": {
    title: "Messaging Modules",
    summary:
      "Send SMS via Twilio, Slack messages, Discord posts, and Teams notifications.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/Execution-Modules/messaging-modules",
    category: "ExecModules",
  },
  "api-integration": {
    title: "API Integration Modules",
    summary:
      "Make REST/GraphQL calls, transform data, and integrate with external services.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/Execution-Modules/api-integration-modules",
    category: "ExecModules",
  },
  // === INTEGRATION ACCOUNTS ===
  "integration-accounts": {
    title: "Integration Accounts",
    summary:
      "Securely store API keys, OAuth tokens, and credentials for ExecModules. Encrypted at rest.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/integration-account-console",
    category: "Security",
  },
  "integration-twilio": {
    title: "Twilio Integration",
    summary:
      "Configure Twilio Account SID and Auth Token for SMS and WhatsApp messaging.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/Execution-Modules/messaging-modules",
    category: "Integrations",
  },
  "integration-stripe": {
    title: "Stripe Integration",
    summary:
      "Connect your Stripe account for payment processing and subscription management.",
    url: "/docs/Products/getting-started/payment-integration",
    category: "Integrations",
  },
  "integration-openai": {
    title: "OpenAI Integration",
    summary:
      "Configure OpenAI API keys for GPT-4, o1, and other LLM-powered features.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/llm-adapter",
    category: "Integrations",
  },
  // === LLM & AI ===
  "llm-adapter": {
    title: "LLM Adapter",
    summary:
      "Unified interface for OpenAI, Gemini, Claude, and local models. Automatic failover and rate limiting.",
    url: "/docs/Products/ValkyrAI/Workflow Engine/llm-adapter",
    category: "AI",
  },
  agents: {
    title: "AI Agents",
    summary:
      "Autonomous AI agents that execute workflows, respond to events, and coordinate in SWARM mode.",
    url: "/docs/Products/ValkyrAI/valkyrai-overview",
    category: "AI",
  },
  "agent-designer": {
    title: "Agent Designer",
    summary:
      "Visual interface for configuring agent capabilities, permissions, and workflow bindings.",
    url: "/docs/Products/ValkyrAI/valkyrai-overview",
    category: "AI",
  },
  "sage-chat": {
    title: "SageChat",
    summary:
      "Conversational AI interface for natural language interactions with your data and workflows.",
    url: "/docs/Products/ValkyrAI/command-processor",
    category: "AI",
  },
  // === SWARM ===
  swarm: {
    title: "S.W.A.R.M.",
    summary:
      "Multi-agent coordination system. Agents register, communicate, and collaborate on complex tasks.",
    url: "/docs/Products/ValorIDE/working-with-valoride",
    category: "SWARM",
  },
  "swarm-ops": {
    title: "SWARM Operations",
    summary:
      "Monitor active agents, view heartbeats, send commands, and coordinate distributed work.",
    url: "/docs/Products/ValorIDE/working-with-valoride",
    category: "SWARM",
  },
  valoride: {
    title: "ValorIDE",
    summary:
      "VS Code extension that connects as a SWARM agent for AI-assisted development.",
    url: "/docs/Products/ValorIDE/working-with-valoride",
    category: "SWARM",
  },
  // === MCP ===
  mcp: {
    title: "Model Context Protocol",
    summary:
      "Publish REST endpoints and workflows as discoverable MCP tools for AI assistants.",
    url: "/docs/Products/ValkyrAI/model-context-protocol",
    category: "MCP",
  },
  "mcp-publishing": {
    title: "MCP Publishing",
    summary:
      "Convert your APIs into MCP-compatible tools that Claude, GPT, and other AI can use.",
    url: "/docs/guides/mcp-publishing",
    category: "MCP",
  },
  "mcp-marketplace": {
    title: "MCP Marketplace",
    summary:
      "Browse, publish, and monetize MCP services. Connect AI capabilities to your workflows.",
    url: "/docs/guides/mcp-publishing",
    category: "MCP",
  },
  // === THORAPI ===
  thorapi: {
    title: "ThorAPI",
    summary:
      "Code generator that transforms OpenAPI specs into Spring Boot + TypeScript + JPA models.",
    url: "/docs/Products/ThorAPI/getting-started",
    category: "Development",
  },
  "openapi-studio": {
    title: "OpenAPI Studio",
    summary:
      "Visual editor for designing OpenAPI specifications with validation and code generation.",
    url: "/docs/Products/understanding-openapi",
    category: "Development",
  },
  "openapi-viz": {
    title: "API Visualizer",
    summary:
      "Interactive graph view of your API endpoints, models, and relationships.",
    url: "/docs/Products/understanding-openapi",
    category: "Development",
  },
  // === APPLICATIONS ===
  applications: {
    title: "Applications",
    summary:
      "Full-stack applications generated from OpenAPI specs. Includes backend, frontend, and database.",
    url: "/docs/Products/creating-first-project",
    category: "Applications",
  },
  "application-wizard": {
    title: "Application Wizard",
    summary:
      "Step-by-step guide to create new applications with bundle selection and configuration.",
    url: "/docs/Products/creating-first-project",
    category: "Applications",
  },
  deployment: {
    title: "Deployment",
    summary:
      "Deploy applications to AWS Fargate, EC2, or custom infrastructure with one click.",
    url: "/docs/Products/deployment-options",
    category: "Applications",
  },
  // === DATA & CONTENT ===
  "data-workbook": {
    title: "Data Workbook",
    summary:
      "Browse and edit any database table with auto-generated forms and tables.",
    url: "/docs/Products/ValkyrAI/dashboard-ops-center",
    category: "Data",
  },
  cms: {
    title: "Content Management",
    summary:
      "Create, edit, and organize content with templates and variable substitution.",
    url: "/docs/Products/ValkyrAI/dashboard-ops-center",
    category: "Data",
  },
  "file-manager": {
    title: "File Manager",
    summary:
      "Upload, organize, and manage files with S3 integration and CDN delivery.",
    url: "/docs/Products/ValkyrAI/dashboard-ops-center",
    category: "Data",
  },
  sheetster: {
    title: "Sheetster Spreadsheet",
    summary:
      "Enterprise spreadsheet engine powered by GridHeim/OpenXLS for complex calculations.",
    url: "/docs/Products/OpenXLS/gridheim-overview",
    category: "Data",
  },
  // === CRM ===
  crm: {
    title: "CRM",
    summary:
      "Customer relationship management with contacts, deals, and pipeline tracking.",
    url: "/docs/Products/ValkyrAI/dashboard-ops-center",
    category: "Business",
  },
  // === BILLING & PAYMENTS ===
  credits: {
    title: "Credits System",
    summary:
      "Purchase and manage credits for API calls, LLM usage, and premium features.",
    url: "/docs/Products/payment-integration",
    category: "Billing",
  },
  "digital-products": {
    title: "Digital Products",
    summary:
      "Sell and distribute digital goods with automatic delivery and license management.",
    url: "/docs/Products/ValkyrAI/digital-products-one-click",
    category: "Billing",
  },
  "billing-admin": {
    title: "Billing Administration",
    summary:
      "Admin console for credit packages, usage metering, creator payouts, and revenue analytics.",
    url: "/docs/Products/ValkyrAI/billing-admin",
    category: "Billing",
  },
  // === SECURITY ===
  "secure-field": {
    title: "SecureField Encryption",
    summary:
      "Field-level AES-256 encryption for sensitive data. Transparent encrypt/decrypt.",
    url: "/docs/Products/SecureField/secure-field-overview",
    category: "Security",
  },
  authentication: {
    title: "Authentication",
    summary:
      "JWT-based authentication with 2FA, OAuth2, and role-based access control.",
    url: "/docs/Products/adding-authentication",
    category: "Security",
  },
  rbac: {
    title: "Role-Based Access Control",
    summary:
      "Fine-grained permissions with roles like ADMIN, STAFF, USER, and custom roles.",
    url: "/docs/Products/adding-authentication",
    category: "Security",
  },
  // === STRATEGY ===
  "6d-dashboard": {
    title: "6D Strategic Dashboard",
    summary:
      "Six Disciplines methodology for strategic planning and goal alignment.",
    url: "/docs/Products/ValkyrAI/enhanced-6d-dashboard",
    category: "Strategy",
  },
  // === MONITORING ===
  "workflow-monitor": {
    title: "Workflow Monitor",
    summary:
      "Real-time WebSocket-based monitoring of workflow execution and task status.",
    url: "/docs/Products/ValkyrAI/WorkflowMonitor-WebSocketProtocol",
    category: "Monitoring",
  },
  actuator: {
    title: "System Health",
    summary:
      "Spring Boot Actuator endpoints for health checks, metrics, and environment info.",
    url: "/docs/Products/ValkyrAI/dashboard-ops-center",
    category: "Monitoring",
  },
  operations: {
    title: "Operations Dashboard",
    summary:
      "Charts and metrics for system performance, API usage, and error rates.",
    url: "/docs/Products/ValkyrAI/dashboard-ops-center",
    category: "Monitoring",
  },
  // === USERS ===
  users: {
    title: "User Management",
    summary:
      "Create, edit, and manage user accounts with roles and permissions.",
    url: "/docs/Products/adding-authentication",
    category: "Users",
  },
};
const resolveDocUrl = (url) => {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  let normalized = url;
  if (normalized.startsWith("/docs/")) {
    normalized = normalized.replace("/docs/", "/v1/");
  }
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  return `${DOCS_BASE}${normalized}`;
};
// ============================================================================
// HELP TOOLTIP COMPONENT
// ============================================================================
const HelpTooltip = ({
  topic,
  icon,
  size = "sm",
  placement = "auto",
  inline = true,
  label,
  className = "",
  showCategory = true,
  children,
}) => {
  const [show, setShow] = useState(false);
  const triggerRef = useRef(null);
  // Resolve the doc entry
  const docEntry = typeof topic === "string" ? DOC_URLS[topic] : topic;
  if (!docEntry) {
    console.warn(`HelpTooltip: Unknown topic "${topic}"`);
    return null;
  }
  const sizeClass = {
    sm: "help-tooltip-sm",
    md: "help-tooltip-md",
    lg: "help-tooltip-lg",
  }[size];
  const handleOpenDocs = (e) => {
    e.preventDefault();
    e.stopPropagation();
    vscode.postMessage({
      type: "openInBrowser",
      url: resolveDocUrl(docEntry.url),
    });
    setShow(false);
  };
  // Popover content with summary and link
  const popoverContent = (overlayProps) =>
    _jsxs(Popover, {
      id: `help-popover-${typeof topic === "string" ? topic : "custom"}`,
      className: "help-tooltip-popover",
      onMouseEnter: handleShow,
      onMouseLeave: scheduleHide,
      ...overlayProps,
      children: [
        _jsxs(Popover.Header, {
          as: "h6",
          className: "help-tooltip-header",
          children: [
            _jsx(FaBook, { className: "me-2" }),
            docEntry.title,
            showCategory &&
              _jsx("span", {
                className: "help-tooltip-category",
                children: docEntry.category,
              }),
          ],
        }),
        _jsxs(Popover.Body, {
          className: "help-tooltip-body",
          children: [
            _jsx("p", {
              className: "help-tooltip-summary",
              children: docEntry.summary,
            }),
            _jsxs("button", {
              type: "button",
              className: "help-tooltip-link btn btn-link btn-sm p-0",
              onClick: handleOpenDocs,
              children: [
                _jsx(FaExternalLinkAlt, { className: "me-1" }),
                "READ FULL DOCS",
              ],
            }),
          ],
        }),
      ],
    });
  // Visibility control with delayed hide
  const hideTimer = useRef(null);
  const hideDelayMs = 2000;
  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const handleShow = () => {
    clearHideTimer();
    setShow(true);
  };
  const scheduleHide = () => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setShow(false), hideDelayMs);
  };
  useEffect(() => () => clearHideTimer(), []);
  const overlay = _jsx(Overlay, {
    target: triggerRef.current,
    show: show,
    placement: placement,
    children: (props) => popoverContent(props),
  });
  const triggerHandlers = {
    onMouseEnter: handleShow,
    onMouseLeave: scheduleHide,
    onFocus: handleShow,
    onBlur: scheduleHide,
  };
  // If children provided, wrap them
  if (children) {
    return _jsxs(_Fragment, {
      children: [
        _jsx("span", {
          ref: triggerRef,
          className: `help-tooltip-wrapper ${className}`,
          ...triggerHandlers,
          children: children,
        }),
        overlay,
      ],
    });
  }
  // Default: show help icon
  const helpIcon = icon || _jsx(FaQuestionCircle, {});
  if (inline) {
    return _jsxs(_Fragment, {
      children: [
        _jsx("span", {
          ref: triggerRef,
          className: `help-tooltip-icon ${sizeClass} ${className}`,
          tabIndex: 0,
          role: "button",
          "aria-label": `Help: ${docEntry.title}`,
          ...triggerHandlers,
          children: helpIcon,
        }),
        overlay,
      ],
    });
  }
  // Block mode with label
  return _jsxs(_Fragment, {
    children: [
      _jsxs("span", {
        ref: triggerRef,
        className: `help-tooltip-block ${sizeClass} ${className}`,
        tabIndex: 0,
        role: "button",
        "aria-label": `Help: ${docEntry.title}`,
        ...triggerHandlers,
        children: [
          helpIcon,
          _jsx("span", {
            className: "help-tooltip-label",
            children: label || docEntry.title,
          }),
        ],
      }),
      overlay,
    ],
  });
};
export const SectionHelp = ({ title, topic, children, className = "" }) => {
  return _jsxs("div", {
    className: `section-help-header ${className}`,
    children: [
      _jsxs("h5", {
        className: "section-help-title",
        children: [
          title,
          _jsx(HelpTooltip, { topic: topic, size: "sm", className: "ms-2" }),
        ],
      }),
      children,
    ],
  });
};
export const QuickHelp = ({ topic, className = "" }) => {
  const docEntry = typeof topic === "string" ? DOC_URLS[topic] : topic;
  if (!docEntry) {
    return null;
  }
  return _jsx(HelpTooltip, {
    topic: topic,
    className: `quick-help-badge ${className}`,
    children: _jsxs("span", {
      className: "badge bg-secondary bg-opacity-25 text-muted",
      children: [
        _jsx(FaQuestionCircle, { className: "me-1" }),
        docEntry.category,
      ],
    }),
  });
};
export default HelpTooltip;
//# sourceMappingURL=index.js.map
