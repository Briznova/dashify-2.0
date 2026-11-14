import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class StudentDirectorySearchDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(({ obj }) => obj.query)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @Transform(({ obj }) => obj.academicYearId)
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @Transform(({ obj }) => obj.classId)
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @Transform(({ obj }) => obj.sectionId)
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE"] })
  @Transform(({ obj }) => obj.status)
  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE"])
  status?: "ACTIVE" | "INACTIVE";

  @ApiPropertyOptional({ minimum: 1, maximum: 1000000, default: 1 })
  @Transform(({ obj }) => obj.page)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Transform(({ obj }) => obj.pageSize)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
