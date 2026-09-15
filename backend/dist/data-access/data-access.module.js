"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataAccessModule = void 0;
const common_1 = require("@nestjs/common");
const fitness_state_repository_1 = require("./fitness-state.repository");
let DataAccessModule = class DataAccessModule {
};
exports.DataAccessModule = DataAccessModule;
exports.DataAccessModule = DataAccessModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({ providers: [fitness_state_repository_1.FitnessStateRepository], exports: [fitness_state_repository_1.FitnessStateRepository] })
], DataAccessModule);
//# sourceMappingURL=data-access.module.js.map