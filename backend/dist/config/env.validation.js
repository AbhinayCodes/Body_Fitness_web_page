"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
const Joi = __importStar(require("joi"));
function validateEnvironment(config) {
    const schema = Joi.object({
        DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
        JWT_SECRET: Joi.string().min(32).required(),
        PORT: Joi.number().port().default(8000),
        OTP_DEVELOPMENT_MODE: Joi.boolean().default(false),
        OTP_DEVELOPMENT_CODE: Joi.string().pattern(/^\d{6}$/).when('OTP_DEVELOPMENT_MODE', { is: true, then: Joi.required() }),
        OTP_REQUEST_LIMIT: Joi.number().integer().min(1).max(10).default(3),
        OTP_MAX_ATTEMPTS: Joi.number().integer().min(1).max(10).default(5),
    }).unknown(true);
    const { error, value } = schema.validate(config);
    if (error)
        throw new Error(`Invalid environment configuration: ${error.message}`);
    if (value.NODE_ENV === 'production' && value.OTP_DEVELOPMENT_MODE)
        throw new Error('Invalid environment configuration: OTP_DEVELOPMENT_MODE must be disabled in production.');
    return value;
}
//# sourceMappingURL=env.validation.js.map