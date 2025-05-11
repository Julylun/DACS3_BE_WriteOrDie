import { HttpException, Injectable, InternalServerErrorException, Logger, UnauthorizedException, UseFilters, UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
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
import WebsocketUnauthorizedExepction from "src/exceptions/websocket-exceptions/websocket-unauthorized.exception";
import WebsocketException from "src/exceptions/websocket-exceptions/abstract/websocket.exception";
import WebsocketInternalServerErrorException from "src/exceptions/websocket-exceptions/websocket-internalservererror.exception";
import WebsocketNotFoundException from "src/exceptions/websocket-exceptions/websocket-notfound.exception";
import { WebsocketExceptionFilter } from "src/filter/WebsocketException.filter";
import * as randomString from 'randomstring'
import { WebsocketAuthGaurd } from "src/auth/guards/WebSocketAuth.guard";
import { JoinGameGateServiceDto } from "./dto/joingamegateservice.dto";
import { AddPlayerToRoomStatus } from "src/game-manager/enum/add-player-to-room.enum";
import WebsocketForbiddenException from "src/exceptions/websocket-exceptions/websocket-forbidden.exception";
import { GameGateEvent } from "./events/gamegate.event";
import { send } from "process";


@WebSocketGateway({
    cors: {
        origin: '*'
    }
})
@Injectable()
export class GameGateService implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    private readonly logger = new Logger("GameGateService")
    private server: any;
    constructor(
        private gameManagerService: GameManagerService,
        private authService: AuthService,
        private playerService: PlayerService
    ) { }
    afterInit(server: any) {
        this.server = server;
    }

    handleConnection(client: any, ...args: any[]) {
        this.logger.debug('[handleConnection]', `Client <${client.id}> connected to GameGate`);
    }

    handleDisconnect(client: any) {
        this.logger.debug('[handleDisconnect]', `Client <${client.id}> has disconnected from GameGate. Removing online player starts...`)
        const isSuccessful = this.gameManagerService.removeOnlinePlayer(client);
        this.logger.debug('[handleDisconnect]', (isSuccessful) ? `Successful - Removed <${client.id}> from Online map.` : `Failed - <${client.id}> doesnt exist in Online map.`)
    }

    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('JoinGameGateService')
    async handleJoinGameGateService(@ConnectedSocket() client: any) {
        let requestSession = randomString.generate(5);
        this.logger.log(`[handleJoinGameGateService - ${requestSession}]`, `Client ${client.id} starts joining game gate service.`)
        try {
            //Authentication
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.JoinGameGateService)
            const playerPayload = client.user as UserPayloadDto;

            const UserUUID = playerPayload.userUUID;
            const player = await this.playerService.findOneByUUID(UserUUID);
            if (!player) throw new WebsocketNotFoundException('Not Found: Player account doesnt exist', GameGateEvent.Notification.JoinGameGateService);

            //Remove if player is online at another device/session
            this.gameManagerService.removeOnlinePlayer(client);
            this.gameManagerService.setOnlinePlayer(client, player);

            console.log(this.gameManagerService.isUserOnline(client))

            let responseData = ResponseData.get({ statusCode: 200, statusMessage: 'Ok' })
            client.emit(GameGateEvent.Notification.JoinGameGateService, responseData)
        } catch (error) {
            this.logger.error(error)
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError || error instanceof UnauthorizedException)
                throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.JoinGameGateService);
            else if (error instanceof WebsocketException) throw error
            else throw new WebsocketInternalServerErrorException('Internal Server Error: An unknown error occured while executing user request', GameGateEvent.Notification.JoinGameGateService)
        }
    }

    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('CreateGameRoom')
    async handleCreateRoom(@MessageBody() createRoomDto: CreateRoomDto, @ConnectedSocket() client: any) {
        try {
            //Authentication
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.CreateGameRoom)
            const ownerPayload = client.user as UserPayloadDto

            const OwnerPlayer = await this.playerService.findOneByUUID(ownerPayload.userUUID);
            if (!OwnerPlayer) throw new WebsocketNotFoundException('Not Found: Player account doesnt exist', GameGateEvent.Notification.CreateGameRoom);


            //Create room and get room Id to return to player
            const roomId = this.gameManagerService.createRoom(OwnerPlayer, createRoomDto.maxPlayers, createRoomDto.gameMode ? createRoomDto.gameMode : 1)
            console.log(`Player ${OwnerPlayer.playerUUID} created a room - room id: ${roomId}`);

            const responseData = ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: { roomId: roomId } })
            client.emit(GameGateEvent.Notification.CreateGameRoom, responseData)
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.CreateGameRoom);
            else if (error instanceof WebsocketException) throw error
            else throw new WebsocketUnauthorizedExepction('Internal Server Error: An unknown error occured while executing user request', GameGateEvent.Notification.CreateGameRoom)
        }
    }

    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('JoinGameRoom')
    async handleJoinGameRoom(@MessageBody() joinRoomDto: JoinRoomDto, @ConnectedSocket() client: any) {
        try {
            //Authentication
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: Token is invalid or expired', GameGateEvent.Notification.JoinGameRoom);
            const playerPayload = client.user as UserPayloadDto;

            this.logger.debug(`[h-JoinGameRoom]`, `User ${client.id} wants to join a room - room id: ${joinRoomDto.roomId}`);
            const player = await this.playerService.findOneByUUID(playerPayload.userUUID)
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: The user account doesnt exist', GameGateEvent.Notification.JoinGameRoom);



            //Join room and get room status to return to player.
            const JoinRoomStatus = this.gameManagerService.addPlayerToRoom(player, joinRoomDto.roomId)

            switch (JoinRoomStatus) {
                case AddPlayerToRoomStatus.NotExist: throw new WebsocketNotFoundException('Not Found: Room doesnt exist', GameGateEvent.Notification.JoinGameRoom)
                case AddPlayerToRoomStatus.RoomFull: throw new WebsocketNotFoundException('Not Found: Room is full', GameGateEvent.Notification.JoinGameRoom)
                case AddPlayerToRoomStatus.Successful: {
                    client.join(joinRoomDto.roomId);
                    client.emit('JoinGameRoomEvent', ResponseData.get({ statusCode: 200, statusMessage: 'Ok' }));
                    break;
                }
                default: throw new WebsocketInternalServerErrorException('Internal Server Error: An unknown error occured while joining room', GameGateEvent.Notification.JoinGameRoom)
            }
            this.logger.log(`[h-JoinGameRoom]`, `Player ${player.playerUUID} joined a room - room id: ${joinRoomDto.roomId}`);
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Token is wrong or expired', GameGateEvent.Notification.JoinGameRoom);
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', GameGateEvent.Notification.JoinGameRoom)
                _error.responseData = { detailError: error.message }
                throw _error
            }
        }
    }

    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('LeaveGameRoom')
    async handleLeaveGameRoom(@MessageBody() leaveGameRoomDto: {}, @ConnectedSocket() client: any) {
        try {
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: Token is invalid or expired', GameGateEvent.Notification.LeaveGameRoom);
            const playerPayload = client.user as UserPayloadDto;

            const player = await this.playerService.findOneByUUID(playerPayload.userUUID)
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: The user account doesnt exist', GameGateEvent.Notification.LeaveGameRoom);

            const playerCurrentRoom = this.gameManagerService.playerIsAtRoom(player);
            if (!playerCurrentRoom) throw new WebsocketNotFoundException('Not Found', 'Player didn\'t join any room');

            this.gameManagerService.removePlayerFromRoom(player, playerCurrentRoom.getRoomId());
            client.emit('LeaveGameRoom', ResponseData.get({ statusCode: 200, statusMessage: 'Ok' }))
            this.logger.log('[h-LeaveGameRoom]', `Player ${client.id} has leaved the room ${playerCurrentRoom.getRoomId()}`)
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Token is wrong or expired', GameGateEvent.Notification.LeaveGameRoom);
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', GameGateEvent.Notification.LeaveGameRoom)
                _error.responseData = { detailError: error.message }
                throw _error
            }
        }

    }


    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('StartGame')
    async handleStartGame(@MessageBody() startGameDto: {}, @ConnectedSocket() client: any) {
        let requestSession = randomString.generate(10);
        this.logger.log(`[h-StartGame]`, ` - User ${client.id} wants to start the game.`)
        try {
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.StartGame)
            const playerPlayload = client.user as UserPayloadDto;
            const player = await this.playerService.findOneByUUID(playerPlayload.userUUID);
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: Player account doesnt exist');


            this.logger.debug(`[h-StartGame]`, `Getting user room location...`)
            const currentRoom = this.gameManagerService.playerIsAtRoom(player);
            this.logger.debug(`[h-StartGame]`, currentRoom)
            if (!currentRoom) throw new WebsocketNotFoundException('Not Found: Player is not at any room.', GameGateEvent.Notification.StartGame);
            if (this.gameManagerService.isRoomOwner(player, currentRoom?.getRoomId())) throw new WebsocketForbiddenException('Forbidden: Player is not room ownwer', GameGateEvent.Notification.StartGame)
            this.gameManagerService.startGame(currentRoom)

            this.logger.log(`[h-StartGame]`, `User ${client.id} started game at ${currentRoom?.getRoomId()} successfully!`)
            //TODO: Send to clients started message
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Token is wrong or expired', GameGateEvent.Notification.StartGame);
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', GameGateEvent.Notification.StartGame)
                _error.responseData = { detailError: error.message }
                throw _error
            }
        }
    }

    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('SendAnswer')
    async handleSendAnswer(@MessageBody() sendAnswerDto: { answer: string }, @ConnectedSocket() client: any) {
        let requestSession = randomString.generate(10);
        this.logger.log(`[h-StartGame]`, ` - User ${client.id} wants to start the game.`)
        try {
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.SendAnswer)
            const playerPlayload = client.user as UserPayloadDto;
            const player = await this.playerService.findOneByUUID(playerPlayload.userUUID);
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: Player account doesnt exist');

            this.gameManagerService.addAnswer(player, sendAnswerDto.answer)
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Token is wrong or expired', GameGateEvent.Notification.SendAnswer);
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', GameGateEvent.Notification.SendAnswer)
                _error.responseData = { detailError: error.message }
                throw _error
            }
        }
    }





    //DEBUGGGGGGGGGGGGGGG

    @SubscribeMessage('GetGameStatus')
    async handleGetGameStatus(@ConnectedSocket() client: any) {
        try {
            const gameStatus = this.gameManagerService.getTotalStatus();
            client.emit('GetGameStatusEvent', ResponseData.get({
                statusCode: 200,
                statusMessage: 'Ok',
                data: gameStatus
            }));
        } catch (error) {

        }
    }

    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('whereuser')
    async whereDoesUserLocateAt(@MessageBody() startGameDto: { roomId: string }, @ConnectedSocket() client: any) {
        let requestSession = randomString.generate(10);
        this.logger.log(`[h-StartGame]`, ` - User ${client.id} wants to start the game.`)
        try {
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', 'debug')
            const playerPlayload = client.user as UserPayloadDto;
            const player = await this.playerService.findOneByUUID(playerPlayload.userUUID);
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: Player account doesnt exist', 'debug');

            const currentRoom = this.gameManagerService.playerIsAtRoom(player);
            this.logger.debug(currentRoom)
            if (!currentRoom) throw new WebsocketNotFoundException('Not Found: Player is not at any room.', 'debug');

            this.logger.log(`[h-StartGame]`, `User ${client.id} started game at ${currentRoom?.getRoomId()} successfully!`)
            //TODO: Send to clients started message
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Token is wrong or expired', 'debug');
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', 'debug')
                _error.responseData = { detailError: error.message }
                throw _error
            }
        }
    }

}

