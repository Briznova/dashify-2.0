import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { TeacherWorkspaceController } from "./teacher-workspace.controller";
import { TeacherWorkspaceService } from "./teacher-workspace.service";

@Module({
  imports: [AuthModule],
  controllers: [TeacherWorkspaceController],
  providers: [TeacherWorkspaceService, PermissionsGuard],
})
export class TeacherWorkspaceModule {}
