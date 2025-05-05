import { Logger } from '@nestjs/common';
import { OnGatewayConnection, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway()
export class MessageGateway implements OnGatewayConnection{
  private readonly logger = new Logger(MessageGateway.name)
  handleConnection(client: any, ...args: any[]) {
    this.logger.debug('FUCKKKKKKKKKk')
  }
  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    return 'Hello world!';
  }
}
