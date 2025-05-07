import { Module } from '@nestjs/common';
import { GameGateService } from './game-gate.service';
import { GameManagerModule } from 'src/game-manager/game-manager.module';
import { GameManagerService } from 'src/game-manager/game-manager.service';
import { AuthModule } from 'src/auth/auth.module';
import { PlayerModule } from 'src/player/player.module';

@Module({
    imports: [GameManagerModule, AuthModule, PlayerModule],
    providers:[GameGateService, GameManagerService]
})
export class GameGateModule {}
