import { Player } from "src/player/schemas/player.schema";
import { RoomStatus } from "../enum/roomstatus.enum";
import Game from "./game.model";
import { Logger } from "@nestjs/common";

export default class Room {
    static OWNER_NULL = -1;

    private roomId: string;
    private owner: Player; //Chu phong
    private maxPlayers: number; //Gioi haprin so nguoi tham gia discord
    private players: Set<Player>; //Danh sach id cua nguoi choi
    private game: Game | undefined;

    private roomStatus: RoomStatus

    private readonly logger = new Logger(Room.name);



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
        return (this.getCurrentPlayer() >= this.getMaxPlayer())
    }

    getCurrentPlayer = (): number => {
        return this.players.size
    }

    startGame = async () => {
        if (this.roomStatus == RoomStatus.Started) throw new Error('Game is started!');
        this.setRoomStatus(RoomStatus.Started)
        this.game = new Game(4, Array.from(this.players.values()))
        return await this.game.autoGenerateInstructions(4);

        this.logger.debug('[Room]','Initialized game story!')
    }

    addAnswer = (player: Player, answer: string) => {
        if(!this.game) {
            this.logger.error('[addAnswer]','Game doesnt initilize')
            return false
        };
        return this.game?.addAnswer(player, answer);
    }

    isEnoughAnswer = (): boolean => {
        this.logger.debug('isEnoughAnswer', this.game?.getAnswers().length + ' ' + this,this.getMaxPlayer())
        if(!this.game) return false;
        return this.game?.getAnswers().length >= this.game.players.length
    }

    judgeAnswer = (): undefined | object => {
        if (this.roomStatus == RoomStatus.Waiting || !this.game) return undefined;
        return this.game.judgeAnswer();
    }

    getCurrentStory = (): string => {
        const story = this.game?.instruction[this.game.currentLevel];
        return story?.story + ' Nhiem vu cua ban la: ' + story?.task;
    }

    nextLevel = (): boolean => {
        //TODO: check level condition
        const status = this.game?.nextLevel();
        if (status) return true;
        return false;
    }
}