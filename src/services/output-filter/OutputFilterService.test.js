import { describe, it } from "mocha";
import "should";
import { OutputFilterService } from "./OutputFilterService";
describe("OutputFilterService", () => {
    describe("filterMavenOutput", () => {
        it("should remove download progress indicators", () => {
            const input = `
[INFO] Scanning for projects...
Downloading from central: https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-clean-plugin/3.1.0/maven-clean-plugin-3.1.0.pom
Downloaded from central: https://repo1.maven.org/maven2/org/apache/maven/plugins/maven-clean-plugin/3.1.0/maven-clean-plugin-3.1.0.pom (3.9 kB at 15 kB/s)
Progress (1): 4.1/4.1 kB
[INFO] BUILD SUCCESS
      `.trim();
            const result = OutputFilterService.filterMavenOutput(input);
            result.should.not.containEql("Downloading from central");
            result.should.not.containEql("Downloaded from central");
            result.should.not.containEql("Progress (1)");
            result.should.containEql("[INFO] Scanning for projects...");
            result.should.containEql("[INFO] BUILD SUCCESS");
        });
        it("should extract only Caused by exceptions from stack traces", () => {
            const input = `
[ERROR] Failed to execute goal
java.lang.RuntimeException: Build failed
    at org.apache.maven.DefaultMaven.doExecute(DefaultMaven.java:307)
    at org.apache.maven.DefaultMaven.doExecute(DefaultMaven.java:193)
    at org.apache.maven.DefaultMaven.execute(DefaultMaven.java:106)
Caused by: java.io.IOException: File not found
    at java.io.FileInputStream.<init>(FileInputStream.java:146)
    at java.io.FileInputStream.<init>(FileInputStream.java:101)
Caused by: java.lang.IllegalArgumentException: Invalid path
    at java.nio.file.Paths.get(Paths.java:127)
[INFO] BUILD FAILURE
      `.trim();
            const result = OutputFilterService.filterMavenOutput(input);
            result.should.containEql("java.lang.RuntimeException: Build failed");
            result.should.containEql("Caused by: java.io.IOException: File not found");
            result.should.containEql("Caused by: java.lang.IllegalArgumentException: Invalid path");
            result.should.not.containEql("at org.apache.maven.DefaultMaven.doExecute");
            result.should.not.containEql("at java.io.FileInputStream.<init>");
        });
        it("should truncate output if too long", () => {
            const longOutput = "A".repeat(10000);
            const result = OutputFilterService.filterMavenOutput(longOutput, { maxOutputLength: 100 });
            result.length.should.be.lessThan(200);
            result.should.containEql("[Output truncated");
        });
    });
    describe("filterNpmOutput", () => {
        it("should remove progress bars and spinners", () => {
            const input = `
⠋ Installing packages...
⠙ Resolving dependencies...
npm timing stage:loadCurrentTree Completed in 123ms
npm audit report
found 0 vulnerabilities
      `.trim();
            const result = OutputFilterService.filterNpmOutput(input);
            result.should.not.containEql("⠋ Installing");
            result.should.not.containEql("⠙ Resolving");
            result.should.not.containEql("npm timing");
            result.should.not.containEql("npm audit report");
            result.should.not.containEql("found 0 vulnerabilities");
        });
        it("should keep audit info if vulnerabilities found", () => {
            const input = `
npm audit report
found 3 high severity vulnerabilities
      `.trim();
            const result = OutputFilterService.filterNpmOutput(input);
            result.should.containEql("found 3 high severity vulnerabilities");
        });
    });
    describe("filterPythonOutput", () => {
        it("should remove pip download progress bars", () => {
            const input = `
Collecting requests
  |████████████████████████████████| 62 kB 1.2 MB/s
Downloading requests-2.25.1-py2.py3-none-any.whl (61 kB)
Successfully installed requests-2.25.1
      `.trim();
            const result = OutputFilterService.filterPythonOutput(input);
            result.should.not.containEql("|████████████████████████████████|");
            result.should.containEql("Collecting requests");
            result.should.containEql("Successfully installed");
        });
        it("should keep collecting lines if they have errors", () => {
            const input = `
Collecting broken-package
ERROR: Could not find a version that satisfies the requirement
Collecting working-package
Successfully installed working-package
      `.trim();
            const result = OutputFilterService.filterPythonOutput(input);
            result.should.containEql("Collecting broken-package");
            result.should.containEql("ERROR: Could not find");
            result.should.containEql("Collecting working-package");
        });
    });
    describe("filterCommandOutput", () => {
        it("should detect maven commands and apply maven filtering", () => {
            const input = "Downloading from central: test\n[INFO] BUILD SUCCESS";
            const result = OutputFilterService.filterCommandOutput(input, "mvn clean install");
            result.should.not.containEql("Downloading from central");
            result.should.containEql("[INFO] BUILD SUCCESS");
        });
        it("should detect npm commands and apply npm filtering", () => {
            const input = "⠋ Installing...\nnpm audit report\nfound 0 vulnerabilities";
            const result = OutputFilterService.filterCommandOutput(input, "npm install");
            result.should.not.containEql("⠋ Installing");
            result.should.not.containEql("npm audit report");
        });
        it("should apply generic filtering for unknown commands", () => {
            const input = "\x1b[32mGreen text\x1b[0m\nNormal text";
            const result = OutputFilterService.filterCommandOutput(input, "unknown-command");
            result.should.not.containEql("\x1b[32m");
            result.should.containEql("Green text");
            result.should.containEql("Normal text");
        });
    });
    describe("extractErrorSummary", () => {
        it("should extract error messages", () => {
            const input = "Some output\nERROR: Build failed due to compilation errors\nMore output";
            const result = OutputFilterService.extractErrorSummary(input);
            result.should.equal("Build failed due to compilation errors");
        });
        it("should extract exception messages", () => {
            const input = "Exception: Null pointer exception occurred\nStack trace...";
            const result = OutputFilterService.extractErrorSummary(input);
            result.should.equal("Null pointer exception occurred");
        });
        it("should extract caused by messages", () => {
            const input = "Build failed\nCaused by: Invalid configuration file\nDetails...";
            const result = OutputFilterService.extractErrorSummary(input);
            result.should.equal("Invalid configuration file");
        });
        it("should return null if no error found", () => {
            const input = "All good\nBuild successful\nNo issues";
            const result = OutputFilterService.extractErrorSummary(input);
            (result === null).should.be.true();
        });
    });
});
//# sourceMappingURL=OutputFilterService.test.js.map