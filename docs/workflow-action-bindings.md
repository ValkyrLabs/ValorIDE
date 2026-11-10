# Assign a workflow to project code

Open an authored TypeScript or TSX file in a trusted workspace. Place the cursor on a named action, a JSX opening tag, or a specific event attribute (such as `onClick`, `onChange`, or `onSubmit`). Click the link icon next to a workflow in **Workflows**. Alternatively, right-click in the editor and choose **Assign Workflow to Action or Component Event**.

ValorIDE reads the active deployment and its immutable launch version. If more than one environment is active, you choose the deployment. Missing deployments, invalid schemas, and ambiguous handlers are reported instead of guessing. Binding edits project files; it does not launch a workflow, publish code, or grant execution access.

- **TypeScript action:** a parameter object supplies the declared inputs, or named parameters map to matching fields. Empty, unannotated actions return the workflow promise. Existing action bodies keep their original return behavior.
- **JSX event:** the bound event preserves its existing handler. An event without required input values opens the generated form; a no-input event can launch directly. No workflow starts during render.
- **Form submit:** the command inserts missing launch fields and preserves your existing inputs with matching names. Only declared fields are sent. The app reports the confirmed execution ID or a failure.

Components live under the consuming source tree's `valkyr-workflows/<deployment-id>/`. Import `WorkflowForm` from `Form.tsx` for a standalone React form, or `WorkflowFields` for the fields inside an authored form. `action.ts` exports `run(inputs)` and a native DOM `form(initialValues, onStarted)` usable without React. Components are generated for the selected immutable version, not the workflow's editable draft. Rebinding the same target is idempotent. An existing file with different contents is never overwritten.

Execution uses the application's signed-in user, **not** the developer's ValorIDE session. A linked ThorAPI client handles same-backend requests. If the workflow is hosted on a different backend, the default browser transport requires that backend's own signed-in session, CSRF token, and credentialed CORS permission for the app origin. An app using server-side credentials or a backend-for-frontend can supply its own authorized request function through `setWorkflowTransport`. Never copy an IDE token into application code. A server denial or unconfirmed receipt is not a successful launch; inspect execution history before retrying.

For local verification, `node scripts/workflow-binding-acceptance.mjs` opens an isolated VS Code test window with a disposable project and fixture workflow. It runs no hosted workflow. Set `VSCODE_EXECUTABLE_PATH` if the local VS Code test cache is empty.
