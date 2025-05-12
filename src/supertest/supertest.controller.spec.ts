import { Test, TestingModule } from '@nestjs/testing';
import { SupertestController } from './supertest.controller';

describe('SupertestController', () => {
  let controller: SupertestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupertestController],
    }).compile();

    controller = module.get<SupertestController>(SupertestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
