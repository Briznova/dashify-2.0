import { Transform, Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";
import { SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ListSupportTicketsDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  cursor?: string;

  @ApiPropertyOptional({ enum: SupportTicketStatus })
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;
}

export class CreateSupportTicketDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ minLength: 1, maxLength: 4000 })
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  description!: string;

  @ApiPropertyOptional({ enum: SupportTicketPriority, default: "NORMAL" })
  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;
}

export const SUPPORT_ACTIONS = ["SET_STATUS", "SET_PRIORITY", "CLAIM", "RELEASE"] as const;
export type SupportAction = (typeof SUPPORT_ACTIONS)[number];

export class SupportTicketActionDto {
  @ApiProperty({ enum: SUPPORT_ACTIONS })
  @IsIn(SUPPORT_ACTIONS)
  action!: SupportAction;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ description: "Required for SET_STATUS and SET_PRIORITY; forbidden for CLAIM and RELEASE." })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  value?: string;
}
