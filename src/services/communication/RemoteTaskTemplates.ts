export type RemoteTaskTemplateId =
  | "bugfix"
  | "refactor"
  | "docs"
  | "data-patch";

export interface RemoteTaskTemplateField {
  key: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
}

export interface RemoteTaskTemplate {
  id: RemoteTaskTemplateId;
  name: string;
  summary: string;
  fields: RemoteTaskTemplateField[];
  prompt: string;
}

export interface RemoteTaskTemplatePayload {
  [key: string]: string | undefined;
}

export interface RemoteTaskExecutionSummary {
  templateId: RemoteTaskTemplateId;
  title: string;
  prompt: string;
  outputLinks: string[];
}

const CATALOG: RemoteTaskTemplate[] = [
  {
    id: "bugfix",
    name: "Bugfix",
    summary: "Investigate a failing behavior and implement a tested fix.",
    fields: [
      { key: "issue", label: "Issue", required: true },
      { key: "target", label: "Target module", required: true },
      {
        key: "constraints",
        label: "Constraints",
        defaultValue: "Keep scope minimal.",
      },
    ],
    prompt: "Fix issue {{issue}} in {{target}}. Constraints: {{constraints}}",
  },
  {
    id: "refactor",
    name: "Refactor",
    summary: "Improve internal design while preserving behavior.",
    fields: [
      { key: "target", label: "Target module", required: true },
      { key: "goal", label: "Refactor goal", required: true },
    ],
    prompt: "Refactor {{target}} to improve {{goal}} without behavior changes.",
  },
  {
    id: "docs",
    name: "Docs",
    summary: "Improve or add documentation with examples.",
    fields: [
      { key: "topic", label: "Topic", required: true },
      { key: "audience", label: "Audience", defaultValue: "engineers" },
    ],
    prompt:
      "Write documentation for {{topic}} for {{audience}}, including practical examples.",
  },
  {
    id: "data-patch",
    name: "Data Patch",
    summary: "Apply a deterministic data correction with rollback notes.",
    fields: [
      { key: "dataset", label: "Dataset", required: true },
      { key: "change", label: "Requested change", required: true },
    ],
    prompt:
      "Create a safe data patch for {{dataset}} that performs: {{change}}. Include rollback steps.",
  },
];

export class RemoteTaskTemplateCatalog {
  list(): RemoteTaskTemplate[] {
    return CATALOG.map((template) => ({
      ...template,
      fields: [...template.fields],
    }));
  }

  get(templateId: RemoteTaskTemplateId): RemoteTaskTemplate {
    const template = CATALOG.find((entry) => entry.id === templateId);
    if (!template) {
      throw new Error(`Unknown template: ${templateId}`);
    }
    return { ...template, fields: [...template.fields] };
  }

  renderPrompt(
    templateId: RemoteTaskTemplateId,
    payload: RemoteTaskTemplatePayload,
  ): string {
    const template = this.get(templateId);

    for (const field of template.fields) {
      const value = payload[field.key] ?? field.defaultValue;
      if (field.required && !value?.trim()) {
        throw new Error(`Missing required field: ${field.key}`);
      }
    }

    return template.prompt
      .replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, (_match, key: string) => {
        const value =
          payload[key] ??
          template.fields.find((field) => field.key === key)?.defaultValue;
        return value?.trim() ?? "";
      })
      .trim();
  }

  buildExecutionSummary(
    templateId: RemoteTaskTemplateId,
    payload: RemoteTaskTemplatePayload,
    outputLinks: string[],
  ): RemoteTaskExecutionSummary {
    const template = this.get(templateId);
    return {
      templateId,
      title: template.name,
      prompt: this.renderPrompt(templateId, payload),
      outputLinks,
    };
  }
}
