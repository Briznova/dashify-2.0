import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { PlatformSchoolsController } from "./platform-schools.controller";
import { PlatformSchoolsService } from "./platform-schools.service";
import { PlatformAuditController } from "./platform-audit.controller";
import { PlatformAuditService } from "./platform-audit.service";
import { PlatformSettingsController } from "./platform-settings.controller";
import { PlatformSupportController } from "./platform-support.controller";
import { PlatformSupportService } from "./platform-support.service";
import { PlatformSupportRetentionService } from "./platform-support-retention.service";
import { SchoolAdminController } from "./school-admin.controller";
import { SchoolAdminService } from "./school-admin.service";

@Module({
  imports: [AuthModule],
  controllers: [PlatformSchoolsController, SchoolAdminController, PlatformAuditController, PlatformSettingsController, PlatformSupportController],
  providers: [PlatformSchoolsService, SchoolAdminService, PlatformAuditService, PlatformSupportService, PlatformSupportRetentionService, PermissionsGuard],
})
export class PlatformModule {}
