import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export const PLATFORM_AUDIT_ACTIONS = [
  "PLATFORM_ADMIN_BOOTSTRAPPED",
  "PLATFORM_PERMISSION_GRANTED",
  "PLATFORM_SCHOOL_DIRECTORY_READ",
  "PLATFORM_SCHOOL_DETAIL_READ",
  "PLATFORM_SCHOOL_CREATED",
  "PLATFORM_SCHOOL_ADMIN_CREATED",
  "PLATFORM_AUDIT_READ",
  "PLATFORM_SETTINGS_READ",
  "PLATFORM_SUPPORT_CREATED",
  "PLATFORM_SUPPORT_UPDATED",
  "PLATFORM_SUPPORT_RETENTION_CLEANUP",
] as const;
export type PlatformAuditAction = (typeof PLATFORM_AUDIT_ACTIONS)[number];

export class ListPlatformAuditDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @IsOptional()
  @ApiPropertyOptional({ maxLength: 256 })
  @IsString()
  @MaxLength(256)
  cursor?: string;

  @IsOptional()
  @ApiPropertyOptional({ enum: PLATFORM_AUDIT_ACTIONS })
  @IsIn(PLATFORM_AUDIT_ACTIONS)
  action?: PlatformAuditAction;

  @IsOptional()
  @ApiPropertyOptional({ description: "Inclusive UTC timestamp, e.g. 2026-01-01T00:00:00Z" })
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/)
  from?: string;

  @IsOptional()
  @ApiPropertyOptional({ description: "Inclusive UTC timestamp, e.g. 2026-01-31T23:59:59Z" })
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/)
  to?: string;
}
