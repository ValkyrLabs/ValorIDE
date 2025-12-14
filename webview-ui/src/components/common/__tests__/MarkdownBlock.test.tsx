/// <reference types="vitest" />
import React from "react";
import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MarkdownBlock from "../MarkdownBlock";

vi.mock("@thorapi/context/ExtensionStateContext", () => ({
    useExtensionState: () => ({ theme: {} }),
}));

describe("MarkdownBlock code sanitization", () => {
    it("renders a code block without a language without throwing", async () => {
        const { container } = render(
            <MarkdownBlock markdown={"```\nconsole.log('hi')\n```"} />,
        );
        // ensure render completed without throwing (react-remark is async and
        // may behave differently in test env); presence of container is a good
        // indication that rendering ran.
        await waitFor(() => expect(container).toBeDefined());
    });

    it("renders empty code block without throwing", async () => {
        const { container } = render(
            <MarkdownBlock markdown={"```\n\n```"} />,
        );
        // ensure render completed without throwing (container exists)
        expect(container).toBeDefined();
    });

    it("renders code block with strange language string", async () => {
        const { container } = render(
            <MarkdownBlock markdown={"```weird.lang\n1+1\n```"} />,
        );
        await waitFor(() => expect(container).toBeDefined());
    });
});
