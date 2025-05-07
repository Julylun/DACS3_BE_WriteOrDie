import { Body, Controller, HttpException, InternalServerErrorException, Logger, Post, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import RegisterDto from './dto/Register.dto';
import LoginDto from './dto/LoginDto';
import { Player } from 'src/player/schemas/player.schema';
import ResponseData from 'src/common/response.dto';
import { Response } from 'express';
import FastRes from 'src/common/FastRes';

@Controller('auth')
export class AuthController {
    private logger: Logger = new Logger(AuthController.name);
    constructor(
        private authService: AuthService,
    ) { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        this.logger.debug('Registering...');
        let createdAccount: Player;
        try {
            createdAccount = await this.authService.register(registerDto);
            if (!createdAccount) {
                this.logger.debug('Register failed');
                throw new InternalServerErrorException();
            }
            this.logger.debug('Register successfully');
            this.logger.debug('Account info: ', createdAccount);

            return ResponseData.get({ statusCode: 200, statusMessage: 'Ok' });
        } catch (error) {
            throw new InternalServerErrorException(error, 'An unknown error occured while creating account.');
        }
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Res() response: Response) {
        try {
            this.logger.debug('Signing...');
            let loggedAccount = await this.authService.login(loginDto);
            const dataPack = {
                accessToken: this.authService.generateAccessToken({userUUID: loggedAccount.playerUUID, userName: loggedAccount.playerUserName}),
                refreshToken: this.authService.generateRefreshToken({userUUID: loggedAccount.playerUUID, userName: loggedAccount.playerUserName})
            }
            this.logger.debug('Login successfully');
            this.logger.debug('Account info: ', loggedAccount);

            const responseData = ResponseData.get({statusCode: 200, statusMessage: 'Ok', data: dataPack})
            
            FastRes.sendHttp(response,responseData)
        } catch (error) {
            if (error instanceof HttpException) throw error;
            else throw new InternalServerErrorException('Unkown error');
        }
    }

    @Post('forget-password')
    async forgetPassword() {
        return '';
    }
}