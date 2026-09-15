import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUserId } from './authenticated-user.decorator';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller(['api/v1/auth', 'api/auth'])
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendOtp(@Body() payload: SendOtpDto): Promise<void> { await this.authService.sendOtp(payload.phoneNumber); }

  @Post('phone-login')
  loginWithPhone(@Body() payload: SendOtpDto) { return this.authService.loginWithPhone(payload.phoneNumber); }

  @Post('verify-otp')
  verifyOtp(@Body() payload: VerifyOtpDto) { return this.authService.verifyOtp(payload.phoneNumber, payload.code); }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserId() userId: string) { return this.authService.getCurrentUser(userId); }
}