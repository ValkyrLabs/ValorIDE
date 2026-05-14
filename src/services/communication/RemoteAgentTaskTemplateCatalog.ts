export type RemoteAgentTaskTemplateId = "bugfix" | "refactor" | "docs" | "data-patch";

export interface RemoteAgentTaskTemplateField {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}

export interface RemoteAgentTaskTemplate {
  id: RemoteAgentTaskTemplateId;
  label: string;
  description: string;
  promptTemplate: string;
  fields: RemoteAgentTaskTemplateField[];
}

export type RemoteAgentTaskTemplateInput = Record<string, string | number | boolean | null | undefined>;

const CATALOG: RemoteAgentTaskTemplate[] = [
  {
    id: "bugfix",
    label: "Bugfix",
    description: "Investigate and fix a production or test failure with minimal risk.",
    promptTemplate:
      "Fix bug in {{area}}. Symptoms: {{symptoms}}. Repro: {{repro}}. Deliver: root-cause summary, code fix, and regression tests.",
    fields: [
      { key: "area", label: "Area", required: true, placeholder: "auth/login" },
      { key: "symptoms", label: "Symptoms", required: true },
      { key: "repro", label: "Reproduction steps", required: true },
    ],
  },
  {
    id: "refactor",
    label: "Refactor",
    description: "Improve maintainability while preserving behavior and adding safety checks.",
    promptTemplate:
      "Refactor {{area}} for {{goal}}. Constraints: no behavior changes, keep interfaces stable, add/update tests.",
    fields: [
      { key: "area", label: "Area", required: true },
      { key: "goal", label: "Refactor goal", required: true, placeholder: "readability/perf/modularity" },
    ],
  },
  {
    id: "docs",
    label: "Documentation",
    description: "Draft or improve docs with actionable examples.",
    promptTemplate:
      "Update docs for {{topic}} targeted to {{audience}}. Include quickstart, pitfalls, and validation steps.",
    fields: [
      { key: "topic", label: "Topic", required: true },
      { key: "audience", label: "Audience", required: true, placeholder: "new contributors" },
    ],
  },
  {
    id: "data-patch",
    label: "Data patch",
    description: "Apply a safe data correction with validation and rollback plan.",
    promptTemplate:
      "Prepare data patch for {{dataset}} to correct {{problem}}. Include dry-run verification and rollback notes.",
    fields: [
      { key: "dataset", label: "Dataset/table", required: true },
      { key: "problem", label: "Problem summary", required: true },
    ],
  },
];

export class RemoteAgentTaskTemplateCatalog {
  list(): RemoteAgentTaskTemplate[] {
    return CATALOG.map((template) => ({ ...template, fields: template.fields.map((field) => ({ ...field })) }));
  }

  buildTask(templateId: RemoteAgentTaskTemplateId, input: RemoteAgentTaskTemplateInput): string {
    const template = CATALOG.find((item) => item.id === templateId);
    if (!template) {
      throw new Error(`Unknown remote agent task template: ${templateId}`);
    }

    for (const field of template.fields) {
      if (!field.required) {
        continue;
      }
      const value = input[field.key];
      if (value === undefined || value === null || String(value).trim() === "") {
        throw new Error(`Missing required field for ${templateId}: ${field.key}`);
      }
    }

    return template.promptTemplate.replace(/{{\s*([\w-]+)\s*}}/g, (_, key: string) => {
      const value = input[key];
      return value === undefined || value === null ? "" : String(value).trim();
    });
  }
}
