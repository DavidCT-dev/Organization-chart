import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { DepartmentsModule } from './departments/departments.module';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';


@Module({
  imports: [
    MongooseModule.forRoot('mongodb://127.0.0.1/',
    {
      dbName:'organigrama'
    }),
    DepartmentsModule,
    HttpModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
