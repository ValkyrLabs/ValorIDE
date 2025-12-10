import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CompletionSummaryCard } from "./ChatRow";

describe("CompletionSummaryCard", () => {
    it("strips the leading '# Task: ' heading from summary markdown", () => {
        const markdown = `# Task: Implement feature X\n\n## Result\nThe feature was implemented.`;
        render(<CompletionSummaryCard markdown={markdown} title={"Implement feature X"} /> as any);
        // The first heading should be removed from the body markdown
        expect(screen.queryByText("# Task: Implement feature X")).not.toBeInTheDocument();
        // The result content should still be rendered
        expect(screen.getByText("The feature was implemented.")).toBeInTheDocument();
    });
});
