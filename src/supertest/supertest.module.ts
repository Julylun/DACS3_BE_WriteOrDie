import { Module } from '@nestjs/common';
import { SupertestController } from './supertest.controller';

@Module({
  controllers: [SupertestController]
})
export class SupertestModule {}
