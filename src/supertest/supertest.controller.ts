import { Controller, Get, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import ResponseError from 'src/llm/error/ResponseError.error';
import Gemini from 'src/llm/gemini.llm';
import InstructionPrompt from 'src/prompts/instruction.prompts';

@Controller('supertest')
export class SupertestController {
    constructor(
        private authService: AuthService
    ) {}
    @Get('vch')
    async test(){
        const gemini = new Gemini(InstructionPrompt.GenerateStoryPrompt())
        gemini.setRetries(3)
        let response;
        response = await gemini.getResponse('umg luon');
        if (!response) throw new InternalServerErrorException('Oh shiet');

        console.log(Gemini.responseToObject(response))
    }

    @Get('mail')
    async testMail() {
        this.authService.sendResgisterEmail('hoangluanhgl4@gmail.com', 'julylun', 'https://www.google.com')
    }
}
