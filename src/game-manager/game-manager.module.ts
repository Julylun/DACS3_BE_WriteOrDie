import { Module } from '@nestjs/common';
import { GameManagerService } from './game-manager.service';

@Module({
  providers: [GameManagerService],
  exports: [GameManagerService]
})
export class GameManagerModule {}
