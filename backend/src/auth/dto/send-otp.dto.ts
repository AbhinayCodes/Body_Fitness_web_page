import { Matches } from 'class-validator';

export class SendOtpDto {
  @Matches(/^(?:\+91|91)?[6-9]\d{9}$/, { message: 'Enter a valid Indian mobile number.' })
  phoneNumber!: string;
}