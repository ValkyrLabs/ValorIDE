import { Empty } from "../../../shared/proto/common";
/**
 * Clears the current task
 * @param controller The controller instance
 * @param _request The empty request
 * @returns Empty response
 */
export async function clearTask(controller, _request) {
    await controller.clearTask();
    await controller.postStateToWebview();
    return Empty.create();
}
//# sourceMappingURL=clearTask.js.map