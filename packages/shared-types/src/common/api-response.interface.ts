export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
  timestamp: string;
  path?: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  details?: unknown;
  timestamp: string;
  path?: string;
}
