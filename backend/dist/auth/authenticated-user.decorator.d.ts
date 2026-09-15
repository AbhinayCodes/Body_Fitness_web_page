export type AuthenticatedRequest = {
    headers: {
        authorization?: string;
    };
    authUser: {
        userId: string;
    };
};
export declare const CurrentUserId: (...dataOrPipes: unknown[]) => ParameterDecorator;
