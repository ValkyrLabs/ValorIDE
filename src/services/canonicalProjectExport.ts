import { PROJECT_UUID, normalizeBlueprintBackend } from "./projectBlueprintSync";
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";

/** Read the complete editable package for the already accepted receipt; never start another generation. */
export async function downloadCanonicalProjectExport(options: {
  backend: string;
  applicationId: string;
  receiptRef: string;
  jwtToken: string;
  assertCurrent: () => Promise<void>;
}): Promise<Buffer> {
  if (!PROJECT_UUID.test(options.applicationId) || !/^[a-z0-9._:-]{1,200}$/i.test(options.receiptRef) || !options.jwtToken.trim())
    throw new Error("Choose a successful generation receipt from this Application and sign in to its authorized account before exporting.");
  const backend = normalizeBlueprintBackend(options.backend);
  await options.assertCurrent();
  try {
    const response = await getValkyrLabsRtkApiClient().request<ArrayBuffer>({
      url: `${backend}/thorapi/applications/${encodeURIComponent(options.applicationId)}/developer-project/export`,
      params: { receiptRef: options.receiptRef },
      method: "GET",
      headers: { Authorization: `Bearer ${options.jwtToken}` },
      responseType: "arrayBuffer",
      redirect: "error",
      maxResponseBytes: 95 * 1024 * 1024,
    });
    await options.assertCurrent();
    const bytes = Buffer.from(response.data);
    if (!bytes.length) throw new Error("The complete project export was empty. Retry the same receipt.");
    return bytes;
  } catch (error) {
    if (!(error instanceof ValkyrLabsApiError)) throw error;
    const status = error.status;
    throw new Error(status === 401 || status === 403
      ? "The complete project export is unavailable to this account. Reconnect the Application's authorized account, then retry the same generation receipt."
      : `Complete project export failed${typeof status === "number" ? ` (${status})` : ""}. Existing project files were preserved. Check the Application's Blueprint and artifact storage, then retry the same receipt; another generation is not required.`);
  }
}
