import { Module } from '@nestjs/common';
import { SupertestController } from './supertest.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SupertestController]
})
export class SupertestModule { }
