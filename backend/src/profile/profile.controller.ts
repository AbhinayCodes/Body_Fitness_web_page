import { Body, Controller, Put } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller(['api/v1/profile', 'api/profile'])
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Put()
  updateProfile(@Body() payload: UpdateProfileDto) {
    return this.profileService.updateProfile(payload);
  }
}
