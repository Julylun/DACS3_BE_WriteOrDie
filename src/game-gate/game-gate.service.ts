import { HttpException, Injectable, Logger, UnauthorizedException, UseFilters } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { GameManagerService } from "src/game-manager/game-manager.service";
import CreateRoomDto from "./dto/createroom.dto";
import { AuthService } from "src/auth/auth.service";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { PlayerService } from "src/player/player.service";
import UserPayloadDto from "src/auth/dto/UserPayload.dto";
import JoinRoomDto from "./dto/joinroom.dto";
import ResponseData from "src/common/response.dto";
import FastRes from "src/common/FastRes";
import WebsocketUnauthorizedEuxepction from "src/exceptions/websocket-exceptions/websocket-unauthorized.exception";
import WebsocketException from "src/exceptions/websocket-exceptions/abstract/websocket.exception";
import WebsocketInternalServerErrorException from "src/exceptions/websocket-exceptions/websocket-internalservererror.exception";
import WebsocketNotFoundException from "src/exceptions/websocket-exceptions/websocket-notfound.exception";
import { WebsocketExceptionFilter } from "src/filter/WebsocketException.filter";


@WebSocketGateway({
    cors: {
        origin: '*'
    }
})
@Injectable()
export class GameGateService implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger("GameGateService")
    constructor(
        private gameManagerService: GameManagerService,
        private authService: AuthService,
        private playerService: PlayerService
    ) { }

    handleConnection(client: any, ...args: any[]) {
        console.log('Player connected: ' + client.id);
    }

    handleDisconnect(client: any) {
        console.log('Player disconnected: ' + client.id);
    }

    @SubscribeMessage('createGameRoom')
    async handleCreateRoom(@MessageBody() createRoomDto: CreateRoomDto, @ConnectedSocket() client: any) {
        try {
            const ownerPayload = this.authService.verifyJwtToken(createRoomDto.accessToken) as { userUUID: string, username: string };
            const UserUUID = ownerPayload.userUUID;
            const OwnerPlayer = await this.playerService.findOneByUUID(UserUUID);
            if (!OwnerPlayer) throw new WebsocketNotFoundException('Not Found: Player account doesnt exist', 'CreateGameRoomEvent');


            const roomId = this.gameManagerService.createRoom(OwnerPlayer, createRoomDto.maxPlayers, createRoomDto.gameMode)
            console.log(`Player ${OwnerPlayer.playerUUID} created a room - room id: ${roomId}`);

            const responseData = ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: {roomId: roomId} })
            client.emit('CreateGameRoomEvent', responseData)
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedEuxepction('Unauthorized: AccessToken is invalid or expired', 'CreateGameRoomEvent');
            else if (error instanceof WebsocketException) throw error
            else throw new WebsocketUnauthorizedEuxepction('Internal Server Error: An unknown error occured while executing user request', 'CreateGameRoomEvent')
        }

    }

    @UseFilters(WebsocketExceptionFilter)
    @SubscribeMessage('JoinGameRoom')
    async handleJoinRoom(@MessageBody() joinRoomDto: JoinRoomDto, @ConnectedSocket() client: Socket) {
        try {
            this.logger.debug(`User ${client.id} wants to join a room - room id: ${joinRoomDto.roomId}`);
            const playerUUID = this.authService.verifyJwtToken(joinRoomDto.accessToken) as UserPayloadDto
            const player = await this.playerService.findOneByUUID(playerUUID.userUUID)
            if (!player) throw new WebsocketUnauthorizedEuxepction('Unauthorized: The user account doesnt exist', 'JoinGameRoomEvent');

            let addPlayerSuccesfully = this.gameManagerService.addPlayerToRoom(player, joinRoomDto.roomId)
            if (!addPlayerSuccesfully) throw new WebsocketNotFoundException('Not Found: Room doesnt exist', 'JoinGameRoomEvent');

            this.logger.log(`Player ${player.playerUUID} joined a room - room id: ${joinRoomDto.roomId}`);


        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedEuxepction('Token is wrong or expired', 'JoinGameRoomEvent');
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', 'JoinGameRoomEvent')
                _error.responseData = { detailError: error.message }
                throw _error
            }
        }
    }
}

