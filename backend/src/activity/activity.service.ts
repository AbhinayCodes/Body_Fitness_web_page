import { Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { CreateActivitySummaryDto } from './dto/create-activity-summary.dto';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateActivitySummaryDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { key: 'prototype-user' } });
    return this.prisma.activitySummary.create({ data: { userId: user.id, ...payload, recordedAt: new Date(payload.recordedAt) } });
  }

  async list() {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { key: 'prototype-user' } });
    return this.prisma.activitySummary.findMany({ where: { userId: user.id }, orderBy: { recordedAt: 'desc' } });
  }
}
