# ThorAPI Client Upgrade Checklist

When the ThorAPI client is regenerated (e.g., after an OpenAPI spec update), the generated code may change in ways that break the consuming frontend code. Use this checklist to systematically resolve all issues:

---

## 1. **Check for Removed or Renamed Exports**

- **Error:** `has no exported member named 'useGenerateApplicationMutation'`
- **Action:**  
  - Open `src/thor/redux/services/ApplicationService.tsx`
  - Use only the hooks/mutations that are actually exported (e.g., `useDeleteApplicationMutation`)
  - Remove or update any usage of missing hooks in your components.

---

## 2. **Update API Calls to Match New Signatures**

- **Error:** `Expected 1-2 arguments, but got 0.`
- **Action:**  
  - Open the relevant API file (e.g., `src/thor/api/LoginApi.ts`)
  - Update all calls to `getLoginList`, `getLogoutList`, `getPrincipalList`, etc. to provide the required `requestParameters` argument.

---

## 3. **Fix Import Paths for Missing Modules**

- **Error:** `Cannot find module '../../redux/cache/rtkInvalidate'`
- **Action:**  
  - Ensure the file exists at the specified path.
  - If the file was removed or renamed, update all imports and usages accordingly.

---

## 4. **Fix Missing UI Components or Dependencies**

- **Error:** `Cannot find name 'Spinner'`
- **Action:**  
  - Import `Spinner` from your UI library (e.g., `import { Spinner } from 'react-bootstrap'`)
  - Or, add the missing dependency if not present.

---

## 5. **Update Type Usages to Match New Models**

- **Error:** `Object literal may only specify known properties, but 'organizationId' does not exist in type 'Principal'.`
- **Action:**  
  - Check the new definition of `Principal` in the generated model.
  - Update your code to use the correct property (e.g., `organization` instead of `organizationId`).

---

## 6. **Update WebSocket/Runtime Imports**

- **Error:** `'WSS_BASE_PATH' has no exported member`
- **Action:**  
  - Use `BASE_PATH` if that's the only available export.
  - Update all code to use the correct runtime constants.

---

## 7. **General Advice**

- After each codegen, always:
  - Review the generated code for breaking changes.
  - Systematically update all consuming code to match the new API.
  - Run `yarn build` and fix all TypeScript errors before proceeding.
  - Test all affected features in a staging environment.

---

_Last updated: 2025-09-10_
