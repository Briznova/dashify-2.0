import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

class StudentResultDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ minimum: 0, type: Number })
  @IsInt()
  @Min(0)
  score!: number;

  @ApiProperty({ maxLength: 2000, required: false })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}

export class SaveResultsDto {
  @ApiProperty({ type: [StudentResultDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StudentResultDto)
  records!: StudentResultDto[];
}
