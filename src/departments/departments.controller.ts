import { Controller, Get, Post, Body, Param, Delete, Put, Query, Req } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { ApiBearerAuth, ApiQuery,  ApiTags } from '@nestjs/swagger';
import { FilterParentDto } from './dto/filter.organigrama.dto';
import { ParentSonDepartmentDto } from './dto/set-parent-son-dto';
import { FilterLevelsDto } from './dto/levels.departaments.dto';
import { Request } from 'express';

@ApiTags('departamentos/unidades')
@Controller('api/departments/')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @ApiQuery({ name: 'name', description: 'ingrese el nombre por el cual desea filtrar el departamento', required: false })
  @ApiQuery({ name: 'parentDepartment', description: 'lista todos los padres', required: false, enum:['father'] })
  @Get('departments')
  findAll(@Query() params:FilterParentDto, @Req() req:Request) {
    return this.departmentsService.findAll(params);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @ApiQuery({ name: 'level', description: 'nivel del organigrama', required: false,type:Number })
  @Get('levels-child/:parentId')
  async getLastChildDepartment(@Param('parentId') parentId: string, @Query() param?:FilterLevelsDto) {
    return this.departmentsService.getLevelChilds(parentId,param);
  }

  @Get('father-child/:parentId')
  async getfatherChildDepartment(@Param('parentId') parentId: string) {
    return this.departmentsService.getFatherChild(parentId);
  }

  @Get(':id/svg')
  async generateSvg(@Param('id') id: string) {
    return await this.departmentsService.generateSvgAndConvertToBase64(id);
  }


  @Post()
  create(@Body() createDepartmentDto: CreateDepartmentDto,@Req() req:Request) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Put(':id/update')
  update(@Param('id') id: string, @Body() updateDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }


  @Put('set-parent-child')
  async setParentDepartment(@Body() setParentSonObject: ParentSonDepartmentDto) {
    return this.departmentsService.setParentDepartment(setParentSonObject);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.departmentsService.remove(id);
    return { message:'eliminado correctamente' }
  }
}
