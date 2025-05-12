import { Player } from "src/player/schemas/player.schema";

export default class GameAnswer {
    player: Player
    answer: string
    constructor(player: Player, answer: string) {
        this.player = player;
        this.answer = answer
    }
}