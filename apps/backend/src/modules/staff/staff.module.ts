import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { StaffController } from "./staff.controller";
import { StaffService } from "./staff.service";

@Module({
  imports: [AuthModule],
  controllers: [StaffController],
  providers: [StaffService, PermissionsGuard],
})
export class StaffModule {}
