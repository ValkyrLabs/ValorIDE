// src/services/psr/ast.ts
import { Project, SyntaxKind } from "ts-morph";

type AstEdit =
    | { kind: "ts-ast"; intent: "replacePropertyChain"; from: string; to: string }
    | { kind: "ts-ast"; intent: "insertOptionalChaining"; target: string }
    | { kind: "ts-ast"; intent: "renameProperty"; from: string; to: string };

export async function applyAstEdits(
    ctx: { text: string; skipped: Array<{ index: number; reason: string }>; warnings: string[] },
    edits: AstEdit[]
) {
    const proj = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true });
    const file = proj.createSourceFile("f.tsx", ctx.text, { overwrite: true });

    edits.forEach((e, i) => {
        switch (e.intent) {
            case "replacePropertyChain": {
                // Example: from "customer.name" to "(customer?.displayName ?? customer?.fullName ?? customer?.id ?? \"Unknown\")"
                file.forEachDescendant((node) => {
                    if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
                        const pae = node.asKind(SyntaxKind.PropertyAccessExpression)!;
                        const expr = pae.getExpression().getText();
                        const full = `${expr}.${pae.getName()}`;
                        if (full.endsWith(e.from)) {
                            pae.replaceWithText(e.to);
                        }
                    }
                });
                break;
            }
            case "insertOptionalChaining": {
                file.forEachDescendant((node) => {
                    if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
                        const pae = node.asKind(SyntaxKind.PropertyAccessExpression)!;
                        const exprText = pae.getExpression().getText();
                        const chain = `${exprText}.${pae.getName()}`;
                        if (chain.endsWith(e.target) && !pae.getText().includes("?."))
                            pae.replaceWithText(chain.replace(/\./g, "?."));
                    }
                });
                break;
            }
            case "renameProperty": {
                file.forEachDescendant((node) => {
                    if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
                        const pae = node.asKind(SyntaxKind.PropertyAccessExpression)!;
                        if (pae.getName() === e.from) pae.rename(e.to);
                    }
                });
                break;
            }
            default:
                ctx.warnings.push(`Unknown AST intent at index ${i}`);
        }
    });

    ctx.text = file.getFullText();
    return ctx;
}