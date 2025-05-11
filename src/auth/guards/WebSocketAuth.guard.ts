
import {
    CanActivate,
    ExecutionContext,
    Injectable,
  } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Socket } from 'socket.io';
import WebsocketUnauthorizedExepction from 'src/exceptions/websocket-exceptions/websocket-unauthorized.exception';
  
  @Injectable()
  export class WebsocketAuthGaurd implements CanActivate {
    constructor(private authService: AuthService) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const client: Socket = context.switchToWs().getClient();
      const token = (client.handshake.auth.AccessToken) ? client.handshake.auth.accesstoken : client.handshake.headers.accesstoken;
      if (!token) {
        throw new WebsocketUnauthorizedExepction('Unauthorized: Missing access token,', undefined);
      }
      try {
        const payload = this.authService.verifyJwtToken(token);
        client['user'] = payload;
        return true;
      } catch {
        return true;
      }
    }
  }
  