import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Department } from './schema/department.schema';
import { FilterQuery, Model } from 'mongoose';
import { FilterParentDto } from './dto/filter.organigrama.dto';
import { create } from 'svg.js';
import { ParentSonDepartmentDto } from './dto/set-parent-son-dto';
// import { treeData } from './tree-data'; 


@Injectable()
export class DepartmentsService {

  constructor(
    @InjectModel(Department.name) private departmentModel: Model<Department>,

  ){}

  async create(createDepartmentDto: CreateDepartmentDto) {
    return await this.departmentModel.create(createDepartmentDto);
  }

  async findAll(params: FilterParentDto, ) {
    const filters: FilterQuery<Department> = {isDeleted:false};
  
    const { name, parentDepartment } = params;
    if (params) {
      if (parentDepartment) {
        filters.parentDepartment = {
          $regex: parentDepartment,
          $options: "i",
        };
      }
      if (name) {
        filters.name = {
          $regex: name,
          $options: "i",
        };
      }
    }
  
    const departments = await this.departmentModel.find(filters,).exec();
  
    const data = departments.map(department => {
      const departmentData: any = {
        _id: department._id,
        name: department.name,
        description: department.description,
      };
  
      if (department.imageSvg) {
        const svgBinary = Buffer.from(department.imageSvg, 'base64');
        const svgText = svgBinary.toString('utf-8');
        departmentData.imageSvg = svgText;
      }
      return departmentData;
    });
  
    return data;
  }

  async findOne(id: string) {
    const department = await this.departmentModel.findOne({_id:id, isDeleted:false});
    if(!department){
      throw new HttpException('departamento/unidad no encotrado',404)
    }
    return {
      _id:department._id,
      name:department.name,
      description:department.description,
    }
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    const department = await this.departmentModel.findOne({_id:id, isDeleted:false});
    if(!department){
      throw new HttpException('departamento/unidad no encotrado',404)
    }
    return await this.departmentModel.findByIdAndUpdate(id,updateDepartmentDto,{new:true});
  }

  async remove(id: string) {
    const department = await this.departmentModel.findOne({_id:id, isDeleted:false});
    if(!department){
      throw new HttpException('departamento/unidad no encotrado',404)
    }
    
    if(department.childDepartments.length == 0){
      console.log('ingresa')
      department.isDeleted = true
      department.save()
      return true
    }

    const populatedDepartment = await this.populateChildrenWithSubchildren(department);
  
    populatedDepartment.childDepartments.forEach((subdepartment) => {
      this.updateDepartmentParams(subdepartment);
    });

    department.childDepartments=[]
    department.parentDepartment='father'
    department.isDeleted = true
    department.save()

    return true

  }

  async updateDepartmentParams(subdepartment) {
    subdepartment.parentDepartment = "father";
  
    subdepartment.childDepartments.forEach((child) => {
      this.updateDepartmentParams(child);
    });
    subdepartment.childDepartments = [];
    await subdepartment.save()

  }


  async setParentDepartment(setParentSonObject:ParentSonDepartmentDto ) {
    const {idParent, idChild} = setParentSonObject
    
    const childDepartment = await this.departmentModel.findOne({_id:idChild.toLocaleUpperCase().trim(), isDeleted:false});
    const parentDepartment = await this.departmentModel.findOne({_id:idParent.toLocaleUpperCase().trim(),isDeleted:false});

    if (!childDepartment || !parentDepartment) {
      throw new HttpException('departamento/unidad padre o hijo no encotrado',HttpStatus.CONFLICT);
    }

    if (childDepartment._id === parentDepartment._id) {
      throw new HttpException('departamento padre y departamento hijo no pueden ser el mismo',HttpStatus.CONFLICT);
    }

    childDepartment.parentDepartment = parentDepartment._id;
    parentDepartment.childDepartments.push(childDepartment._id);
    await Promise.all([
      childDepartment.save(),
      parentDepartment.save(),
    ]);
    return parentDepartment.populate('childDepartments')
  }


  async getLevelChilds(parentDepartmentId: string, param?) {
    const department = await this.departmentModel.findOne({_id:parentDepartmentId, isDeleted:false});
    if (!department) {
      throw new HttpException('departamento/unidad no encotrado',404);
    }
    const populatedDepartment = await this.populateChildrenWithSubchildren(department);
    
    const maxCounts: number[] = [];
    this.calculateChildrenSum(populatedDepartment, 0, maxCounts);
    const numberOfLevels = maxCounts.length;

    if(param.level){
      if (param.level < 1 || param.level > numberOfLevels) {
        throw new HttpException('Nivel especificado no válido', 400);
      }
      const childrenOfLevel = this.findChildrenByLevels(populatedDepartment, param.level);
      
      return childrenOfLevel
    }
    

    // const lastChild = await this.findLastChild(populatedDepartment);

    return populatedDepartment
  }

  findChildrenByLevels(department, level) {
    if (level == 1) {
      return [{
        _id: department._id,
        name: department.name
      }];
    }
  
    let childrenOfLevel: any[] = [];
  
    for (const childDepartment of department.childDepartments) {
      const childLevel = this.findChildrenByLevels(childDepartment, level - 1);
      childrenOfLevel = childrenOfLevel.concat(childLevel);
    }
  
    return childrenOfLevel;
  }






  // async findLastChild(department) {
  //   if (!department.childDepartments || department.childDepartments.length === 0) {
  //     return [{
  //       _id:department._id,
  //       name:department.name
  //     }];
  //   } else {
  //     const lastChildrenNamesPromises = department.childDepartments.map(async (child) => {
  //       const lastChildNames = await this.findLastChild(child);
  //       return lastChildNames;
  //     });
  
  //     const lastChildrenNames = await Promise.all(lastChildrenNamesPromises);
  //     return lastChildrenNames.flat();
  //   }
  // }



  // Ordenar el organigrama poniendo a cada padre sus respectivos hijos

  async getFatherChild(parentDepartmentId: string){
    const department = await this.departmentModel.findOne({_id:parentDepartmentId,isDeleted:false});
    if (!department) {
      throw new HttpException('departamento/unidad no encotrado',404);
    }
    const populatedDepartment = await this.populateChildrenWithSubchildren(department);
    
    const parentChildren = await this.getSecondaryDepartments(populatedDepartment)
    return parentChildren
  }


  getSecondaryDepartments(department) {
    const secondaryDepartments = [];
  
    if (department.childDepartments && department.childDepartments.length > 0) {
      const childrenNames = department.childDepartments.map(child => child.name);
      secondaryDepartments.push({
        parent: department.name,
        child: childrenNames,
      });
  
      for (const child of department.childDepartments) {
        secondaryDepartments.push(...this.getSecondaryDepartments(child));
      }
    }
  
    return secondaryDepartments;
  }
  
  
  
  
  
  







  
 

  async generateSvgAndConvertToBase64(_id: string) {

    const department = await this.departmentModel.findOne({_id});
     console.log(department.childDepartments)
    if (!department) {
      throw new HttpException('departamento no encotrado',404)
    }
    
    if (department.childDepartments === undefined || department.childDepartments.length == 0) {
      throw new HttpException('el departamento no tiene subramas ingrese algunos',409)
    }

    const populatedDepartment = await this.populateChildrenWithSubchildren(department);
    
    const maxCounts: number[] = [];
    this.calculateChildrenSum(populatedDepartment, 0, maxCounts);
    const maxChildCount = Math.max(...maxCounts);
    const numberOfLevels = maxCounts.length;

    
    const svgWidth = maxChildCount * 350 ;
    const svgHeight = numberOfLevels * 130;

    const svgHeader = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;
    const svgFooter = '</svg>';

    const chart = this.drawNode(populatedDepartment, svgWidth / 2, 50,50,50);
    // const chart = this.drawNode(populatedDepartment, 400, 40,10,0);
    const fullSvg = svgHeader + chart + svgFooter;


  const base64Svg = Buffer.from(fullSvg).toString('base64');
  console.log(base64Svg)

  const childDepartmentIds = populatedDepartment.childDepartments.map(child => child._id.toString());

  department.childDepartments = childDepartmentIds;
  department.imageSvg = base64Svg
  await department.save()

  return department;
  }

  
  private drawNode(node, x, y, horizontalSpacing, verticalSpacing) {
    const connectorHeight = 40; 
    const fontSize = 12; 
    const textPadding = 10; 
    const minWidth = 180; 

    const text = node.name;
    const textWidth = text.length * (fontSize / 2); 

    const nodeWidth = Math.max(textWidth + 2 * textPadding, minWidth); 
    const nodeHeight = 80;

    const rectSvg = `<rect x="${x - nodeWidth / 2}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" fill="#EFEFEF" stroke="#333333" />`;
    const textSvg = `<text x="${x}" y="${y + nodeHeight / 2}" font-size="${fontSize}" text-anchor="middle" alignment-baseline="middle">
                        <tspan x="${x}" dy="0">${text}</tspan>
                    </text>`;

    let connectorsSvg = '';
    if (node.childDepartments && node.childDepartments.length > 0) {
        const connectorY = y + nodeHeight;
        const childCount = node.childDepartments.length;

        const totalChildWidth = childCount * (nodeWidth + horizontalSpacing) - horizontalSpacing;
        const startX = x - totalChildWidth / 2 + nodeWidth / 2;

        let xOffset = startX;

        connectorsSvg = node.childDepartments
            .map((child) => {
                const childY = connectorY + connectorHeight;
                const childX = xOffset;

                const connectorMidX = (x + childX) / 2;
                const connectorMidY = y + nodeHeight + verticalSpacing / 2;

                const connectorSvg = `<path d="M${x},${y + nodeHeight} Q${connectorMidX},${connectorMidY} ${childX},${childY}" stroke="#FFD700" stroke-width="2" fill="transparent" />`;

                const childSvg = this.drawNode(child, childX, childY, horizontalSpacing, verticalSpacing);

                xOffset += nodeWidth + horizontalSpacing;

                return connectorSvg + childSvg;
            })
            .join('');
    }

    return rectSvg + textSvg + connectorsSvg;
}















































//   private drawNode(node, x, y, horizontalSpacing, verticalSpacing,w?,) {
//     const nodeWidth = 180; // Ajusta este valor según tus necesidades
//     const nodeHeight = 80; // Ajusta este valor según tus necesidades
//     const connectorHeight = 40; // Ajusta este valor según tus necesidades

//     const text = node.name;
//     const textWidth = text.length * 10; // Ajusta este factor para tu fuente

//     const rectSvg = `<rect x="${x - nodeWidth / 2}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" fill="#EFEFEF" stroke="#333333" />`;
//     const textSvg = `<text x="${x}" y="${y + nodeHeight / 2}" text-anchor="middle" alignment-baseline="middle">
//                         <tspan x="${x}" dy="0">${text}</tspan>
//                     </text>`;

//     let connectorsSvg = '';
//     if (node.childDepartments && node.childDepartments.length > 0) {
//         const connectorY = y + nodeHeight + connectorHeight;
//         const childCount = node.childDepartments.length;

//         const totalChildWidth = childCount * (nodeWidth + horizontalSpacing) - horizontalSpacing;
//         const startX = x - totalChildWidth / 2 + nodeWidth / 2;

//         let xOffset = startX;

//         connectorsSvg = node.childDepartments
//             .map((child) => {
//                 const childSvg = this.drawNode(child, xOffset, connectorY, horizontalSpacing, verticalSpacing);
//                 const connectorSvg = `<line x1="${x}" y1="${y + nodeHeight}" x2="${xOffset}" y2="${connectorY}" stroke="#333333" />`;

//                 xOffset += nodeWidth + horizontalSpacing;

//                 return childSvg + connectorSvg;
//             })
//             .join('');
//     }

//     return rectSvg + textSvg + connectorsSvg;
// }























  

  async calculateChildrenSum(department: any, level: number, sumCounts: number[]) {
    if (!sumCounts[level]) {
      sumCounts[level] = 0;
    }
    
    sumCounts[level] += department.childDepartments.length;
  
    for (const childDepartment of department.childDepartments) {
      this.calculateChildrenSum(childDepartment, level + 1, sumCounts);
    }
  }


  async populateChildrenWithSubchildren(department) {
    if (!department.childDepartments || department.childDepartments.length === 0 ) {
      return department;
    }
    const populatedChildren = [];
  
    for (const childId of department.childDepartments) {
      const child = await this.departmentModel.findById(childId); 
      if (child && !child.isDeleted) {
        const populatedChild = await this.populateChildrenWithSubchildren(child); 
        populatedChildren.push(populatedChild);
      }
    }
    department.childDepartments = populatedChildren;
  
    return department;
  }

  
  
}

