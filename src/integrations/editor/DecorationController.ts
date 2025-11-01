import * as vscode from "vscode";

const fadedOverlayDecorationType = vscode.window.createTextEditorDecorationType(
  {
    backgroundColor: "rgba(255, 255, 0, 0.1)",
    opacity: "0.4",
    isWholeLine: true,
  },
);

// New frosted glass overlay for blocking user interaction during ValorIDE editing
const frostedGlassOverlayDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(100, 100, 100, 0.7)",
  opacity: "0.8",
  isWholeLine: true,
  after: {
    contentText: "",
    backgroundColor: "rgba(50, 50, 50, 0.9)",
    border: "2px solid rgba(100, 150, 255, 0.6)",
  },
  // Make the overlay more prominent and block-like
  outline: "1px solid rgba(100, 150, 255, 0.4)",
  outlineWidth: "1px",
  outlineStyle: "solid",
});

const activeLineDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 255, 0, 0.3)",
  opacity: "1",
  isWholeLine: true,
  border: "1px solid rgba(255, 255, 0, 0.5)",
});

type DecorationType = "fadedOverlay" | "activeLine" | "frostedGlassOverlay";

export class DecorationController {
  private decorationType: DecorationType;
  private editor: vscode.TextEditor;
  private ranges: vscode.Range[] = [];

  constructor(decorationType: DecorationType, editor: vscode.TextEditor) {
    this.decorationType = decorationType;
    this.editor = editor;
  }

  getDecoration() {
    switch (this.decorationType) {
      case "fadedOverlay":
        return fadedOverlayDecorationType;
      case "activeLine":
        return activeLineDecorationType;
      case "frostedGlassOverlay":
        return frostedGlassOverlayDecorationType;
    }
  }

  addLines(startIndex: number, numLines: number) {
    // Guard against invalid inputs
    if (startIndex < 0 || numLines <= 0) {
      return;
    }

    const lastRange = this.ranges[this.ranges.length - 1];
    if (lastRange && lastRange.end.line === startIndex - 1) {
      this.ranges[this.ranges.length - 1] = lastRange.with(
        undefined,
        lastRange.end.translate(numLines),
      );
    } else {
      const endLine = startIndex + numLines - 1;
      this.ranges.push(
        new vscode.Range(startIndex, 0, endLine, Number.MAX_SAFE_INTEGER),
      );
    }

    this.editor.setDecorations(this.getDecoration(), this.ranges);
  }

  clear() {
    this.ranges = [];
    this.editor.setDecorations(this.getDecoration(), this.ranges);
  }

  updateOverlayAfterLine(line: number, totalLines: number) {
    // Remove any existing ranges that start at or after the current line
    this.ranges = this.ranges.filter((range) => range.end.line < line);

    // Add a new range for all lines after the current line
    if (line < totalLines - 1) {
      this.ranges.push(
        new vscode.Range(
          new vscode.Position(line + 1, 0),
          new vscode.Position(totalLines - 1, Number.MAX_SAFE_INTEGER),
        ),
      );
    }

    // Apply the updated decorations
    this.editor.setDecorations(this.getDecoration(), this.ranges);
  }

  setActiveLine(line: number) {
    this.ranges = [new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER)];
    this.editor.setDecorations(this.getDecoration(), this.ranges);
  }

  /**
   * Apply frosted glass overlay to the entire document
   * This creates a visual overlay that discourages user interaction during ValorIDE editing
   */
  applyFullDocumentOverlay() {
    if (this.decorationType !== "frostedGlassOverlay") {
      return;
    }
    
    const totalLines = this.editor.document.lineCount;
    if (totalLines > 0) {
      this.ranges = [
        new vscode.Range(
          new vscode.Position(0, 0),
          new vscode.Position(totalLines - 1, Number.MAX_SAFE_INTEGER),
        ),
      ];
      this.editor.setDecorations(this.getDecoration(), this.ranges);
    }
  }
}
