import * as bcrypt from 'bcrypt';
import { describe, expect, it, jest } from '@jest/globals';
import { AuthService } from './auth.service';

const phoneNumber = '+919876543210';

function createService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    otpChallenge: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), findUniqueOrThrow: jest.fn() },
  };
  const config = { get: jest.fn((key: string, fallback?: unknown) => ({ OTP_DEVELOPMENT_MODE: true, OTP_DEVELOPMENT_CODE: '123456', OTP_REQUEST_LIMIT: 3, OTP_MAX_ATTEMPTS: 5, ...overrides }[key] ?? fallback)) };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token'), verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-id' }) };
  return { service: new AuthService(jwt as never, config as never, prisma as never), prisma, jwt };
}

describe('AuthService OTP authentication', () => {
  it('creates a hashed development OTP challenge for a valid normalized number', async () => {
    const { service, prisma } = createService();
    await service.sendOtp('98765 43210');
    expect(prisma.otpChallenge.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ phoneNumber }) }));
    const hash = prisma.otpChallenge.create.mock.calls[0][0].data.codeHash;
    await expect(bcrypt.compare('123456', hash)).resolves.toBe(true);
  });

  it('rate limits OTP requests', async () => {
    const { service, prisma } = createService();
    prisma.otpChallenge.count.mockResolvedValue(3);
    await expect(service.sendOtp(phoneNumber)).rejects.toMatchObject({ status: 429 });
  });

  it('rejects expired and incorrect codes', async () => {
    const { service, prisma } = createService();
    prisma.otpChallenge.findFirst.mockResolvedValue({ id: 'challenge', expiresAt: new Date(Date.now() - 1), attempts: 0, codeHash: 'unused' });
    await expect(service.verifyOtp(phoneNumber, '123456')).rejects.toMatchObject({ status: 401 });
    prisma.otpChallenge.findFirst.mockResolvedValue({ id: 'challenge', expiresAt: new Date(Date.now() + 60_000), attempts: 0, codeHash: await bcrypt.hash('123456', 4) });
    await expect(service.verifyOtp(phoneNumber, '000000')).rejects.toMatchObject({ status: 401 });
    expect(prisma.otpChallenge.update).toHaveBeenCalledWith({ where: { id: 'challenge' }, data: { attempts: { increment: 1 } } });
  });

  it('rejects a challenge after the maximum number of attempts', async () => {
    const { service, prisma } = createService();
    prisma.otpChallenge.findFirst.mockResolvedValue({ id: 'challenge', expiresAt: new Date(Date.now() + 60_000), attempts: 5, codeHash: 'unused' });
    await expect(service.verifyOtp(phoneNumber, '123456')).rejects.toMatchObject({ status: 429 });
  });

  it('creates a new user once and returns only a session token', async () => {
    const { service, prisma } = createService();
    prisma.otpChallenge.findFirst.mockResolvedValue({ id: 'challenge', expiresAt: new Date(Date.now() + 60_000), attempts: 0, codeHash: await bcrypt.hash('123456', 4) });
    prisma.user.create.mockResolvedValue({ id: 'user-id', phoneNumber });
    prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.verifyOtp(phoneNumber, '123456')).resolves.toEqual({ accessToken: 'signed-token', isNewUser: true, user: { id: 'user-id', phoneNumber } });
  });

  it('logs an existing user in without creating a duplicate account', async () => {
    const { service, prisma } = createService();
    prisma.otpChallenge.findFirst.mockResolvedValue({ id: 'challenge', expiresAt: new Date(Date.now() + 60_000), attempts: 0, codeHash: await bcrypt.hash('123456', 4) });
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user', phoneNumber });
    prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.verifyOtp(phoneNumber, '123456')).resolves.toMatchObject({ isNewUser: false, user: { id: 'existing-user', phoneNumber } });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('validates the subject carried by an active session token', async () => {
    const { service } = createService();
    await expect(service.verifyAccessToken('signed-token')).resolves.toBe('user-id');
  });
});