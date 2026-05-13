import { ApiErrorResponse, ApiResponse } from '@lms/shared-types';

export class ApiResponseBuilder {
  static success<T>(
    data: T,
    message = 'Success',
    statusCode = 200,
    path?: string,
  ): ApiResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  static created<T>(data: T, message = 'Created', path?: string): ApiResponse<T> {
    return ApiResponseBuilder.success(data, message, 201, path);
  }

  static error(
    message: string,
    statusCode = 500,
    error?: string,
    details?: unknown,
    path?: string,
  ): ApiErrorResponse {
    return {
      success: false,
      statusCode,
      message,
      error,
      details,
      timestamp: new Date().toISOString(),
      path,
    };
  }
}
