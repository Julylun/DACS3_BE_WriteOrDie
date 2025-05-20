
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Socket } from 'socket.io';
import WebsocketUnauthorizedExepction from 'src/exceptions/websocket-exceptions/websocket-unauthorized.exception';

@Injectable()
export class WebsocketAuthGaurd implements CanActivate {
  constructor(private authService: AuthService) { }
  private readonly logger = new Logger(WebsocketAuthGaurd.name)

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const authString: string = (client.handshake.auth.AccessToken) ? client.handshake.auth.accesstoken : (client.handshake.headers.authorization) ? client.handshake.headers.authorization : client.handshake.headers.accesstoken;
    // this.logger.debug('authString', authString.split(' '))
    if (!authString) throw new WebsocketUnauthorizedExepction('Unauthorized: Missing access token,', undefined);

    let token = (authString[0] == 'B') ? authString.split(' ')[1] : authString;
    // this.logger.debug('token', token)

    if (!token) throw new WebsocketUnauthorizedExepction('Unauthorized: Missing access token,', undefined);
    try {
      const payload = this.authService.verifyJwtToken(token);
      client['user'] = payload;
      return true;
    } catch {
      return true;
    }
  }
}
