import { Injectable, Logger } from '@nestjs/common';
import { Player } from 'src/player/schemas/player.schema';
import Room from './models/room.model';
// const randomString = require('randomstring');
import * as randomString from 'randomstring'
import { Socket } from 'socket.io';
import { RoomStatus } from './enum/roomstatus.enum';
import { GameGateService } from 'src/game-gate/game-gate.service';
import { AddPlayerToRoomStatus } from './enum/add-player-to-room.enum';
import GameAnswer from './models/GameAnswer.class';

@Injectable()
export class GameManagerService {
    static readonly RoomIdSet = new Set<string>();
    static readonly RoomManager = new Map<string, Room>();
    static readonly PlayerPositionManager = new Map<Player, Room>();
    static readonly OnlineUsers = new Map<Socket, Player>();
    static readonly _OnlineUsers = new Map<Player, Socket>()

    private readonly logger = new Logger(GameManagerService.name)

    constructor() {

    }



    //Online Map
    setOnlinePlayer = (client: Socket, player: Player) => {
        GameManagerService.OnlineUsers.set(client, player);
        GameManagerService._OnlineUsers.set(player, client);
    }

    removeOnlinePlayer(player: Player)
    removeOnlinePlayer(client: Socket)
    removeOnlinePlayer(param: any) {
        if (param instanceof Player) {
            let player = param as Player;
            let clientSocket = GameManagerService._OnlineUsers.get(player);
            if (clientSocket) {
                GameManagerService.OnlineUsers.delete(clientSocket);
                GameManagerService._OnlineUsers.delete(player);
                return true;
            }
            return false;
        } else if (param instanceof Socket) {
            let client = param as Socket
            let player = GameManagerService.OnlineUsers.get(client);
            if (player) {
                GameManagerService._OnlineUsers.delete(player)
                GameManagerService.OnlineUsers.delete(client);
                return true;
            }
            return false;
        } else throw new TypeError('Parameter must be Player or Socket')
    }

    getOnlinePlayer = (client: Socket): Player | undefined => {
        return GameManagerService.OnlineUsers.get(client);
    }

    getOnlinePlayerNumber = () => {
        return GameManagerService.OnlineUsers.size
    }

    isUserOnline(player: Player): boolean
    isUserOnline(client: Socket): boolean
    isUserOnline(param: any): boolean {
        if (param instanceof Socket) {
            return GameManagerService.OnlineUsers.has(param);
        }
        else if (param instanceof Player) {
            return GameManagerService._OnlineUsers.has(param);
        } else throw new TypeError('Parameter must be Player or Socket');
    }

    isEnoughAnswer(room: Room): boolean
    isEnoughAnswer(player: Player): boolean
    isEnoughAnswer(param: any): boolean {
        if (param instanceof Room) {
            return param.isEnoughAnswer();
        } else if (param instanceof Player) {
            const room = this.playerIsAtRoom(param);
            if (!room) return false;
            return room.isEnoughAnswer() ;
        } else throw Error("isEnoughAsnwer: Wrong param");
    }

    //Room Map
    async startGame(room: Room)
    async startGame(roomId: string)
    async startGame(room: any) {
        if (room instanceof Room) {
            return await room.startGame();
        }
        if (typeof room === 'string') {
            const _room = GameManagerService.RoomManager.get(room);
            return await _room?.startGame()
        }
        throw new Error('Wrong parameter type');
        //TODO: return value representing for error code
    }

    stopGame = (roomId: string) => {
        //TODO: return value representing for error code
        GameManagerService.RoomManager.get(roomId)?.setRoomStatus(RoomStatus.Waiting)
    }

    createRoom = (player: Player, maxPlayers: number, gameMode: any): Room | undefined => {
        let roomId = randomString.generate();
        while (GameManagerService.RoomIdSet.has(roomId)) {
            roomId = randomString.generate(5);
        }
        GameManagerService.RoomManager.set(roomId, new Room(player, maxPlayers, roomId));

        return GameManagerService.RoomManager.get(roomId);
    }

    removeRoom = (roomId: string) => {
        GameManagerService.RoomIdSet.delete(roomId)
        GameManagerService.RoomManager.delete(roomId);
    }

    addPlayerToRoom = (player: Player, roomId: string): any => {
        const room = GameManagerService.RoomManager.get(roomId);
        if (!room) return {roomStatus: AddPlayerToRoomStatus.NotExist};
        if (room.isFull()) return {roomStatus: AddPlayerToRoomStatus.RoomFull};
        
        room.addPlayers(player);
        GameManagerService.PlayerPositionManager.set(player, room);

        this.logger.log('[addPlayerToRoom]', `Added ${player.playerUserName} to the room ${room.getRoomId()}.`)
        this.logger.log(`[addPlayerToRoom]`, `<||Current Room status||> |Room id: ${room.getRoomId()}|  |player: ${room.getCurrentPlayer.length}/${room.getMaxPlayer()}|   |Room status: ${room.getStatus()}|`);
        return {roomStatus: AddPlayerToRoomStatus.Successful, currentPlayer: room.getCurrentPlayer(), maxPlayer: room.getMaxPlayer()};
    }

    removePlayerFromRoom = (player: Player, roomId: string) => {
        GameManagerService.RoomManager.get(roomId)?.removePlayers(player);
        GameManagerService.PlayerPositionManager.delete(player);
    }

    isRoomOwner = (player: Player, roomId): boolean => {
        const room = GameManagerService.RoomManager.get(roomId);
        if (!room) return false;
        return (player.playerUUID == room.getOwner().playerUUID);
    }

    getAllPlayerSocket = (roomId: string): Socket[] | undefined => {
        const room = GameManagerService.RoomManager.get(roomId);
        if (!room) return undefined;

        const players = room.getPlayers();
        const sockets = Socket[players.size]

        let pos: number = 0;
        players.forEach(element => {
            sockets[pos] = GameManagerService._OnlineUsers.get(element);
            pos += 1;
        })
        return sockets;
    }

    playerIsAtRoom = (player: Player): Room | undefined => {
        let _player: Player | undefined = undefined;
        Array.from(GameManagerService.PlayerPositionManager.keys()).forEach(element => {
            if (element.playerUUID == player.playerUUID) {
                _player = element;
                return;
            }
        })

        if (!_player) return undefined;
        return GameManagerService.PlayerPositionManager.get(_player);
    }

    getTotalStatus = () => {
        return {
            rooms: {
                total: GameManagerService.RoomIdSet.size,
                list: Array.from(GameManagerService.RoomIdSet),
                details: Array.from(GameManagerService.RoomManager.entries()).map(([id, room]) => ({
                    id,
                    owner: room.getOwner().playerUserName,
                    maxPlayers: room.getMaxPlayer(),
                    currentPlayers: room.getCurrentPlayer(),
                    status: room.getStatus()
                }))
            },
            players: {
                total: GameManagerService.OnlineUsers.size,
                list: Array.from(GameManagerService.OnlineUsers.entries()).map(([socket, player]) => ({
                    socketId: socket.id,
                    playerName: player.playerUserName,
                    playerUUID: player.playerUUID
                }))
            },
            playerPositions: Array.from(GameManagerService.PlayerPositionManager.entries()).map(([player, room]) => ({
                playerName: player.playerUserName,
                playerUUID: player.playerUUID,
                roomId: room.getRoomId()
            }))
        }
    }


    getRooms = (): Array<Room> => {
        return Array.from(GameManagerService.RoomManager.values());
    }


    //In-Game
    addAnswer = (player: Player, answer: string) => {
        const room = this.playerIsAtRoom(player)
        if (!room || room.getStatus() == RoomStatus.Waiting) {
            this.logger.error('[addAnswer]',`room is not started or doesn\'t exist`)
            return false;
        }

        return room.addAnswer(player, answer);;
    }

    judgeAnswer = (player: Player): undefined | object => {
        const room = this.playerIsAtRoom(player)

        if (!room) return undefined;
        return room.judgeAnswer();
    }

    nextLevel = (room: Room): boolean => {
        return room.nextLevel();
    }

    //Room notify
    notifyRoom = (roomId: string, event: string, message: string) => {
        const sockets = this.getAllPlayerSocket(roomId)
        sockets?.forEach(element => {
            element.emit(event, message)
        })
    }
}  
