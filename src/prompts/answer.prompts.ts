import GameAnswer from "src/game-manager/models/GameAnswer.class"
import Story from "src/game-manager/models/story.class";

export default class AnswerPromt {
    static StoryAnswerPrompt = (StoryNumber: number = 1, genre: string[] = ["random"], outputLanguage: string = "Vietnamese") => {
        return `<provision><story-number>${StoryNumber}</story-number><genre>${genre}</genre><output-language>${outputLanguage}</output-language></provision>`;
    }

    static JudgeAnswerPrompt = (answer: Array<GameAnswer>, story: Story | undefined) => {
        if(!story) return undefined;
        return `"""provision"""
        <provision><players>${answer.map(_answer => {
            return `<player><player-uuid>${_answer.player.playerUUID}<player-uuid><answer>${_answer.answer}</answer><name>${_answer.player.playerUserName}</name></player>`
        })}</players></provision>
        <story>${story.story}</story>
        <task>${story.task}</task>
        """`;
    }
}