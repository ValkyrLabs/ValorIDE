/**
 * Service for submitting completed ValorIDE task summaries to ValkyrAI ContentData
 * This captures the beautiful task completion summaries and stores them for historical reference
 */
import { ContentData, ContentDataContentTypeEnum, ContentDataCategoryEnum, ContentDataStatusEnum } from "@thor/model";

export interface TaskCompletionData {
  taskId: string;
  completionResult: string;
  taskDescription?: string;
  timestamp: Date;
}

export class TaskCompletionSubmitter {
  private static instance: TaskCompletionSubmitter;

  private constructor() {}

  public static getInstance(): TaskCompletionSubmitter {
    if (!TaskCompletionSubmitter.instance) {
      TaskCompletionSubmitter.instance = new TaskCompletionSubmitter();
    }
    return TaskCompletionSubmitter.instance;
  }

  /**
   * Submit a completed task summary to ContentData
   */
  async submitCompletedTask(data: TaskCompletionData): Promise<boolean> {
    try {
      const { ContentDataBridge } = await import('./ContentDataBridge');
      const bridge = ContentDataBridge.getInstance();

      // Create ContentData record
      const contentData: ContentData = {
        title: `ValorIDE Task Completion - ${data.taskId}`,
        subtitle: data.taskDescription?.substring(0, 100) || 'Task completed successfully',
        contentType: ContentDataContentTypeEnum.MARKDOWN,
        category: ContentDataCategoryEnum.CODEGEN,
        status: ContentDataStatusEnum.PUBLISHED,
        contentData: this.formatCompletionSummary(data),
        releaseDate: data.timestamp,
        fileName: `valoride-task-${data.taskId}.md`,
      };

      // Submit to ContentData API
      const result = await bridge.createContentData(contentData);
      
      if (result) {
        console.log(`Successfully submitted task completion to ContentData: ${data.taskId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to submit task completion to ContentData:', error);
      return false;
    }
  }

  /**
   * Format the completion summary with markdown styling
   */
  private formatCompletionSummary(data: TaskCompletionData): string {
    const timestamp = data.timestamp.toLocaleString();
    
    return `# ValorIDE Task Completion Summary

**Task ID:** ${data.taskId}  
**Completed:** ${timestamp}

${data.taskDescription ? `## Original Task\n\n${data.taskDescription}\n\n` : ''}## Completion Result

${data.completionResult}

---

*This task was completed by ValorIDE - AI-powered autonomous coding assistant*
`;
  }
}
