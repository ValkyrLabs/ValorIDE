// src/services/psr/ast.ts
import { Project, SyntaxKind } from "ts-morph";
export async function applyAstEdits(ctx, edits) {
    if (!edits.length)
        return ctx;
    const proj = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true });
    const file = proj.createSourceFile("f.tsx", ctx.text, { overwrite: true });
    for (const { edit, index } of edits) {
        let applied = false;
        let touched = false;
        switch (edit.intent) {
            case "replacePropertyChain": {
                file.forEachDescendant((node) => {
                    if (node.getKind() !== SyntaxKind.PropertyAccessExpression)
                        return;
                    const pae = node.asKind(SyntaxKind.PropertyAccessExpression);
                    const expr = pae.getExpression().getText();
                    const full = `${expr}.${pae.getName()}`;
                    if (full.endsWith(edit.from)) {
                        touched = true;
                        if (pae.getText() === edit.to) {
                            return;
                        }
                        pae.replaceWithText(edit.to);
                        applied = true;
                    }
                });
                if (applied) {
                    ctx.applied.add(index);
                }
                else {
                    ctx.skipped.push({ index, reason: touched ? "already_applied" : "ast_no_match" });
                }
                break;
            }
            case "insertOptionalChaining": {
                file.forEachDescendant((node) => {
                    if (node.getKind() !== SyntaxKind.PropertyAccessExpression)
                        return;
                    const pae = node.asKind(SyntaxKind.PropertyAccessExpression);
                    const exprText = pae.getExpression().getText();
                    const chain = `${exprText}.${pae.getName()}`;
                    if (!chain.endsWith(edit.target))
                        return;
                    touched = true;
                    if (pae.getText().includes("?.")) {
                        return;
                    }
                    const replacement = chain.replace(/\./g, "?.");
                    if (pae.getText() === replacement)
                        return;
                    pae.replaceWithText(replacement);
                    applied = true;
                });
                if (applied) {
                    ctx.applied.add(index);
                }
                else {
                    ctx.skipped.push({ index, reason: touched ? "already_applied" : "ast_no_chain_match" });
                }
                break;
            }
            case "renameProperty": {
                file.forEachDescendant((node) => {
                    if (node.getKind() !== SyntaxKind.PropertyAccessExpression)
                        return;
                    const pae = node.asKind(SyntaxKind.PropertyAccessExpression);
                    if (pae.getName() === edit.from) {
                        touched = true;
                        if (edit.from === edit.to) {
                            return;
                        }
                        pae.rename(edit.to);
                        applied = true;
                    }
                });
                if (applied) {
                    ctx.applied.add(index);
                }
                else {
                    ctx.skipped.push({ index, reason: touched ? "already_applied" : "ast_no_property_match" });
                }
                break;
            }
            default:
                ctx.warnings.push(`Unknown AST intent at index ${index}`);
                ctx.skipped.push({ index, reason: "ast_unknown_intent" });
        }
    }
    ctx.text = file.getFullText();
    return ctx;
}
//# sourceMappingURL=ast.js.map