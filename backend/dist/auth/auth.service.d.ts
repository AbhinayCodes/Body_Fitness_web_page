import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../data-access/prisma.service';
export declare class AuthService {
    private readonly jwtService;
    private readonly config;
    private readonly prisma;
    constructor(jwtService: JwtService, config: ConfigService, prisma: PrismaService);
    hashPassword(password: string): Promise<string>;
    verifyPassword(password: string, passwordHash: string): Promise<boolean>;
    signAccessToken(userId: string): Promise<string>;
    verifyAccessToken(token: string): Promise<string>;
    sendOtp(rawPhoneNumber: string): Promise<void>;
    verifyOtp(rawPhoneNumber: string, code: string): Promise<{
        accessToken: string;
        isNewUser: boolean;
        user: {
            id: string;
            phoneNumber: string | null;
        };
    }>;
    getCurrentUser(userId: string): Promise<{
        user: {
            id: string;
            phoneNumber: string | null;
        };
    }>;
    private developmentCode;
}
export declare function normalizeIndianPhone(value: string): string;
