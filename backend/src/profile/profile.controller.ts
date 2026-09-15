import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/authenticated-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller(['api/v1/profile', 'api/profile'])
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Put()
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUserId() userId: string, @Body() payload: UpdateProfileDto) {
    return this.profileService.updateProfile(userId, payload);
  }
}
