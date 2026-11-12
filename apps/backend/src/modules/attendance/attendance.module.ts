import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
@Module({ imports: [AuthModule], controllers: [AttendanceController], providers: [AttendanceService, PermissionsGuard] })
export class AttendanceModule {}
