import { Global, Module } from '@nestjs/common';
import { FitnessRepository } from './fitness.repository';
import { PrismaService } from './prisma.service';

@Global()
@Module({ providers: [PrismaService, FitnessRepository], exports: [FitnessRepository] })
export class DataAccessModule {}
