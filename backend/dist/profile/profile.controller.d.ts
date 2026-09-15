import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';
export declare class ProfileController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    updateProfile(userId: string, payload: UpdateProfileDto): Promise<import("../data-access/fitness-state.types").Profile>;
}
