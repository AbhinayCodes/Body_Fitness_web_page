"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCheckInDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class MeasurementDto {
    type;
    valueCm;
}
__decorate([
    (0, class_validator_1.IsIn)(['WAIST', 'CHEST', 'BICEPS', 'HIPS', 'OTHER']),
    __metadata("design:type", String)
], MeasurementDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(20),
    (0, class_validator_1.Max)(250),
    __metadata("design:type", Number)
], MeasurementDto.prototype, "valueCm", void 0);
class CreateCheckInDto {
    recordedAt;
    weightKg;
    measurements;
}
exports.CreateCheckInDto = CreateCheckInDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCheckInDto.prototype, "recordedAt", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(25),
    (0, class_validator_1.Max)(350),
    __metadata("design:type", Number)
], CreateCheckInDto.prototype, "weightKg", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MeasurementDto),
    __metadata("design:type", Array)
], CreateCheckInDto.prototype, "measurements", void 0);
//# sourceMappingURL=create-check-in.dto.js.map