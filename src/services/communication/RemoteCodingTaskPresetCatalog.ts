export type RemoteTaskTemplateId = "bugfix" | "refactor" | "docs" | "data-patch";

export interface RemoteTaskTemplateParam {
  key: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
}

export interface RemoteTaskTemplate {
  id: RemoteTaskTemplateId;
  title: string;
  summary: string;
  taskTemplate: string;
  params: RemoteTaskTemplateParam[];
}

export type RemotePresetScope = "org" | "team";

export interface SavedRemoteTaskPreset {
  id: string;
  name: string;
  scope: RemotePresetScope;
  ownerId: string;
  templateId: RemoteTaskTemplateId;
  params: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface SaveRemoteTaskPresetInput {
  id: string;
  name: string;
  scope: RemotePresetScope;
  ownerId: string;
  templateId: RemoteTaskTemplateId;
  params?: Record<string, string>;
  now?: number;
}

const DEFAULT_TEMPLATES: RemoteTaskTemplate[] = [
  {
    id: "bugfix",
    title: "Bugfix",
    summary: "Reproduce, fix, and test a defect",
    taskTemplate:
      "Fix bug in {{area}}. Repro: {{repro}}. Add regression tests and summarize risk in {{riskSurface}}.",
    params: [
      { key: "area", label: "Affected area", required: true },
      { key: "repro", label: "Reproduction steps", required: true },
      { key: "riskSurface", label: "Risk surface", defaultValue: "release notes" },
    ],
  },
  {
    id: "refactor",
    title: "Refactor",
    summary: "Improve code structure without behavior changes",
    taskTemplate:
      "Refactor {{area}} to improve {{goal}} while keeping behavior identical. Add/adjust tests for changed seams.",
    params: [
      { key: "area", label: "Scope", required: true },
      { key: "goal", label: "Refactor goal", required: true },
    ],
  },
  {
    id: "docs",
    title: "Docs",
    summary: "Produce concise documentation updates",
    taskTemplate:
      "Update documentation for {{area}} focused on {{audience}}. Include quickstart and known caveats.",
    params: [
      { key: "area", label: "Document area", required: true },
      { key: "audience", label: "Audience", defaultValue: "operators" },
    ],
  },
  {
    id: "data-patch",
    title: "Data patch",
    summary: "Prepare and validate a data backfill/repair",
    taskTemplate:
      "Create data patch for {{dataset}} with change {{change}}. Add dry-run verification and rollback plan.",
    params: [
      { key: "dataset", label: "Dataset", required: true },
      { key: "change", label: "Patch change", required: true },
    ],
  },
];

export class RemoteCodingTaskPresetCatalog {
  private readonly templates = new Map<RemoteTaskTemplateId, RemoteTaskTemplate>();

  private readonly savedPresets = new Map<string, SavedRemoteTaskPreset>();

  constructor(templates: RemoteTaskTemplate[] = DEFAULT_TEMPLATES) {
    for (const template of templates) {
      this.templates.set(template.id, template);
    }
  }

  listTemplates(): RemoteTaskTemplate[] {
    return Array.from(this.templates.values()).map((template) => ({ ...template, params: [...template.params] }));
  }

  savePreset(input: SaveRemoteTaskPresetInput): SavedRemoteTaskPreset {
    const template = this.requireTemplate(input.templateId);
    const now = input.now ?? Date.now();
    const params = this.normalizeParams(template, input.params ?? {});

    const existing = this.savedPresets.get(input.id);
    const createdAt = existing?.createdAt ?? now;

    const preset: SavedRemoteTaskPreset = {
      id: input.id,
      name: input.name,
      scope: input.scope,
      ownerId: input.ownerId,
      templateId: input.templateId,
      params,
      createdAt,
      updatedAt: now,
    };

    this.savedPresets.set(input.id, preset);
    return { ...preset, params: { ...preset.params } };
  }

  listSavedPresets(scope?: RemotePresetScope, ownerId?: string): SavedRemoteTaskPreset[] {
    return Array.from(this.savedPresets.values())
      .filter((preset) => (scope ? preset.scope === scope : true))
      .filter((preset) => (ownerId ? preset.ownerId === ownerId : true))
      .map((preset) => ({ ...preset, params: { ...preset.params } }));
  }

  renderTask(templateId: RemoteTaskTemplateId, params: Record<string, string>): string {
    const template = this.requireTemplate(templateId);
    const normalizedParams = this.normalizeParams(template, params);
    return template.taskTemplate.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, (_match, key: string) => normalizedParams[key] ?? "").trim();
  }

  renderTaskFromPreset(presetId: string): string {
    const preset = this.savedPresets.get(presetId);
    if (!preset) {
      throw new Error(`Unknown remote preset: ${presetId}`);
    }
    return this.renderTask(preset.templateId, preset.params);
  }

  private requireTemplate(templateId: RemoteTaskTemplateId): RemoteTaskTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Unknown remote task template: ${templateId}`);
    }
    return template;
  }

  private normalizeParams(template: RemoteTaskTemplate, params: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const definition of template.params) {
      const provided = params[definition.key];
      const value = provided?.trim() || definition.defaultValue || "";
      if (definition.required && value.length === 0) {
        throw new Error(`Missing required template param: ${definition.key}`);
      }
      normalized[definition.key] = value;
    }
    return normalized;
  }
}
