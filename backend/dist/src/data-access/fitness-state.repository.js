"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FitnessStateRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FitnessStateRepository = void 0;
const common_1 = require("@nestjs/common");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const fitness_state_types_1 = require("./fitness-state.types");
let FitnessStateRepository = FitnessStateRepository_1 = class FitnessStateRepository {
    logger = new common_1.Logger(FitnessStateRepository_1.name);
    dataFile = (0, node_path_1.join)(process.cwd(), '..', 'data.json');
    writeQueue = Promise.resolve();
    async getState() {
        try {
            const content = await (0, promises_1.readFile)(this.dataFile, 'utf8');
            return this.normalize(JSON.parse(content));
        }
        catch (error) {
            this.logger.warn(`Unable to read data.json; resetting state. ${error instanceof Error ? error.message : ''}`);
            const state = structuredClone(fitness_state_types_1.DEFAULT_STATE);
            await this.saveState(state);
            return state;
        }
    }
    async updateState(mutator) {
        let updatedState;
        this.writeQueue = this.writeQueue.then(async () => {
            const state = await this.getState();
            mutator(state);
            await (0, promises_1.writeFile)(this.dataFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
            updatedState = state;
        });
        await this.writeQueue;
        return updatedState;
    }
    async saveState(state) {
        await (0, promises_1.writeFile)(this.dataFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    }
    normalize(candidate) {
        if (!candidate || typeof candidate !== 'object')
            return structuredClone(fitness_state_types_1.DEFAULT_STATE);
        const state = candidate;
        return {
            profile: { ...fitness_state_types_1.DEFAULT_STATE.profile, ...(state.profile ?? {}) },
            mealDone: Boolean(state.mealDone),
            workoutHistory: Array.isArray(state.workoutHistory) ? state.workoutHistory : [],
            mealHistory: Array.isArray(state.mealHistory) ? state.mealHistory : [],
        };
    }
};
exports.FitnessStateRepository = FitnessStateRepository;
exports.FitnessStateRepository = FitnessStateRepository = FitnessStateRepository_1 = __decorate([
    (0, common_1.Injectable)()
], FitnessStateRepository);
//# sourceMappingURL=fitness-state.repository.js.map