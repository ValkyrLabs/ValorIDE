# ValkyrAI Application Lifecycle

ValkyrAI Application Studio owns each application's canonical OpenAPI Blueprint,
application bundles, generation configuration, and deployable revision. ValorIDE is
an integrated developer surface for that application, not a second application
authority.

## Ownership Boundaries

| Surface | Direction | Source of truth |
| --- | --- | --- |
| OpenAPI Blueprint | Bidirectional | ValkyrAI Application record and attached `OasOpenAPISpec` revision |
| Templates and app bundles | ValkyrAI to ValorIDE | ValkyrAI Application Studio |
| Generated ThorAPI artifacts | ValkyrAI to ValorIDE | ValkyrAI generation result |
| Developer source outside generated paths | ValorIDE to ValkyrAI | Immutable source snapshot selected by the controlled builder |
| Lightsail deployment | ValkyrAI to Lightsail | Assembled revision recorded in `tenant-runtime.json` |

## Developer Flow

1. Open a ValkyrAI Application you own or can write from ValorIDE's Applications view.
2. Use **Blueprint** to load and edit the canonical application OpenAPI document.
3. Use **Save** to create a new immutable `OasOpenAPISpec` revision in ValkyrAI.
4. Use **Save + Download** to regenerate the application and extract the result into
   the configured `thorapi` folder. The generated folder is marked as a one-way
   ValkyrAI artifact.
5. Develop and test the surrounding workspace normally.
6. Use **Publish Source** to create a filtered ZIP of developer-owned files.
   ValorIDE excludes SCM data, dependencies, build output, generated code,
   `thorapi` folders, the local OpenAPI input, environment files, and private-key
   formats.
7. ValkyrAI validates the archive and manifest, malware-scans it through the
   standard `FileRecord` upload flow, stores it in the configured storage driver,
   and records an immutable `GeneratedArtifact` source revision. Publishing a new
   revision supersedes the previous deployment input without mutating it.
8. Use **Deploy** to open ValkyrAI's application-scoped deployment console inside
   VS Code and manage the direct Lightsail deployment.
9. The controlled builder resolves the current source revision, regenerates the
   canonical Spring and TypeScript ThorAPI artifacts from the ValkyrAI Blueprint,
   injects them into the developer project, builds the Maven backend and Yarn
   frontend, and stamps the exact source revision and checksum into
   `tenant-runtime.json` before deployment.

Git or another SCM provider may be used for developer source control, review, and
history, but it is not a required transport or deployment hook. The OpenAPI
Blueprint is the only bidirectional application-definition surface. Developer
source travels one way as an immutable build input; generated source, templates,
and bundles continue to travel one way from ValkyrAI to ValorIDE and the builder.
