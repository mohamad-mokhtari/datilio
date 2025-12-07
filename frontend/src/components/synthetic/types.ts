export interface FailedTask {
  id: string;
  celery_task_id: string;
  task_type: string;
  task_name: string;
  status: string;
  progress: number;
  input_params: any;
  error_message: string;
  created_at: string;
  started_at: string | null;
  completed_at: string;
  estimated_time_seconds: number;
  retry_count: number;
  can_retry: boolean;
  failure_type: 'service_unavailable' | 'worker_timeout' | 'processing_error' | string;
  retry_attempts_count: number;
  successful_retry_id?: string;
  successful_retry_result?: {
    status: string;
    data_id: string;
    message: string;
    filename: string;
    filepath: string;
    file_size: number;
    file_size_mb: number;
    rows_generated: number;
  };
  has_successful_retry: boolean;
}

export interface FailedTasksResponse {
  total: number;
  limit: number;
  offset: number;
  failed_tasks: FailedTask[];
}
