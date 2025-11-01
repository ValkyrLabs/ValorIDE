# ContentData Integration for Task Completion Summaries

## Overview

ValorIDE automatically submits task completion summaries to ValkyrAI's ContentData API for historical record keeping. When a user accepts a task completion (the "beautiful summary with green text"), the system creates a ContentData record containing the task details and completion result.

## Architecture

The integration follows a **Bridge Pattern** for extension-to-webview communication, similar to the UsageTracking service:

```
Extension Side              →    Webview Side
─────────────────                ──────────────
TaskCompletionSubmitter    →    ContentDataHandler
       ↓                              ↓
ContentDataBridge          →    RTK Query (ContentDataService)
       ↓                              ↓
WebviewPanel postMessage   →    ThorAPI ContentData endpoint
```

## Components

### 1. TaskCompletionSubmitter (Extension)

**Location**: `src/services/content-data/TaskCompletionSubmitter.ts`

Singleton service that:
- Formats task completion data into markdown
- Creates ContentData objects with proper structure
- Delegates to ContentDataBridge for submission

**Key Method**:
```typescript
async submitCompletedTask(params: TaskCompletionParams): Promise<ContentData>
```

**ContentData Structure**:
- `title`: "ValorIDE Task Completion - {taskId}"
- `contentType`: MARKDOWN
- `category`: CODEGEN
- `status`: PUBLISHED
- `contentData`: Formatted markdown with task description and result

### 2. ContentDataBridge (Extension)

**Location**: `src/services/content-data/ContentDataBridge.ts`

Bridge service that:
- Manages extension-to-webview communication
- Generates transaction IDs for request/response matching
- Handles promise-based async operations
- Provides graceful error handling

**Key Method**:
```typescript
async createContentData(contentData: any): Promise<any>
```

**Message Format**:
```typescript
// Request to webview
{
  type: 'content_data',
  action: 'create',
  data: {
    transactionId: string,
    contentData: Partial<ContentData>
  }
}

// Response from webview
{
  type: 'content_data_response',
  action: 'create_result',
  data: {
    transactionId: string,
    success: boolean,
    item: ContentData
  }
}
```

### 3. Task Completion Hook (Extension)

**Location**: `src/core/task/index.ts` (line ~4870)

Integration point that:
- Triggers when user accepts task completion
- Extracts task description and completion result
- Calls TaskCompletionSubmitter asynchronously
- Handles errors gracefully without failing task completion

**Integration Code**:
```typescript
// After task completion accepted
if (response === "yesButtonClicked") {
  // ... existing code ...
  
  // Submit completed task to ContentData
  try {
    const { TaskCompletionSubmitter } = await import('@services/content-data/TaskCompletionSubmitter');
    const submitter = TaskCompletionSubmitter.getInstance();
    const taskMessage = this.valorideMessages[0];
    await submitter.submitCompletedTask({
      taskId: this.taskId,
      completionResult: result,
      taskDescription: taskMessage.text,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to submit task completion to ContentData:', error);
    // Don't fail the task if ContentData submission fails
  }
}
```

### 4. ContentDataHandler (Webview)

**Location**: `webview-ui/src/components/content-data/ContentDataHandler.tsx`

React component that:
- Listens for 'content_data' messages from extension
- Waits for JWT token to be available
- Uses RTK Query's `useAddContentDataMutation` hook
- Posts ContentData to ThorAPI backend
- Sends response back to extension

**Key Features**:
- Invisible component (returns null)
- Waits up to 3 seconds for JWT token
- Handles authentication errors gracefully
- Matches transaction IDs for request/response correlation

### 5. App Integration (Webview)

**Location**: `webview-ui/src/App.tsx`

The ContentDataHandler is mounted at the app root level:

```tsx
const App = () => {
  return (
    <ExtensionStateContextProvider>
      <MothershipProvider>
        <ChatMothershipProvider>
          <UsageTrackingHandler />
          <ContentDataHandler /> {/* ← Added here */}
          <StartupDebit />
          <AppContent />
        </ChatMothershipProvider>
      </MothershipProvider>
    </ExtensionStateContextProvider>
  );
};
```

## Data Flow

1. **User Action**: User clicks "Accept" on task completion result
2. **Extension Hook**: `src/core/task/index.ts` detects acceptance
3. **Submit Request**: TaskCompletionSubmitter formats and submits data
4. **Bridge Message**: ContentDataBridge sends message to webview
5. **Webview Handler**: ContentDataHandler receives message
6. **Authentication**: Handler waits for JWT token
7. **API Call**: RTK Query posts to ThorAPI ContentData endpoint
8. **Response**: Handler sends success/failure back to extension
9. **Promise Resolution**: Bridge resolves promise with result

## Error Handling

### Extension Side
- Try-catch wrapper ensures ContentData failures don't break task completion
- Errors are logged to console but don't throw
- Dynamic import prevents circular dependencies

### Webview Side
- JWT token wait with 3-second timeout
- RTK Query handles network errors automatically
- Failures are sent back to extension with error details

## Testing

### Manual Testing

1. **Complete a Task**:
   - Start a task with ValorIDE
   - Use `attempt_completion` tool
   - Click "Accept" button

2. **Verify ContentData**:
   - Check ValkyrAI dashboard for new ContentData record
   - Verify title format: "ValorIDE Task Completion - {taskId}"
   - Confirm markdown content includes task description and result
   - Check category is CODEGEN and status is PUBLISHED

3. **Test Error Cases**:
   - Complete task without authentication (should fail gracefully)
   - Complete task with network disconnected (should timeout gracefully)
   - Verify task still completes even if ContentData submission fails

### Console Verification

**Extension Console**:
```
Submitting task completion to ContentData...
Task completion submitted successfully
```

**Webview Console** (if errors):
```
Failed to submit content data: [error details]
```

## Configuration

### Thor-Generated Files (READ ONLY)

These files are auto-generated by ThorAPI and should NOT be edited:

- `webview-ui/src/thor/model/ContentData.ts` - ContentData interface
- `webview-ui/src/thor/api/ContentDataApi.ts` - Raw API functions
- `webview-ui/src/thor/redux/services/ContentDataService.tsx` - RTK Query service

### Required Services

The integration requires:
1. **Authentication**: User must be logged in with valid JWT token
2. **ThorAPI Connection**: Webview must be connected to ThorAPI backend
3. **ContentData Service**: Redux store must include ContentDataService reducer

## Future Enhancements

Potential improvements:
1. Add user preference to enable/disable ContentData submission
2. Include additional metadata (duration, file count, etc.)
3. Support batch submission for multiple task completions
4. Add retry logic with exponential backoff
5. Include task checkpoints and progress updates
6. Add categories for different task types (debugging, refactoring, etc.)

## Dependencies

### Extension Dependencies
- `@services/content-data/TaskCompletionSubmitter`
- `@services/content-data/ContentDataBridge`

### Webview Dependencies
- `@thor/redux/services/ContentDataService`
- `@thor/model/ContentData`
- `@reduxjs/toolkit/query/react`

## Related Documentation

- [UsageTracking Integration](../src/api/USAGE_TRACKING_INTEGRATION.md)
- [Thor API Client Upgrade Checklist](./architecture/thorapi-client-upgrade-checklist.md)
- [Bridge Pattern Architecture](./architecture/README.md)

## Troubleshooting

### ContentData Not Submitting

**Check**:
1. User is authenticated (JWT token available)
2. Webview is connected to ThorAPI
3. Network connectivity to backend
4. Browser console for error messages

**Solution**:
- Verify authentication in Account view
- Check network tab for failed requests
- Review console logs for specific errors

### Duplicate Submissions

**Cause**: Multiple task completion attempts

**Solution**: Each submission uses unique transaction ID, duplicates should be handled by backend

### Missing Task Description

**Cause**: `valorideMessages[0]` not available

**Solution**: Verify task was started properly with initial user message
