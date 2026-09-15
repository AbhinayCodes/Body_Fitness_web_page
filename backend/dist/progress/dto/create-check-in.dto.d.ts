declare class MeasurementDto {
    type: string;
    valueCm: number;
}
export declare class CreateCheckInDto {
    recordedAt: string;
    weightKg: number;
    measurements?: MeasurementDto[];
}
export {};
