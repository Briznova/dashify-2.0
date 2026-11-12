import { Controller, Get, Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('live') live(): { status: string } { return { status: 'ok' }; }
  @Get('ready') async ready(): Promise<{ status: string }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ready' };
  }
}
@Module({ controllers: [HealthController] })
export class HealthModule {}
