import { HttpException, Injectable, InternalServerErrorException, Logger, UnauthorizedException, UseFilters, UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { GameManagerService } from "src/game-manager/game-manager.service";
import CreateRoomDto from "./dto/createroom.dto";
import { AuthService } from "src/auth/auth.service";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { PlayerService } from "src/player/player.service";
import UserPayloadDto from "src/auth/dto/UserPayload.dto";
import JoinRoomDto from "./dto/joinroom.dto";
import ResponseData from "src/common/response.dto";
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
import { ApiTags, ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { SendAnswerDto, JudgeAnswersDto, GetAvailableRoomDto, GetGameStatusDto, LeaveGameRoomDto } from './dto/websocket.dtos';
import { RoomCreatedResponseDto, GameStatusResponseDto, BasicResponseDto } from './dto/response.dtos';
import SecretRoom from "./constants/message.constants";
import { RoomStatus } from "src/game-manager/enum/roomstatus.enum";
import Room from "src/game-manager/models/room.model";
import { elementAt } from "rxjs";

@ApiTags('Game Gateway')
@ApiExtraModels(
    CreateRoomDto,
    JoinRoomDto,
    JoinGameGateServiceDto,
    SendAnswerDto,
    JudgeAnswersDto,
    GetAvailableRoomDto,
    GetGameStatusDto,
    LeaveGameRoomDto,
    RoomCreatedResponseDto,
    GameStatusResponseDto,
    BasicResponseDto
)
@WebSocketGateway({
    cors: {
        origin: '*'
    }
})
@Injectable()
export class GameGateService implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer()
    private server: Server;

    private readonly logger = new Logger("GameGateService")
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


    // = = = = = = = ROOM  = = = = = = =



    @ApiOperation({ summary: 'Join game gate service' })
    @ApiResponse({ status: 200, description: 'Successfully joined game gate service', type: BasicResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired token' })
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

    @ApiOperation({ summary: 'Create a new game room' })
    @ApiResponse({ status: 200, description: 'Room created successfully', type: RoomCreatedResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired token' })
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
            const room: Room | undefined = this.gameManagerService.createRoom(OwnerPlayer, createRoomDto.maxPlayers, createRoomDto.gameMode ? createRoomDto.gameMode : 1)
            const roomId = room?.getRoomId();
            console.log(`Player ${OwnerPlayer.playerUUID} created a room - room id: ${roomId}`);

            const responseData = ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: { roomId: roomId, roomOwnerUUID: room?.getOwner().playerUUID } })
            client.emit(GameGateEvent.Notification.CreateGameRoom, responseData)
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.CreateGameRoom);
            else if (error instanceof WebsocketException) throw error
            else throw new WebsocketUnauthorizedExepction('Internal Server Error: An unknown error occured while executing user request', GameGateEvent.Notification.CreateGameRoom)
        }
    }

    @ApiOperation({ summary: 'Join an existing game room' })
    @ApiResponse({ status: 200, description: 'Successfully joined room', type: BasicResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired token' })
    @ApiResponse({ status: 404, description: 'Room not found or is full' })
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


            const currentRoom = this.gameManagerService.playerIsAtRoom(player);
            if (currentRoom) {
                // throw new WebsocketNotFoundException('Forbidden: Player joined a room before', GameGateEvent.Notification.JoinGameRoom)
            }
            //Join room and get room status to return to player.
            const roomData = this.gameManagerService.addPlayerToRoom(player, joinRoomDto.roomId);

            switch (roomData.roomStatus) {
                case AddPlayerToRoomStatus.NotExist: throw new WebsocketNotFoundException('Not Found: Room doesnt exist', GameGateEvent.Notification.JoinGameRoom)
                case AddPlayerToRoomStatus.RoomFull: throw new WebsocketNotFoundException('Not Found: Room is full', GameGateEvent.Notification.JoinGameRoom)
                case AddPlayerToRoomStatus.Successful: {
                    client.join(SecretRoom.getSecretRoom(joinRoomDto.roomId));
                    client.emit('JoinGameRoomEvent', ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: { currentPlayer: roomData.currentPlayer, maxPlayer: roomData.maxPlayer } }));
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

    @ApiOperation({ summary: 'Leave current game room' })
    @ApiResponse({ status: 200, description: 'Successfully left room', type: BasicResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired token' })
    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('LeaveGameRoom')
    async handleLeaveGameRoom(@MessageBody() leaveGameRoomDto: LeaveGameRoomDto, @ConnectedSocket() client: any) {
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


    @ApiOperation({ summary: 'Start the game in current room' })
    @ApiResponse({ status: 200, description: 'Game started successfully', type: BasicResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired token' })
    @ApiResponse({ status: 403, description: 'Forbidden - Not room owner' })
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
            if (!this.gameManagerService.isRoomOwner(player, currentRoom?.getRoomId())) throw new WebsocketForbiddenException('Forbidden: Player is not room ownwer', GameGateEvent.Notification.StartGame)
            const gameStory = await this.gameManagerService.startGame(currentRoom)

            this.logger.log(`[h-StartGame]`, `User ${client.id} started game at ${currentRoom?.getRoomId()} successfully!`)

            //Send a signal to clients to force them change GUI
            const data = {
                allowStart: true,
                timeCounting: 240,
                serverTime: new Date().toISOString(), //serverTime is used to reduce delay time between server and client,
                gameStory: gameStory
            }
            this.server.to(SecretRoom.getSecretRoom(currentRoom.getRoomId())).emit('InGame', ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: data }))
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
    @SubscribeMessage('GetStory')
    async handleGetStory(@MessageBody() getStoryDto: {}, @ConnectedSocket() client: any) {
        this.logger.log(`[h-GetStory]`, ` - User ${client.id} wants to get the game story.`)
        try {
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.StartGame)
            const playerPlayload = client.user as UserPayloadDto;
            const player = await this.playerService.findOneByUUID(playerPlayload.userUUID);
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: Player account doesnt exist');


            this.logger.debug(`[h-StartGame]`, `Getting user room location...`)
            const currentRoom = this.gameManagerService.playerIsAtRoom(player);
            this.logger.debug(`[h-StartGame]`, currentRoom)
            if (!currentRoom) throw new WebsocketNotFoundException('Not Found: Player is not at any room.', GameGateEvent.Notification.StartGame);

            client.emit('GetStoryEvent', ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: { story: currentRoom.getCurrentStory() } }))
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

    @ApiOperation({ summary: 'Send answer to current question' })
    @ApiResponse({ status: 200, description: 'Answer sent successfully', type: BasicResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired token' })
    @ApiResponse({ status: 403, description: 'Forbidden - Already sent answer or not in room' })
    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('SendAnswer')
    async handleSendAnswer(@MessageBody() sendAnswerDto: SendAnswerDto, @ConnectedSocket() client: any) {
        let requestSession = randomString.generate(10);
        this.logger.log(`[h-SendAnswer]`, ` - User ${client.id} sent the answer "${sendAnswerDto.answer}"`)
        try {
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.SendAnswer)
            const playerPlayload = client.user as UserPayloadDto;
            const player = await this.playerService.findOneByUUID(playerPlayload.userUUID);
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: Player account doesnt exist');

            const didSend = this.gameManagerService.addAnswer(player, sendAnswerDto.answer);


            if (!didSend) throw new WebsocketForbiddenException('Sent answer or user doesn\'t exist in the room', GameGateEvent.Notification.SendAnswer)


            //Judge answers
            const room = this.gameManagerService.playerIsAtRoom(player);
            if (room && this.gameManagerService.isEnoughAnswer(room)) {
                const answer: any = await this.gameManagerService.judgeAnswer(player);
                const resData = {
                    type: 'DieTime',
                    answer: answer.story
                }
                room.setRoomStatus(RoomStatus.DoneLevel);
                room.nextLevel();
                this.server.to(SecretRoom.getSecretRoom(room.getRoomId())).emit(GameGateEvent.InGame, ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: resData }))
            }
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

    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('NextLevel')
    async handleNextLevel(@MessageBody() judgeAnswersDto: JudgeAnswersDto, @ConnectedSocket() client: any) {
        this.logger.log(`[h-JudgeAnswers]`, ` - User ${client.id} wants to start the game.`)
        try {
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.InGame)
            const playerPlayload = client.user as UserPayloadDto;
            const player = await this.playerService.findOneByUUID(playerPlayload.userUUID);
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: Player account doesnt exist');


            const room = this.gameManagerService.playerIsAtRoom(player);
            if (room?.getStatus() != RoomStatus.DoneLevel) throw new WebsocketForbiddenException('Forbidden: Game status is Started', GameGateEvent.InGame);
            room.setRoomStatus(RoomStatus.Started)
            this.server.to(SecretRoom.getSecretRoom(room?.getRoomId())).emit(GameGateEvent.InGame, ResponseData.get({
                statusCode: 200,
                statusMessage: 'Ok',
                data: { type: 'NextLevel' }
            }))
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Token is wrong or expired', GameGateEvent.Notification.JudgeAnswers);
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', GameGateEvent.Notification.JudgeAnswers)
                _error.responseData = { detailError: error.message }
                throw _error
            }
        }
    }



    @ApiOperation({ summary: 'Judge answers in current game' })
    @ApiResponse({ status: 200, description: 'Answers judged successfully', type: BasicResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired token' })
    @ApiResponse({ status: 403, description: 'Forbidden - Not in game room' })
    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('JudgeAnswers')
    async handleJudgeAnswers(@MessageBody() judgeAnswersDto: JudgeAnswersDto, @ConnectedSocket() client: any) {
        this.logger.log(`[h-JudgeAnswers]`, ` - User ${client.id} wants to start the game.`)
        try {
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.JudgeAnswers)
            const playerPlayload = client.user as UserPayloadDto;
            const player = await this.playerService.findOneByUUID(playerPlayload.userUUID);
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: Player account doesnt exist');

            //TODO: Doing
            const answer = await this.gameManagerService.judgeAnswer(player);
            if (!answer) throw new WebsocketForbiddenException('Fobidden: Room doesn\'t exist or user did join any room.', GameGateEvent.Notification.JudgeAnswers);

            this.logger.debug(`[h-JudgeAnswers]`, answer);

            client.emit(GameGateEvent.Notification.JudgeAnswers, ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: answer }))
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Token is wrong or expired', GameGateEvent.Notification.JudgeAnswers);
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', GameGateEvent.Notification.JudgeAnswers)
                _error.responseData = { detailError: error.message }
                throw _error
            }
        }
    }

    @ApiOperation({ summary: 'Get available game rooms' })
    @ApiResponse({ status: 200, description: 'List of available rooms', type: GameStatusResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired token' })
    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('GetAvailableRoom')
    async handleGetAvailableRooms(@MessageBody() getAvailableRoomDto: GetAvailableRoomDto, @ConnectedSocket() client: any) {
        this.logger.log(`[h-GetAvailableRoom]`, ` - User ${client.id} is getting available room.`)
        try {
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.GetAvailableRoom)
            const playerPlayload = client.user as UserPayloadDto;
            const player = await this.playerService.findOneByUUID(playerPlayload.userUUID);
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: Player account doesnt exist');



            const rooms = this.gameManagerService.getRooms().map((element) => {
                return {
                    roomId: element.getRoomId(),
                    currentPlayer: element.getCurrentPlayer(),
                    maxPlayer: element.getMaxPlayer(),
                    owner: element.getOwner().playerUserName,
                    roomOwnerUUID: element.getOwner().playerUUID
                }
            })
            client.emit(GameGateEvent.Notification.GetAvailableRoom, ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: rooms }))
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Token is wrong or expired', GameGateEvent.Notification.GetAvailableRoom);
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', GameGateEvent.Notification.GetAvailableRoom)
                _error.responseData = { detailError: error.message }
                throw _error
            }
        }
    }


    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('GetRoomInfo')
    async handleGetRoomInformation(@MessageBody() getRoomInfoDto: { roomId: string }, @ConnectedSocket() client: any) {
        this.logger.log(`[h-GetAvailableRoom]`, ` - User ${client.id} is getting available room.`)
        try {
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.GetRoomInfo)
            const playerPlayload = client.user as UserPayloadDto;
            const player = await this.playerService.findOneByUUID(playerPlayload.userUUID);
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: Player account doesnt exist');


            const room = this.gameManagerService.getRooms().find(item => {
                return item.getRoomId() == getRoomInfoDto.roomId
            });

            if (!room) throw new WebsocketNotFoundException('NotFound: Room doenst exist', GameGateEvent.Notification.GetRoomInfo);

            client.emit(GameGateEvent.Notification.GetRoomInfo, ResponseData.get({
                statusCode: 200, statusMessage: 'Ok', data: {
                    roomId: room.getRoomId(),
                    currentPlayer: room.getCurrentPlayer(),
                    maxPlayer: room.getMaxPlayer(),
                    owner: room.getOwner().playerUserName,
                    roomOwnerUUID: room.getOwner().playerUUID
                }
            }))
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Token is wrong or expired', GameGateEvent.Notification.GetRoomInfo);
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', GameGateEvent.Notification.GetRoomInfo)
                _error.responseData = { detailError: error.message }
                throw _error
            }
        }
    }


    // = = = = = = CHAT = = = = = = =
    @UseFilters(WebsocketExceptionFilter)
    @UseGuards(WebsocketAuthGaurd)
    @SubscribeMessage('sendWaitingMessage')
    async handleSendMessage(@MessageBody() handleSendMessageDto: { message: string }, @ConnectedSocket() client: any) {
        this.logger.log(`[h-sendWaitingMessage]`, ` - User ${client.id} starts send message.`)
        try {
            if (!client.user) throw new WebsocketUnauthorizedExepction('Unauthorized: AccessToken is invalid or expired', GameGateEvent.Notification.SendWatingMessage)
            const playerPlayload = client.user as UserPayloadDto;
            const player = await this.playerService.findOneByUUID(playerPlayload.userUUID);
            if (!player) throw new WebsocketUnauthorizedExepction('Unauthorized: Player account doesnt exist');

            const room = this.gameManagerService.playerIsAtRoom(player);
            if (!room) throw new WebsocketNotFoundException('Not Found: Player didn\'t join any room', GameGateEvent.Notification.SendWatingMessage);

            const roomId = room.getRoomId();
            this.server.to(SecretRoom.getSecretRoom(roomId)).emit('waitingMessageEvent', ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: { sender: player.playerUUID, message: `${player.playerUserName}: ${handleSendMessageDto.message}` } }))
        } catch (error) {
            if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError)
                throw new WebsocketUnauthorizedExepction('Token is wrong or expired', GameGateEvent.Notification.SendWatingMessage);
            else if (error instanceof WebsocketException) throw error;
            else {
                let _error = new WebsocketInternalServerErrorException('Internal Server Error: Unknown error occured while executing user request', GameGateEvent.Notification.SendWatingMessage)
                _error.responseData = { detailError: error.message }
                throw _error
            }
        }
    }





    //DEBUGGGGGGGGGGGGGGG

    @ApiOperation({ summary: 'Get current game status' })
    @ApiResponse({ status: 200, description: 'Current game status', type: GameStatusResponseDto })
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

