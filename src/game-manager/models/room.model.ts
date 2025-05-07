import { Player } from "src/player/schemas/player.schema";

export default class Room {
    static OWNER_NULL = -1;

    private owner: Player; //Chu phong
    private maxPlayers: number; //Gioi han so nguoi tham gia discord
    private currentPlayers: number; //So luong nguoi tham gia hien tai
    private players: Set<Player>; //Danh sach id cua nguoi choi


    constructor(owner: Player, maxPlayers: number) {
        this.players = new Set<Player>();
        this.currentPlayers = 0;
        this.owner = owner;
        this.maxPlayers = maxPlayers;
    }

    addPlayers = (player: Player) => {
        this.players.add(player);
    }

    removePlayers = (player: Player) => {
        this.players.delete(player);
    }

    setOwner = (player: Player) => {
        this.owner = player;
    }
}