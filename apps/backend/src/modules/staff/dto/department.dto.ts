import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { Equals, IsString, Length, ValidateIf } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class CreateDepartmentDto {
  @ApiProperty({ minLength: 1, maxLength: 80 })
  @Transform(trim) @IsString() @Length(1, 80)
  name!: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @Transform(trim) @ValidateIf((_object, value: unknown) => value !== undefined) @IsString() @Length(1, 80)
  name?: string;

  @ApiPropertyOptional({ enum: [false] })
  @ValidateIf((_object, value: unknown) => value !== undefined) @Equals(false)
  isActive?: false;
}
