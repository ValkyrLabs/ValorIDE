# Add Thor Aliases and Includes

This command helps you wire an extracted Thor project folder into your existing TypeScript workspace by:

- Updating `compilerOptions.paths` for `@thor/*`, `@valkyr/component-library/*`, and `@thor/redux/services/*`.
- Optionally adding the selected project `src` folder(s) to the `include` array so the TS server type-checks them.
- Letting you target specific `tsconfig*.json` files with a multi-select picker.
- Optional preview of the updated `tsconfig` contents before saving.

## How to use

1. Right-click any Thor project folder (e.g., `thorapi/vX.Y/`) in the Explorer or select a project in the Projects view.
2. Run `ValorIDE: Add @thor Aliases From Folder`.
3. Pick one or more project folders to add.
4. Select the `tsconfig*.json` files you want to update.
5. Choose options:
   - Update alias paths (recommended)
   - Add includes for `src`
   - Preview updates before saving
6. If previewing, review the JSON and save manually if desired. Otherwise, changes will be applied automatically.

## What gets written

In each selected `tsconfig`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@thor/*": ["<rel>/src/thor/*"],
      "@valkyr/component-library/*": ["<rel>/src/components/*"],
      "@thor/redux/services/*": ["<rel>/src/thor/redux/services/*"]
    }
  },
  "include": [
    "<rel>/src"
  ]
}
```

Where `<rel>` is the path from the `tsconfig` file to the selected Thor project root.

## Notes

- Paths are updated idempotently; existing values are preserved unless they match the managed aliases above.
- Includes are appended if missing; duplicates are avoided.
- You can re-run the command anytime to adjust aliases or includes.

### From ThorAPI File Explorer

- Clicking a generated project folder that contains a `src/` directory in the ValorIDE ThorAPI File Explorer will prompt: “Add generated code to your project?”
- Choosing “Add” launches the same alias/update flow, pre-targeting the clicked folder. You’ll still pick which `tsconfig*.json` to update.
- Keep your project documentation aligned with `.valoriderules`; manage rules via the ValorIDE Rules popover in the chat UI.
