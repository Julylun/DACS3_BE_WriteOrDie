import { Module } from '@nestjs/common';
import { GameManagerService } from './game-manager.service';

@Module({
  providers: [GameManagerService]
})
export class GameManagerModule {}
