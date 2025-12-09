/**
 * ThorAPIModelRegistry — Auto-discovery of generated models and services
 *
 * Scans `/generated`, `/thor`, `/thorapi` directories to build:
 * - Model registry (name → fields → constraints → RBAC)
 * - Service registry (endpoint → model → CRUD operations)
 * - Dependency graph (which models depend on which)
 *
 * Registry is injected into prompts for schema-aware code generation.
 *
 * @see .valoride/memorybank/VALOR_PRD_2025.md § FR-5
 */
import * as path from "path";
import * as fs from "fs";
export class ThorAPIModelRegistry {
  logger;
  workspaceRoot;
  models = new Map();
  services = new Map();
  lastScanTime = 0;
  constructor(workspaceRoot, logger) {
    this.workspaceRoot = workspaceRoot;
    this.logger = logger;
  }
  /**
   * Scan for models and services
   */
  async scanRegistry() {
    this.logger.appendLine(
      "[ThorAPIModelRegistry] Scanning for models and services...",
    );
    const scanPaths = [
      path.join(this.workspaceRoot, "generated"),
      path.join(this.workspaceRoot, "webview-ui/src/thor"),
      path.join(this.workspaceRoot, "thorapi"),
    ];
    for (const scanPath of scanPaths) {
      if (fs.existsSync(scanPath)) {
        await this.scanDirectory(scanPath);
      }
    }
    this.lastScanTime = Date.now();
    this.logger.appendLine(
      `[ThorAPIModelRegistry] Scan complete: ${this.models.size} models, ${this.services.size} services`,
    );
  }
  /**
   * Recursively scan directory for model and service files
   */
  async scanDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (![".", "node_modules", "dist", "build", ".git"].includes(file)) {
            await this.scanDirectory(fullPath);
          }
        } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
          this.parseFile(fullPath);
        }
      }
    } catch (error) {
      this.logger.appendLine(`[ThorAPIModelRegistry] Scan error: ${error}`);
    }
  }
  /**
   * Parse TypeScript file for model definitions
   */
  parseFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const interfaceRegex = /export\s+interface\s+(\w+)\s*\{([^}]+)\}/g;
      let match;
      while ((match = interfaceRegex.exec(content)) !== null) {
        const modelName = match[1];
        const modelBody = match[2];
        if (modelBody.includes("id:")) {
          const model = {
            id: modelName.toLowerCase(),
            name: modelName,
            package: this.extractPackage(filePath),
            fields: this.parseFields(modelBody),
            constraints: this.parseConstraints(modelBody),
            rbac: this.parseRBAC(modelBody),
            tags: this.extractTags(modelName),
            source: filePath.includes("generated") ? "generated" : "custom",
          };
          this.models.set(model.id, model);
          this.logger.appendLine(
            `[ThorAPIModelRegistry] Found model: ${modelName} (${model.fields.length} fields)`,
          );
        }
      }
      const serviceRegex = /export\s+const\s+(\w+Service)\s*=/g;
      while ((match = serviceRegex.exec(content)) !== null) {
        const serviceName = match[1];
        const service = {
          id: serviceName.toLowerCase(),
          name: serviceName,
          endpoints: [],
          baseUrl: "",
        };
        this.services.set(service.id, service);
        this.logger.appendLine(
          `[ThorAPIModelRegistry] Found service: ${serviceName}`,
        );
      }
    } catch (error) {
      // Skip files that can't be parsed
    }
  }
  /**
   * Extract package/namespace from file path
   */
  extractPackage(filePath) {
    const parts = filePath.split(path.sep);
    const idx = parts.findIndex(
      (p) => p === "java" || p === "thor" || p === "generated",
    );
    return idx >= 0 ? parts.slice(idx).join(".") : "unknown";
  }
  /**
   * Parse fields from interface body
   */
  parseFields(body) {
    const fields = [];
    const fieldRegex = /(\w+)\s*\?*:\s*(\w+|\w+\[\])/g;
    let match;
    while ((match = fieldRegex.exec(body)) !== null) {
      const fieldName = match[1];
      const fieldType = match[2];
      const required = !body.substring(0, match.index).endsWith("?");
      fields.push({
        name: fieldName,
        type: fieldType,
        required,
      });
    }
    return fields;
  }
  /**
   * Parse constraints from JSDoc or annotations
   */
  parseConstraints(body) {
    const constraints = [];
    if (body.includes("@unique") || body.includes("@Unique")) {
      constraints.push({
        type: "unique",
        details: {},
      });
    }
    if (body.includes("@ForeignKey") || body.includes("foreign")) {
      constraints.push({
        type: "foreign-key",
        details: {},
      });
    }
    if (body.includes("enum") || body.includes("Enum")) {
      constraints.push({
        type: "enum",
        details: {},
      });
    }
    return constraints;
  }
  /**
   * Parse RBAC rules from annotations
   */
  parseRBAC(body) {
    const rules = [];
    rules.push({
      permission: "READ",
      roles: ["user", "admin", "guest"],
    });
    rules.push({
      permission: "CREATE",
      roles: ["admin"],
    });
    rules.push({
      permission: "UPDATE",
      roles: ["admin"],
    });
    rules.push({
      permission: "DELETE",
      roles: ["admin"],
    });
    return rules;
  }
  /**
   * Extract tags from model name
   */
  extractTags(modelName) {
    const tags = [];
    const words = modelName.match(/[A-Z]?[a-z]+/g) || [];
    tags.push(...words.map((w) => w.toLowerCase()));
    return tags;
  }
  /**
   * Get model by ID or name
   */
  getModel(id) {
    return this.models.get(id.toLowerCase());
  }
  /**
   * Get service by ID or name
   */
  getService(id) {
    return this.services.get(id.toLowerCase());
  }
  /**
   * Get all models
   */
  getAllModels() {
    return Array.from(this.models.values());
  }
  /**
   * Get all services
   */
  getAllServices() {
    return Array.from(this.services.values());
  }
  /**
   * Export registry as JSON
   */
  exportAsJSON() {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        models: Array.from(this.models.values()),
        services: Array.from(this.services.values()),
        metadata: {
          modelCount: this.models.size,
          serviceCount: this.services.size,
          lastScanTime: this.lastScanTime,
        },
      },
      null,
      2,
    );
  }
  /**
   * Generate markdown documentation from registry
   */
  exportAsMarkdown() {
    let md = "# ThorAPI Model Registry\n\n";
    md += `Generated: ${new Date().toISOString()}\n\n`;
    md += `## Models (${this.models.size})\n\n`;
    this.models.forEach((model) => {
      md += `### ${model.name}\n`;
      md += `- Package: ${model.package}\n`;
      md += `- Source: ${model.source}\n`;
      md += `- Fields: ${model.fields.map((f) => f.name).join(", ")}\n\n`;
    });
    md += `## Services (${this.services.size})\n\n`;
    this.services.forEach((service) => {
      md += `### ${service.name}\n`;
      md += `- Endpoints: ${service.endpoints.length}\n\n`;
    });
    return md;
  }
  /**
   * Log summary
   */
  logSummary() {
    this.logger.appendLine("[ThorAPIModelRegistry] Summary:");
    this.logger.appendLine(`  Models: ${this.models.size}`);
    this.logger.appendLine(`  Services: ${this.services.size}`);
    this.logger.appendLine(
      `  Last scan: ${new Date(this.lastScanTime).toISOString()}`,
    );
  }
}
let thorapiModelRegistry = null;
/**
 * Initialize global ThorAPIModelRegistry
 */
export function initializeThorAPIModelRegistry(workspaceRoot, logger) {
  thorapiModelRegistry = new ThorAPIModelRegistry(workspaceRoot, logger);
  thorapiModelRegistry.scanRegistry().catch((err) => {
    logger.appendLine(`[ThorAPIModelRegistry] Init error: ${err}`);
  });
  return thorapiModelRegistry;
}
/**
 * Get global ThorAPIModelRegistry
 */
export function getThorAPIModelRegistry() {
  if (!thorapiModelRegistry) {
    throw new Error("ThorAPIModelRegistry not initialized");
  }
  return thorapiModelRegistry;
}
//# sourceMappingURL=thorapiModelRegistry.js.map
