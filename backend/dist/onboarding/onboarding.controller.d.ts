import { SaveOnboardingDto } from './dto/save-onboarding.dto';
import { OnboardingService } from './onboarding.service';
export declare class OnboardingController {
    private readonly onboardingService;
    constructor(onboardingService: OnboardingService);
    get(userId: string): Promise<Record<string, unknown>>;
    save(userId: string, payload: SaveOnboardingDto): Promise<Record<string, unknown>>;
}
