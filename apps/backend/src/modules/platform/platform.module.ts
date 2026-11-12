import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { PlatformSchoolsController } from "./platform-schools.controller";
import { PlatformSchoolsService } from "./platform-schools.service";

@Module({
  imports: [AuthModule],
  controllers: [PlatformSchoolsController],
  providers: [PlatformSchoolsService, PermissionsGuard],
})
export class PlatformModule {}
