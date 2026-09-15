import { Matches } from 'class-validator';

export class VerifyOtpDto {
  @Matches(/^(?:\+91|91)?[6-9]\d{9}$/, { message: 'Enter a valid Indian mobile number.' })
  phoneNumber!: string;

  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code.' })
  code!: string;
}