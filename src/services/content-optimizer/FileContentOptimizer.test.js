import { describe, it } from "mocha";
import "should";
import { FileContentOptimizer } from "./FileContentOptimizer";
describe("FileContentOptimizer", () => {
    describe("optimizeFileContent", () => {
        it("should return content as-is for small files", async () => {
            const content = "Small file content";
            const result = await FileContentOptimizer.optimizeFileContent("test.js", content);
            result.should.equal(content);
        });
        it("should truncate large content intelligently", async () => {
            const longContent = "A".repeat(15000);
            const result = await FileContentOptimizer.optimizeFileContent("test.txt", longContent, {
                maxContentLength: 1000
            });
            result.length.should.be.lessThan(1100);
            result.should.containEql("[Content truncated...]");
        });
        it("should extract relevant content for large source files", async () => {
            const largeSourceContent = `
import React from 'react';

function Component1() {
  return <div>Component 1</div>;
}

function Component2() {
  return <div>Component 2</div>;
}

export { Component1, Component2 };
      `.repeat(100); // Make it large
            const result = await FileContentOptimizer.optimizeFileContent("test.tsx", largeSourceContent, {
                maxFileSize: 1000,
                extractOnlyRelevant: true
            });
            result.should.containEql("[File is large - showing relevant portions only]");
        });
    });
    describe("shouldOptimizeFile", () => {
        it("should return false for non-existent files", async () => {
            const result = await FileContentOptimizer.shouldOptimizeFile("non-existent.txt");
            result.should.be.false();
        });
    });
    describe("getFileSummary", () => {
        it("should return error message for non-existent files", async () => {
            const result = await FileContentOptimizer.getFileSummary("non-existent.txt");
            result.should.containEql("Error reading file");
        });
    });
    describe("truncateIntelligently", () => {
        it("should find logical truncate points", () => {
            const content = `
function test1() {
  console.log("test1");
}

function test2() {
  console.log("test2");
}

function test3() {
  console.log("test3");
}
      `;
            // Access private method through any cast for testing
            const result = FileContentOptimizer.truncateIntelligently(content, { maxContentLength: 80 });
            result.should.containEql("[Content truncated...]");
            // Should truncate at a logical boundary (end of function)
            result.should.not.containEql("function test3");
        });
    });
    describe("findLogicalTruncatePoint", () => {
        it("should find end of code block as truncate point", () => {
            const content = `
function test() {
  if (true) {
    console.log("test");
  }
}

function another() {
  console.log("another");
}
      `;
            // Access private method for testing
            const result = FileContentOptimizer.findLogicalTruncatePoint(content, 60);
            // Should find a point after the first function's closing brace
            const truncatedContent = content.substring(0, result);
            truncatedContent.should.containEql("function test()");
            truncatedContent.should.not.containEql("function another()");
        });
        it("should handle paragraph breaks", () => {
            const content = `
First paragraph with some content.

Second paragraph with more content.

Third paragraph.
      `;
            const result = FileContentOptimizer.findLogicalTruncatePoint(content, 50);
            // Should find a paragraph break
            const truncatedContent = content.substring(0, result);
            truncatedContent.should.containEql("First paragraph");
        });
    });
    describe("extractByPatterns", () => {
        it("should extract lines matching error patterns", () => {
            const content = `
Normal line 1
ERROR: Something went wrong
Normal line 2
TODO: Fix this later
Normal line 3
function testFunction() {
  return true;
}
Normal line 4
      `;
            // Access private method for testing
            const result = FileContentOptimizer.extractByPatterns(content, {});
            result.should.containEql("[File is large - showing relevant portions only]");
            result.should.containEql("ERROR: Something went wrong");
            result.should.containEql("TODO: Fix this later");
            result.should.containEql("function testFunction()");
        });
        it("should include line numbers when requested", () => {
            const content = `
Line 1
ERROR: Test error
Line 3
      `;
            const result = FileContentOptimizer.extractByPatterns(content, { includeLineNumbers: true });
            result.should.match(/\d+: ERROR: Test error/);
        });
    });
    describe("summarizeRepetitiveOutput", () => {
        it("should summarize repeated lines", () => {
            const content = `
Different line
Same line
Same line
Same line
Another different line
      `;
            // Access private method for testing
            const result = FileContentOptimizer.summarizeRepetitiveOutput(content);
            result.should.containEql("Different line");
            result.should.containEql("Same line");
            result.should.containEql("[Previous line repeated 2 times]");
            result.should.containEql("Another different line");
        });
        it("should handle empty lines correctly", () => {
            const content = `
Line 1

Line 2
Line 2

Line 3
      `;
            const result = FileContentOptimizer.summarizeRepetitiveOutput(content);
            result.should.containEql("Line 1");
            result.should.containEql("Line 2");
            result.should.containEql("[Previous line repeated 1 times]");
            result.should.containEql("Line 3");
        });
    });
    describe("isSourceCodeFile", () => {
        it("should identify source code files correctly", () => {
            const isSourceCode = FileContentOptimizer.isSourceCodeFile;
            isSourceCode('.js').should.be.true();
            isSourceCode('.ts').should.be.true();
            isSourceCode('.tsx').should.be.true();
            isSourceCode('.py').should.be.true();
            isSourceCode('.java').should.be.true();
            isSourceCode('.cpp').should.be.true();
            isSourceCode('.txt').should.be.false();
            isSourceCode('.md').should.be.false();
            isSourceCode('.json').should.be.false();
        });
    });
});
//# sourceMappingURL=FileContentOptimizer.test.js.map