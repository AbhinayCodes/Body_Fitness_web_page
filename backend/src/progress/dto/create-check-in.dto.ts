import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';

class MeasurementDto {
  @IsIn(['WAIST', 'CHEST', 'BICEPS', 'HIPS', 'OTHER']) type!: string;
  @IsNumber() @Min(20) @Max(250) valueCm!: number;
}

export class CreateCheckInDto {
  @IsDateString() recordedAt!: string;
  @IsNumber() @Min(25) @Max(350) weightKg!: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MeasurementDto) measurements?: MeasurementDto[];
}