import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
@Module({ imports: [AuthModule], controllers: [SchoolsController], providers: [SchoolsService, PermissionsGuard] })
export class SchoolsModule {}
