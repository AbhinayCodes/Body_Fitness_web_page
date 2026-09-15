import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthenticatedRequest = { headers: { authorization?: string }; authUser: { userId: string } };

export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.authUser.userId;
});