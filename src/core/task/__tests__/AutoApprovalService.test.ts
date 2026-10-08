import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { AutoApprovalService } from "../AutoApprovalService";
import {
  AutoApprovalSettings,
  DEFAULT_AUTO_APPROVAL_SETTINGS,
} from "@shared/AutoApprovalSettings";

describe("path-aware auto-approval", () => {
  let root: string;
  const settings = (
    actions: Partial<AutoApprovalSettings["actions"]> = {},
  ): AutoApprovalSettings => ({
    ...DEFAULT_AUTO_APPROVAL_SETTINGS,
    enabled: true,
    actions: {
      ...DEFAULT_AUTO_APPROVAL_SETTINGS.actions,
      readFiles: true,
      editFiles: true,
      ...actions,
    },
  });
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "valoride-auto-approval-"));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("denies automatic approval when a workspace ignore rule blocks the path", () => {
    fs.writeFileSync(path.join(root, ".valorideignore"), "blocked.txt\n");
    const service = new AutoApprovalService(
      settings({ readFilesExternally: true }),
      root,
    );
    expect(
      service.shouldAutoApproveToolWithPath("read_file", "blocked.txt"),
    ).toBe(false);
  });

  it("approves an ordinary local read only when enabled", () => {
    expect(
      new AutoApprovalService(settings(), root).shouldAutoApproveToolWithPath(
        "read_file",
        "src/file.ts",
      ),
    ).toBe(true);
    expect(
      new AutoApprovalService(
        settings({ readFiles: false }),
        root,
      ).shouldAutoApproveToolWithPath("read_file", "src/file.ts"),
    ).toBe(false);
  });

  it("keeps external reads manual when external approval is disabled", () => {
    const service = new AutoApprovalService(settings(), root);
    expect(
      service.shouldAutoApproveToolWithPath(
        "read_file",
        path.join(root + "-sibling", "file.ts"),
      ),
    ).toBe(false);
    expect(
      service.shouldAutoApproveToolWithPath("read_file", "../outside.ts"),
    ).toBe(false);
  });

  it("preserves an explicit external-read policy decision without overriding dispatch", () => {
    const service = new AutoApprovalService(
      settings({ readFilesExternally: true }),
      root,
    );
    expect(
      service.shouldAutoApproveToolWithPath("read_file", "../outside.ts"),
    ).toBe(true);
    expect(
      service.shouldAutoApproveToolWithPath(
        "read_file",
        path.join(root + "-sibling", "file.ts"),
      ),
    ).toBe(true);
  });

  it("does not let an external toggle enable a disabled file permission", () => {
    const service = new AutoApprovalService(
      settings({ readFiles: false, readFilesExternally: true }),
      root,
    );
    expect(
      service.shouldAutoApproveToolWithPath("read_file", "../outside.ts"),
    ).toBe(false);
  });

  for (const tool of [
    "read_file",
    "write_to_file",
    "precision_search_and_replace",
  ] as const) {
    it(`${tool} rejects sibling-prefix paths and protected internal files`, () => {
      const service = new AutoApprovalService(settings(), root);
      expect(
        service.shouldAutoApproveToolWithPath(
          tool,
          path.join(root + "-sibling", "file.ts"),
        ),
      ).toBe(false);
      expect(service.shouldAutoApproveToolWithPath(tool, ".git/config")).toBe(
        false,
      );
      expect(
        service.shouldAutoApproveToolWithPath(
          tool,
          "node_modules/dependency/index.ts",
        ),
      ).toBe(false);
    });
  }

  it("requires the external edit flag separately from external read approval", () => {
    const service = new AutoApprovalService(
      settings({ readFilesExternally: true }),
      root,
    );
    expect(
      service.shouldAutoApproveToolWithPath("write_to_file", "../outside.ts"),
    ).toBe(false);
    expect(
      new AutoApprovalService(
        settings({ editFilesExternally: true }),
        root,
      ).shouldAutoApproveToolWithPath("write_to_file", "../outside.ts"),
    ).toBe(true);
  });

  it("fails closed for missing paths even when external permissions are enabled", () => {
    const service = new AutoApprovalService(
      settings({ readFilesExternally: true }),
      root,
    );
    expect(service.shouldAutoApproveToolWithPath("read_file", undefined)).toBe(
      false,
    );
    expect(service.shouldAutoApproveToolWithPath("read_file", "")).toBe(false);
  });

  it("re-reads changed ignore rules between decisions", () => {
    const service = new AutoApprovalService(settings(), root);
    expect(
      service.shouldAutoApproveToolWithPath("read_file", "private.txt"),
    ).toBe(true);
    fs.writeFileSync(path.join(root, ".valorideignore"), "private.txt\n");
    expect(
      service.shouldAutoApproveToolWithPath("read_file", "private.txt"),
    ).toBe(false);
    fs.unlinkSync(path.join(root, ".valorideignore"));
    expect(
      service.shouldAutoApproveToolWithPath("read_file", "private.txt"),
    ).toBe(true);
  });

  it("uses the Task caller's live decision and never grants access after revocation", () => {
    expect(
      AutoApprovalService.canAutoApprovePath(root, "src/file.ts", [
        true,
        false,
      ]),
    ).toBe(true);
    expect(
      AutoApprovalService.canAutoApprovePath(root, "src/file.ts", [
        false,
        false,
      ]),
    ).toBe(false);
  });

  it("retains the disabled global switch and precision-edit policy", () => {
    const policy = settings();
    const service = new AutoApprovalService(policy, root);
    expect(
      service.shouldAutoApproveToolWithPath(
        "precision_search_and_replace",
        "src/file.ts",
      ),
    ).toBe(true);
    policy.enabled = false;
    expect(
      service.shouldAutoApproveToolWithPath("read_file", "src/file.ts"),
    ).toBe(false);
    expect(
      service.shouldAutoApproveToolWithPath(
        "precision_search_and_replace",
        "src/file.ts",
      ),
    ).toBe(false);
  });
});
