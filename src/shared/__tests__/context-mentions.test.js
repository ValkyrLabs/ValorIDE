import { expect } from "chai";
import { mentionRegex, mentionRegexGlobal } from "../context-mentions";
function testMention(input, expected) {
  const match = mentionRegex.exec(input);
  return {
    actual: match ? match[0] : null,
    expected,
  };
}
function assertMatch(result) {
  expect(result.actual).eq(result.expected);
  return true;
}
describe("Mention Regex", () => {
  describe("Windows Path Support", () => {
    it("matches simple Windows paths", () => {
      const cases = [
        ["@thorapi/C:\\folder\\file.txt", "@thorapi/C:\\folder\\file.txt"],
        ["@thorapi/C:\\file.txt", "@thorapi/C:\\file.txt"],
      ];
      cases.forEach(([input, expected]) => {
        const result = testMention(input, expected);
        assertMatch(result);
      });
    });
  });
  describe("Edge Cases", () => {
    it("handles edge cases correctly", () => {
      const cases = [
        [
          "@thorapi/C:\\Users\\name\\path\\to\\文件夹\\file.txt",
          "@thorapi/C:\\Users\\name\\path\\to\\文件夹\\file.txt",
        ],
        [
          "@thorapi/path123/file-name_2.0.txt",
          "@thorapi/path123/file-name_2.0.txt",
        ],
      ];
      cases.forEach(([input, expected]) => {
        const result = testMention(input, expected);
        assertMatch(result);
      });
    });
  });
  describe("Existing Functionality", () => {
    it("matches Unix paths", () => {
      const cases = [
        ["@thorapi/usr/local/bin/file", "@thorapi/usr/local/bin/file"],
        ["@thorapi/path/to/file.txt", "@thorapi/path/to/file.txt"],
        ["@thorapi//etc/host", "@thorapi//etc/host"],
      ];
      cases.forEach(([input, expected]) => {
        const result = testMention(input, expected);
        assertMatch(result);
      });
    });
    it("matches URLs", () => {
      const cases = [
        ["@http://example.com", "@http://example.com"],
        [
          "@https://example.com/path/to/file.html",
          "@https://example.com/path/to/file.html",
        ],
        [
          "@ftp://server.example.com/file.zip",
          "@ftp://server.example.com/file.zip",
        ],
      ];
      cases.forEach(([input, expected]) => {
        const result = testMention(input, expected);
        assertMatch(result);
      });
    });
    it("matches git hashes", () => {
      const cases = [
        [
          "@abcdef1234567890abcdef1234567890abcdef12",
          "@abcdef1234567890abcdef1234567890abcdef12",
        ],
      ];
      cases.forEach(([input, expected]) => {
        const result = testMention(input, expected);
        assertMatch(result);
      });
    });
    it("matches special keywords", () => {
      const cases = [
        ["@problems", "@problems"],
        ["@git-changes", "@git-changes"],
        ["@terminal", "@terminal"],
      ];
      cases.forEach(([input, expected]) => {
        const result = testMention(input, expected);
        assertMatch(result);
      });
    });
  });
  describe("Invalid Patterns", () => {
    it("rejects invalid patterns", () => {
      const cases = [
        ["C:\\folder\\file.txt", null],
        ["@", null],
        ["@ C:\\file.txt", null],
      ];
      cases.forEach(([input, expected]) => {
        const result = testMention(input, expected);
        assertMatch(result);
      });
    });
    it("matches only until invalid characters", () => {
      const result = testMention(
        "@thorapi/C:\\folder\\file.txt invalid suffix",
        "@thorapi/C:\\folder\\file.txt"
      );
      assertMatch(result);
    });
  });
  describe("In Context", () => {
    it("matches mentions within text", () => {
      const cases = [
        [
          "Check the file at @thorapi/C:\\folder\\file.txt for details.",
          "@thorapi/C:\\folder\\file.txt",
        ],
        ["Review @problems and @git-changes.", "@problems"],
        [
          "Multiple: @thorapi/file1.txt and @thorapi/C:\\file2.txt and @terminal",
          "@thorapi/file1.txt",
        ],
      ];
      cases.forEach(([input, expected]) => {
        const result = testMention(input, expected);
        assertMatch(result);
      });
    });
  });
  describe("Multiple Mentions", () => {
    it("finds all mentions in a string using global regex", () => {
      const text =
        "Check @thorapi/path/file1.txt and @thorapi/C:\\folder\\file2.txt and report any @problems to @git-changes";
      const matches = text.match(mentionRegexGlobal);
      expect(matches).deep.eq([
        "@thorapi/path/file1.txt",
        "@thorapi/C:\\folder\\file2.txt",
        "@problems",
        "@git-changes",
      ]);
    });
  });
  describe("Special Characters in Paths", () => {
    it("handles special characters in file paths", () => {
      const cases = [
        [
          "@thorapi/path/with-dash/file_underscore.txt",
          "@thorapi/path/with-dash/file_underscore.txt",
        ],
        [
          "@thorapi/C:\\folder+plus\\file(parens)[]brackets.txt",
          "@thorapi/C:\\folder+plus\\file(parens)[]brackets.txt",
        ],
        [
          "@thorapi/path/with/file#hash%percent.txt",
          "@thorapi/path/with/file#hash%percent.txt",
        ],
        [
          "@thorapi/path/with/file@symbol$dollar.txt",
          "@thorapi/path/with/file@symbol$dollar.txt",
        ],
      ];
      cases.forEach(([input, expected]) => {
        const result = testMention(input, expected);
        assertMatch(result);
      });
    });
  });
  describe("Mixed Path Types in Single String", () => {
    it("correctly identifies the first path in a string with multiple path types", () => {
      const text =
        "Check both @thorapi/unix/path and @thorapi/C:\\windows\\path for details.";
      const result = mentionRegex.exec(text) || [];
      expect(result[0]).eq("@thorapi/unix/path");
      // Test starting from after the first match
      const secondSearchStart = text.indexOf("@thorapi/C:");
      const secondResult =
        mentionRegex.exec(text.substring(secondSearchStart)) || [];
      expect(secondResult[0]).eq("@thorapi/C:\\windows\\path");
    });
  });
  describe("Non-Latin Character Support", () => {
    it("handles international characters in paths", () => {
      const cases = [
        ["@thorapi/path/to/你好/file.txt", "@thorapi/path/to/你好/file.txt"],
        [
          "@thorapi/C:\\用户\\документы\\файл.txt",
          "@thorapi/C:\\用户\\документы\\файл.txt",
        ],
        ["@thorapi/путь/к/файлу.txt", "@thorapi/путь/к/файлу.txt"],
        [
          "@thorapi/C:\\folder\\file_äöü.txt",
          "@thorapi/C:\\folder\\file_äöü.txt",
        ],
      ];
      cases.forEach(([input, expected]) => {
        const result = testMention(input, expected);
        assertMatch(result);
      });
    });
  });
});
//# sourceMappingURL=context-mentions.test.js.map
