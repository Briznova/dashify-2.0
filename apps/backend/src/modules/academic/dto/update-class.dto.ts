import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsDefined, IsInt, Min } from 'class-validator';
import { CreateClassDto } from './create-class.dto';

export class UpdateClassDto extends PickType(CreateClassDto, ['name', 'code'] as const) {
  @ApiProperty({ minimum: 0 })
  @IsDefined()
  @IsInt()
  @Min(0)
  sortOrder!: number;
}
