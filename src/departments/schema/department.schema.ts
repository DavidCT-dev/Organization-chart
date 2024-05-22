import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
export class Department extends Document {
  @Prop({ required: true, set: value => value.toUpperCase(), trim:true})
  name: string;

  @Prop({trim:true})
  description: string;

  @Prop({ type: mongoose.Schema.Types.String, ref: 'Department',default:'father' })
  parentDepartment: string; 

  @Prop({ type: [{ type: mongoose.Schema.Types.String, ref: 'Department' }] })
  childDepartments: string[];
   
  @Prop({ default:false })
  isDeleted: boolean;

  @Prop({ default:null })
  imageSvg: string;

  @Prop()
  idUser: string;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
