import {
  RemoteTaskTemplateId,
  RemoteTaskTemplatePayload,
} from "./RemoteTaskTemplates";

export interface RemoteTaskPreset {
  id: string;
  name: string;
  scope: "org" | "team";
  scopeId: string;
  templateId: RemoteTaskTemplateId;
  payload: RemoteTaskTemplatePayload;
  createdAt: number;
  updatedAt: number;
}

export interface SaveRemoteTaskPresetInput {
  id: string;
  name: string;
  scope: "org" | "team";
  scopeId: string;
  templateId: RemoteTaskTemplateId;
  payload: RemoteTaskTemplatePayload;
  now?: number;
}

export class RemoteTaskPresetRegistry {
  private presets = new Map<string, RemoteTaskPreset>();

  save(input: SaveRemoteTaskPresetInput): RemoteTaskPreset {
    const now = input.now ?? Date.now();
    const existing = this.presets.get(input.id);

    const next: RemoteTaskPreset = {
      id: input.id,
      name: input.name,
      scope: input.scope,
      scopeId: input.scopeId,
      templateId: input.templateId,
      payload: { ...input.payload },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.presets.set(next.id, next);
    return this.snapshot(next);
  }

  list(scope?: { scope: "org" | "team"; scopeId: string }): RemoteTaskPreset[] {
    return Array.from(this.presets.values())
      .filter((preset) => {
        if (!scope) {
          return true;
        }
        return preset.scope === scope.scope && preset.scopeId === scope.scopeId;
      })
      .map((preset) => this.snapshot(preset));
  }

  get(id: string): RemoteTaskPreset | undefined {
    const preset = this.presets.get(id);
    if (!preset) {
      return undefined;
    }
    return this.snapshot(preset);
  }

  private snapshot(preset: RemoteTaskPreset): RemoteTaskPreset {
    return { ...preset, payload: { ...preset.payload } };
  }
}
