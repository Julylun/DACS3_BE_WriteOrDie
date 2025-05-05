import { Injectable } from '@nestjs/common';


class Room {
    static OWNER_NULL = -1;

    private owner: string; //Chu phong
    private maxPlayer: number; //Gioi han so nguoi tham gia discord
    private currentPlayer: number; //So luong nguoi tham gia hien tai
    private players: Set<string>; //Danh sach id cua nguoi choi


    constructor() {
        this.players = new Set<string>();
    }

    addPlayers = (playerId: string) => {
        this.players.add(playerId);
    }

    removePlayers = (playerId: string) => {
        this.players.delete(playerId);
    }

    setOwner = (player: string) => {
        this.owner = player;
    }
}

@Injectable()
export class GameManagerService {
    readonly RoomManager = new Map<string, Room>();
    constructor() {
        
    }

    createRoom = (playerId: any, maxPlayer: any, gameMode: any) => {
        //TODO: create random id generator here
        this.RoomManager.set("randomId", new Room());

        return "roomId";
    }

    removeRoom = (roomId: string) => {
        this.RoomManager.delete("randomId");
    }

    addPlayerToRoom = (playerId: string, roomId: string) => {
        this.RoomManager.get(roomId)?.addPlayers(playerId);
    }

    removePlayerFromRoom = (playerId: string, roomId: string) => {
        this.RoomManager.get(roomId)?.removePlayers(playerId);
    }
}  
