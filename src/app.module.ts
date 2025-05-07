import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlayerController } from './player/player.controller';
import { PlayerModule } from './player/player.module';
import { ChatModule } from './chat/chat.module';
import { GameGateModule } from './game-gate/game-gate.module';
import { GameManagerModule } from './game-manager/game-manager.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { GameManagerService } from './game-manager/game-manager.service';
import { AuthService } from './auth/auth.service';
import { MessageGateway } from './message/message.gateway';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filter/HttpException.filter';
import { SupertestModule } from './supertest/supertest.module';
import { WebsocketExceptionFilter } from './filter/WebsocketException.filter';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/writeordie'),
    PlayerModule, ChatModule, GameGateModule, GameManagerModule, AuthModule, SupertestModule
  ],
  controllers: [AppController, PlayerController, AuthController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: WebsocketExceptionFilter },
    AppService, AuthService, GameManagerService, MessageGateway
  ],
})
export class AppModule { }
