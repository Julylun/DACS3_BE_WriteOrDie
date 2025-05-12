import { GoogleGenAI } from "@google/genai";
import { Logger } from "@nestjs/common";
import * as dotenv from 'dotenv';
import ResponseError from "./error/ResponseError.error";
import { response } from "express";
dotenv.config()

const GenerativeAI_1 = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY_1
})
const GenerativeAI_2 = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY_2
})

function extractJson(text: string | undefined): object | undefined {
    if(text == undefined) return undefined;
    const jsonRegex = /\{.*\}/s;
    const match = text.match(jsonRegex);

    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch (e) {
            console.error("Không thể parse JSON: ", e);
            return undefined;
        }
    }

    return undefined;
}

export default class Gemini {
    private logger = new Logger(Gemini.name)
    private instruction: string;
    private retries: number = 0
    private enableSecondLLM: boolean = false;
    // private history: any[];

    constructor(instruction: string, retries: number = 1, enableSecondLLM: boolean = false) {
        this.instruction = instruction;
        if(retries > 0) this.retries = retries
        else retries = 1
    }


    static responseToText = (response): string | undefined => {
        return (response) ? response.candidates[0].content.parts[0].text : undefined;
    }

    static responseToObject = (response): any => {
        const responseText: string | undefined = Gemini.responseToText(response);
        return (typeof responseText === 'string') ? extractJson(responseText) : undefined
    }

    setRetries = (retries: number) => {
        this.retries = retries;
    }

    private postPayloadToAi = async (ai: GoogleGenAI, prompt: string) => {
        let currentTryingTime = 0
        let response;
        while (currentTryingTime < this.retries) {
            try {
                response = await ai.models.generateContent({
                    model: process.env.LLM_MODEL as string,
                    contents: this.instruction + prompt
                })
                if (!response.candidates[0].content) throw new Error('Try again bro');
                else return response;
            } catch (error) {
                currentTryingTime += 1;
                this.logger.error(`${error.message}. Try again time ${currentTryingTime}...`)
            }
        }
        return undefined
    }

    getResponse = async (prompt: string) => {
        try {
            let response = await this.postPayloadToAi(GenerativeAI_1, prompt);

            if (!response && this.enableSecondLLM)
                this.logger.error('Something went wrong while geting resposne from AI server. Second LLM is enable, try again with second AI...')
            response = await this.postPayloadToAi(GenerativeAI_2, prompt);

            if (response.candidates[0].content)
                return response
            else throw Error('Missing candidates/content in AI response');
        } catch (error) {
            this.logger.error(error)
            return undefined;
        }
    }
}