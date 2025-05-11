import { Player } from "src/player/schemas/player.schema";
import { RoomStatus } from "../enum/roomstatus.enum";
import Game from "./game.model";

export default class Room {
    static OWNER_NULL = -1;

    private roomId: string;
    private owner: Player; //Chu phong
    private maxPlayers: number; //Gioi haprin so nguoi tham gia discord
    private players: Set<Player>; //Danh sach id cua nguoi choi
    private game: Game | undefined;

    private roomStatus: RoomStatus



    constructor(owner: Player, maxPlayers: number, roomId: string) {
        this.players = new Set<Player>();
        this.roomId = roomId
        this.owner = owner;
        this.maxPlayers = maxPlayers;
        this.roomStatus = RoomStatus.Waiting;
        this.game = undefined;

    }

    getRoomId = (): string => {
        return this.roomId;
    }

    getMaxPlayer = (): number => {
        return this.maxPlayers;
    }

    addPlayers = (player: Player) => {
        this.players.add(player);
    }

    removePlayers = (player: Player) => {
        this.players.delete(player);
    }

    getPlayers = () => {
        return this.players;
    }

    setOwner = (player: Player) => {
        this.owner = player;
    }

    getOwner = (): Player => {
        return this.owner
    }

    getStatus = (): RoomStatus => {
        return this.roomStatus;
    }

    setRoomStatus = (romeStatus: RoomStatus) => {
        this.roomStatus = romeStatus;
    }

    isFull(): boolean {
        return (this.players.size >= this.maxPlayers)
    }

    getCurrentPlayer = (): number => {
        return this.players.size
    }

    startGame = () => {
        if (this.roomStatus == RoomStatus.Started) throw new Error('Game is started!');
        this.setRoomStatus(RoomStatus.Started)
        this.game = new Game(4, Array.from(this.players.values()))
        this.game.autoGenerateInstructions(4);
    }

    addAnswer = (player: Player, answer: string) => {
        if(!this.game) return false;
        return this.game?.addAnswer(player, answer);
    }

    judgeAnswer = () => {
        this.game?.judgeAnswer();
    }
}