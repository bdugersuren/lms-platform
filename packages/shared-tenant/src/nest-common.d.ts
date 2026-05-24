declare module '@nestjs/common' {
  export interface ExecutionContext {
    switchToHttp(): {
      getRequest<T = Record<string, unknown>>(): T;
    };
  }

  export interface CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean>;
  }

  export class UnauthorizedException extends Error {
    constructor(message?: string);
  }

  export function Injectable(): ClassDecorator;

  export function createParamDecorator<
    TData = unknown,
    TContext = ExecutionContext,
    TResult = unknown,
  >(factory: (data: TData, ctx: TContext) => TResult): ParameterDecorator;
}
