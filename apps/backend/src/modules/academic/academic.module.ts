import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
@Module({ imports: [AuthModule], controllers: [AcademicController], providers: [AcademicService, PermissionsGuard] })
export class AcademicModule {}
