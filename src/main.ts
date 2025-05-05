import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
  logger: process.env.NODE_ENV === 'production' ? ['log', 'warn', 'error'] : ['log', 'warn', 'error', 'debug'],
  
});
  // app.setGlobalPrefix('api/v1');
  // app.useWebSocketAdapter(new WsAdapter(app))
  app.enableCors();
  await app.listen(process.env.PORT ?? 7749);
}
bootstrap();
