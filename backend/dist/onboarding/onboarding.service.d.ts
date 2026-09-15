import { PrismaService } from '../data-access/prisma.service';
import type { SaveOnboardingDto } from './dto/save-onboarding.dto';
export declare class OnboardingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    get(userId: string): Promise<Record<string, unknown>>;
    save(userId: string, payload: SaveOnboardingDto): Promise<Record<string, unknown>>;
}
