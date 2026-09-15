import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    sendOtp(payload: SendOtpDto): Promise<void>;
    loginWithPhone(payload: SendOtpDto): Promise<{
        accessToken: string;
        isNewUser: boolean;
        user: {
            id: string;
            phoneNumber: string;
        };
    }>;
    verifyOtp(payload: VerifyOtpDto): Promise<{
        accessToken: string;
        isNewUser: boolean;
        user: {
            id: string;
            phoneNumber: string | null;
        };
    }>;
    me(userId: string): Promise<{
        user: {
            id: string;
            phoneNumber: string | null;
        };
    }>;
}
