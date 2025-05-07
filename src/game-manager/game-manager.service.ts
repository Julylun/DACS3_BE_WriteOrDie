import { Injectable } from '@nestjs/common';
import { Player } from 'src/player/schemas/player.schema';
import Room from './models/room.model';
// const randomString = require('randomstring');
import * as randomString from 'randomstring'

@Injectable()
export class GameManagerService {
    static readonly RoomIdSet = new Set<string>();
    static readonly RoomManager = new Map<string, Room>();
    static readonly OnlineUsers = new Map<string, Player>(); 

    constructor() {
        
    }

    createRoom = (player: Player, maxPlayers: number, gameMode: any) => {
        //TODO: create random id generator here
        let roomId = randomString.generate();
        while(GameManagerService.RoomIdSet.has(roomId)) {
            roomId = randomString.generate(5);
        }
        GameManagerService.RoomManager.set("randomId", new Room(player,maxPlayers,));

        return roomId;
    }

    removeRoom = (roomId: string) => {
        GameManagerService.RoomManager.delete("randomId");
    }

    addPlayerToRoom = (player: Player, roomId: string) => {
        if (GameManagerService.RoomManager.has(roomId)) {
            GameManagerService.RoomManager.get(roomId)?.addPlayers(player);
            return true;
        }
        return false;
    }

    removePlayerFromRoom = (player: Player, roomId: string) => {
        GameManagerService.RoomManager.get(roomId)?.removePlayers(player);
    }
}  
