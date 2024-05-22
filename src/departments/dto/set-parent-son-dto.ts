import { PartialType } from '@nestjs/mapped-types';
import { CreateDepartmentDto } from './create-department.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ParentSonDepartmentDto {
  @ApiProperty()
  idParent:string

  @ApiProperty()
  idChild:string
}
