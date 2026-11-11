# Preserved 2025 ValorIDE drafts

These drafts were consolidated into `rc-8` on 2026-11-11 with their original history and exact source bytes retained. They remain available here for inspection and recovery.

The `refactor_index` commit `72bff192560954013067eb57ac857a8a5661dbf6` only added three unwired controller classes and an `index_new.txt` sketch; it did not replace the active controller. Its exact files are preserved as text so the 2025 API assumptions are not compiled as current runtime code. SHA-256 hashes and original paths are in `manifest.json`.

The `rc-3`/former `dc-1` commit `271720dc7a88256e5f4a11e81d3fc6d460f0cea5` is an alternative snapshot titled “working build not great.” It changes 2,554 files and includes emitted JavaScript/maps. Its source modules all have counterparts in the current tree; its useful directory-read and persisted-history guards were already integrated in `253c3620357ab770d0eccf1be9a7821348f7db9f`. The complete binary-capable Git patch is stored in `legacy-rc3-271720dc.patch.gz`; no unique code bytes are discarded. Its original parent and full tree remain available through the retained merge ancestry.

To inspect the snapshot, use `git show 271720dc7a88256e5f4a11e81d3fc6d460f0cea5:<path>` or decompress the patch. Reconstruct changes against its original parent `0804757fc922df5c5a0dcd7d43842f1ab736fbef` in a separate review checkout. Applying the 2025 patch directly to current `rc-8` is not an integration procedure.

The active checkout keeps its current authentication, generated-client boundaries and runtime source. This archive is excluded from the VSIX runtime allowlist.
