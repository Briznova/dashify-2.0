import { Type } from 'class-transformer';
import { IsDefined, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateClassDto } from './create-class.dto';
import { CreateSectionDto } from './create-section.dto';

export class FirstSectionDto extends OmitType(CreateSectionDto, ['classId'] as const) {}

export class CreateClassWithSectionDto extends CreateClassDto {
  @ApiProperty({ type: FirstSectionDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => FirstSectionDto)
  section!: FirstSectionDto;
}
