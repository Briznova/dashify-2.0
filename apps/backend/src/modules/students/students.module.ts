import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
@Module({ imports: [AuthModule], controllers: [StudentsController], providers: [StudentsService, PermissionsGuard] })
export class StudentsModule {}
