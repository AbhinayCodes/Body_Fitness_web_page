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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
exports.normalizeIndianPhone = normalizeIndianPhone;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../data-access/prisma.service");
let AuthService = class AuthService {
    jwtService;
    config;
    prisma;
    constructor(jwtService, config, prisma) {
        this.jwtService = jwtService;
        this.config = config;
        this.prisma = prisma;
    }
    hashPassword(password) {
        return bcrypt.hash(password, 12);
    }
    verifyPassword(password, passwordHash) {
        return bcrypt.compare(password, passwordHash);
    }
    signAccessToken(userId) {
        return this.jwtService.signAsync({ sub: userId });
    }
    async verifyAccessToken(token) {
        try {
            const payload = await this.jwtService.verifyAsync(token);
            if (typeof payload.sub !== 'string')
                throw new Error('Missing subject');
            return payload.sub;
        }
        catch {
            throw new common_1.UnauthorizedException('Your session is invalid or has expired.');
        }
    }
    async sendOtp(rawPhoneNumber) {
        const phoneNumber = normalizeIndianPhone(rawPhoneNumber);
        const developmentCode = this.developmentCode();
        if (!developmentCode)
            throw new common_1.ServiceUnavailableException('SMS delivery is not configured.');
        const now = new Date();
        const requests = await this.prisma.otpChallenge.count({ where: { phoneNumber, createdAt: { gte: new Date(now.getTime() - 10 * 60_000) } } });
        if (requests >= this.config.get('OTP_REQUEST_LIMIT', 3))
            throw new common_1.HttpException('Too many codes requested. Please try again later.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        const code = developmentCode ?? (0, node_crypto_1.randomInt)(100000, 1_000_000).toString();
        await this.prisma.otpChallenge.create({ data: { phoneNumber, codeHash: await bcrypt.hash(code, 12), expiresAt: new Date(now.getTime() + 5 * 60_000) } });
    }
    async verifyOtp(rawPhoneNumber, code) {
        const phoneNumber = normalizeIndianPhone(rawPhoneNumber);
        const challenge = await this.prisma.otpChallenge.findFirst({ where: { phoneNumber, consumedAt: null }, orderBy: { createdAt: 'desc' } });
        if (!challenge || challenge.expiresAt <= new Date())
            throw new common_1.UnauthorizedException('This code has expired. Request a new one.');
        if (challenge.attempts >= this.config.get('OTP_MAX_ATTEMPTS', 5))
            throw new common_1.HttpException('Too many incorrect attempts. Request a new code.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        if (!await bcrypt.compare(code, challenge.codeHash)) {
            await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
            throw new common_1.UnauthorizedException('That code is not correct.');
        }
        const existingUser = await this.prisma.user.findUnique({ where: { phoneNumber } });
        const user = existingUser ?? await this.prisma.user.create({ data: { key: `phone:${phoneNumber}`, phoneNumber, profile: { create: { name: 'Member', goal: 'Build muscle', days: '4 days / week', diet: 'Vegetarian' } } } });
        const consumed = await this.prisma.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date(), userId: user.id } });
        if (consumed.count !== 1)
            throw new common_1.UnauthorizedException('This code has already been used.');
        return { accessToken: await this.signAccessToken(user.id), isNewUser: !existingUser, user: { id: user.id, phoneNumber: user.phoneNumber } };
    }
    async getCurrentUser(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, phoneNumber: true } });
        if (!user?.phoneNumber)
            throw new common_1.UnauthorizedException('Your session is no longer valid.');
        return { user };
    }
    developmentCode() {
        if (this.config.get('NODE_ENV') === 'production' || !this.config.get('OTP_DEVELOPMENT_MODE', false))
            return undefined;
        return this.config.get('OTP_DEVELOPMENT_CODE');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService, config_1.ConfigService, prisma_service_1.PrismaService])
], AuthService);
function normalizeIndianPhone(value) {
    const digits = value.replace(/[\s-]/g, '').replace(/^\+/, '');
    return `+91${digits.startsWith('91') ? digits.slice(2) : digits}`;
}
//# sourceMappingURL=auth.service.js.map