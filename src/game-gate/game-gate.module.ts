import { Module } from '@nestjs/common';
import { GameGateService } from './game-gate.service';
import { GameManagerModule } from 'src/game-manager/game-manager.module';
import { GameManagerService } from 'src/game-manager/game-manager.service';

@Module({
    imports: [GameManagerModule],
    providers:[GameGateService, GameManagerService]
})
export class GameGateModule {}
