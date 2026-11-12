import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "joi";
import { LoggerModule } from "nestjs-pino";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./infrastructure/database/prisma.module";
import { HealthModule } from "./infrastructure/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { SchoolsModule } from "./modules/schools/schools.module";
import { AcademicModule } from "./modules/academic/academic.module";
import { StudentsModule } from "./modules/students/students.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AuditModule } from "./modules/audit/audit.module";
import { StaffModule } from "./modules/staff/staff.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AnnouncementsModule } from "./modules/announcements/announcements.module";
import { PlatformModule } from "./modules/platform/platform.module";
import { CsrfGuard } from "./common/guards/csrf.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid("development", "test", "production")
          .default("development"),
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        DIRECT_URL: Joi.string().required(),
        AUTH_ACCESS_TOKEN_SECRET: Joi.string().min(32).required(),
        AUTH_REFRESH_TOKEN_SECRET: Joi.string().min(32).required(),
        WEB_APP_ORIGIN: Joi.string().default("http://localhost:3000"),
        API_PREFIX: Joi.string().default("api/v1"),
        ACCESS_TOKEN_TTL_SECONDS: Joi.number().default(900),
        REFRESH_TOKEN_TTL_SECONDS: Joi.number().default(2592000),
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        redact: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers.x-csrf-token",
          "res.headers.set-cookie",
          "*.password",
          "*.passwordHash",
          "*.token",
          "*.accessToken",
          "*.refreshToken",
          "*.csrfToken",
        ],
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    SchoolsModule,
    AcademicModule,
    StudentsModule,
    AttendanceModule,
    StaffModule,
    DashboardModule,
    ReportsModule,
    AnnouncementsModule,
    PlatformModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
