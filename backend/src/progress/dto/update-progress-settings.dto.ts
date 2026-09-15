import { IsIn } from 'class-validator';

export class UpdateProgressSettingsDto {
  @IsIn([7, 14]) checkInFrequencyDays!: number;
}