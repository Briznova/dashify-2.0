import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AnnouncementsController } from "./announcements.controller";
import { AnnouncementsService } from "./announcements.service";

@Module({
  imports: [AuthModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, PermissionsGuard],
})
export class AnnouncementsModule {}
