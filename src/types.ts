export type TaskType = 'daytime' | 'sleep';
export type AppState = 'landing' | 'setup' | 'dashboard' | 'learning' | 'testing' | 'survey';

export interface UserProfile {
  name: string;
  current_round: number;
  role: string;
  learning_start_time?: string;
  learning_task_type?: TaskType;
}

export interface TestRecord {
  id?: string;
  user_id: string;
  user_name: string;
  round_number: number;
  task_type: TaskType;
  immediate_score: number;
  delayed_score?: number;
  immediate_timestamp: string;
  delayed_timestamp?: string;
  interval_hours?: number;
  extra_variable?: number;
  is_valid: boolean;
  status: 'waiting' | 'completed';
}
