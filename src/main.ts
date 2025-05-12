import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import CreateRoomDto from './game-gate/dto/createroom.dto';
import JoinRoomDto from './game-gate/dto/joinroom.dto';
import { JoinGameGateServiceDto } from './game-gate/dto/joingamegateservice.dto';
import { SendAnswerDto, JudgeAnswersDto, GetAvailableRoomDto, GetGameStatusDto, LeaveGameRoomDto } from './game-gate/dto/websocket.dtos';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: process.env.NODE_ENV === 'production' ? ['log', 'warn', 'error'] : ['log', 'warn', 'error', 'debug'],
  });
  app.setGlobalPrefix('api/v1');
  app.enableCors();
  
  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Write or Die API')
    .setDescription('The Write or Die game API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Game Gateway', 'WebSocket endpoints for game functionality')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      // Add your DTOs here
      CreateRoomDto,
      JoinRoomDto,
      JoinGameGateServiceDto,
      SendAnswerDto,
      JudgeAnswersDto,
      GetAvailableRoomDto,
      GetGameStatusDto,
      LeaveGameRoomDto
    ]
  });
  SwaggerModule.setup('api/docs', app, document);
  
  // Serve static files from the 'public' directory
  app.useStaticAssets(join(__dirname, '..', 'public'));
  
  await app.listen(process.env.PORT ?? 7749);
}
bootstrap();
