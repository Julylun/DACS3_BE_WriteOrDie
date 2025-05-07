import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
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

    @SubscribeMessage('createRoom')
    async handleCreateRoom(@MessageBody() createRoomDto: CreateRoomDto, client: Socket) {
        try {
            const ownerPayload = this.authService.verifyJwtToken(createRoomDto.accessToken) as { userUUID: string, username: string };
            const UserUUID = ownerPayload.userUUID;
            const OwnerPlayer = await this.playerService.findOneByUUID(UserUUID);
            if (!OwnerPlayer) throw new Error('Player doesnt exist');

            const roomId = this.gameManagerService.createRoom(OwnerPlayer, createRoomDto.maxPlayers, createRoomDto.gameMode)
            if (roomId != "-1") {
                this.gameManagerService.addPlayerToRoom(OwnerPlayer, roomId);

                client.emit('Room_createRoomSuccessfully', 'Create room successfully!');
                console.log(`Player ${OwnerPlayer.playerUUID} created a room - room id: ${roomId}`);
            } else {
                console.error(`Player ${OwnerPlayer.playerUUID} failed while creating a room`);
                client.emit('Room_createRoomFailed', 'Create room failed')
            }
        } catch (error) {
            FastRes.sendSocketIo('createRoomNotification', ResponseData.get({ statusCode: 401, statusMessage: 'Unauthorized', }), client)
        }

    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(@MessageBody() joinRoomDto: JoinRoomDto, client: Socket) {
        try {
            const playerUUID = this.authService.verifyJwtToken(joinRoomDto.accessToken) as UserPayloadDto
            const player = await this.playerService.findOneByUUID(playerUUID.userUUID)
            if (!player) throw new UnauthorizedException('Unauthorized: The user account doesnt exist', 'joinRoomError');

            this.gameManagerService.addPlayerToRoom(player, joinRoomDto.roomId)

            console.log(`Player ${player.playerUUID} joined a room - room id: ${joinRoomDto.roomId}`);


        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedEuxepction('Token is wrong or expired', 'joinRoomError');
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', 'joinRoomError')
                _error.responseData = {detailError: error.message}
                throw _error
            }
        }
    }
}

