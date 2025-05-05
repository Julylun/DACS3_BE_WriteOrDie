import { Test, TestingModule } from '@nestjs/testing';
import { GameGateService } from './game-gate.service';

describe('GameGateService', () => {
  let service: GameGateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameGateService],
    }).compile();

    service = module.get<GameGateService>(GameGateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
