export interface IApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export class ApiResponse<T = any> implements IApiResponse<T> {
  public success: boolean;
  public statusCode: number;
  public message: string;
  public data?: T;
  public errors?: Array<{ field: string; message: string }>;

  constructor(
    statusCode: number,
    message: string,
    data?: T,
    errors?: Array<{ field: string; message: string }>
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.errors = errors;
    this.success = statusCode < 400;
  }
}

export default ApiResponse;
