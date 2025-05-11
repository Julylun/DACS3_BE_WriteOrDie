import { Player } from "src/player/schemas/player.schema"
import * as randomString from 'randomstring'
import Gemini from "src/llm/gemini.llm"
import InstructionPrompt from "src/prompts/instruction.prompts"
import AnswerPromt from "src/prompts/answer.prompts"
import { InternalServerErrorException, Logger } from "@nestjs/common"
import GameAnswer from "./GameAnswer.class"



const LLMService = {
    StoryGenerator: new Gemini(InstructionPrompt.GenerateStoryPrompt()),
    Judge: new Gemini(InstructionPrompt.JudgeAnswerPrompt())
}

class Story {
    story: string;
    task: string
}

export default class Game {
    private readonly logger = new Logger(Game.name)
    readonly GameId: string;
    readonly MaxLevel: number;

    instruction: Story[];
    answers: Array<GameAnswer>;

    currentLevel: number;
    players: Player[]
    alives: Player[]

    constructor(maxLevel: number, players: Player[]) {
        this.GameId = randomString.generate(4);
        this.MaxLevel = (maxLevel >= 0 && maxLevel <= 10) ? maxLevel : -1;
        if(this.MaxLevel == -1) throw new Error('Max level must be bigger than 0 and smaller than 10.');

        this.players = players;
        this.alives = players;
        this.answers = new Array<GameAnswer>();
    }

    nextLevel = (): boolean => {
        if(this.currentLevel >= this.MaxLevel) return false;
        this.answers = new Array<GameAnswer>();
        this.currentLevel += 1;
        return true;
    }

    autoGenerateInstructions = async (numberOfInstructions: number, genre: string[] = ["random"]) => {
        let response = await LLMService.StoryGenerator.getResponse(AnswerPromt.StoryAnswerPrompt(numberOfInstructions,genre));
        if(response) this.instruction = Gemini.responseToObject(response).stories as Story[];
        else throw Error('Can\'t generate instruction.')
    }

    addAnswer = (player: Player, answer: string): boolean => {
        let isDuplicated = false;
        this.answers.forEach(element => {
            if (element.player == player) {isDuplicated = true; return}
        })
        
        if(isDuplicated) return false;
        this.answers.push(new GameAnswer(player, answer));
        return true;
    }

    judgeAnswer = async () => {
        const response = await LLMService.Judge.getResponse(AnswerPromt.JudgeAnswerPrompt(this.answers))
        const responseObject = Gemini.responseToObject(response);

        this.logger.debug(responseObject)

        responseObject.forEach(element => {
            console.log(element)
        })
    }
}