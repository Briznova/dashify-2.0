import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsDefined, IsInt, Min, ValidateIf } from 'class-validator';
import { CreateSectionDto } from './create-section.dto';

export class UpdateSectionDto extends PickType(CreateSectionDto, ['name', 'code'] as const) {
  @ApiProperty({ type: Number, nullable: true, minimum: 1 })
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsDefined()
  @IsInt()
  @Min(1)
  capacity!: number | null;
}
