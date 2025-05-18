import { Body, Controller, Get, HttpException, InternalServerErrorException, Logger, Post, Query, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import RegisterDto from './dto/Register.dto';
import LoginDto from './dto/LoginDto';
import { Player } from 'src/player/schemas/player.schema';
import ResponseData from 'src/common/response.dto';
import { response, Response } from 'express';
import FastRes from 'src/common/FastRes';
import ForgotPasswordDto from './dto/ForgotPassword.dto';

@Controller('auth')
export class AuthController {
    private logger: Logger = new Logger(AuthController.name);
    constructor(
        private authService: AuthService,
    ) { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto, @Res() response: Response) {
        this.logger.debug('Registering...');
        try {
            //TODO: send email to player with a registering link. If user click on that link, account will be created.
            await this.authService.register(registerDto);
            this.logger.debug('send activation link successfully');
            // createdAccount = await this.authService.register(registerDto);
            // if (!createdAccount) {
            //     this.logger.debug('Register failed');
            //     throw new InternalServerErrorException();
            // }
            // this.logger.debug('Account info: ', createdAccount);

            // return ResponseData.get({ statusCode: 200, statusMessage: 'Ok' });
            FastRes.sendHttp(response, ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: {} }))
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException(error, 'An unknown error occured while creating account.');
        }
    }

    @Get('verify')
    async createAccount(@Query('token') token: string) {
        try {
            const payload: any = this.authService.verifyJwtToken(token);

            const createdAccount = await this.authService.createAccount({ username: payload.username, usermail: payload.usermail, password: payload.password })
            if (!createdAccount) throw Error('Unknown error');

            return `Hiiiiiii ${createdAccount.playerUserName}, you created account successfully! Welcome to Write Or Die!`
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException(error, 'An unknown error occured while creating account.');
        }
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Res() response: Response) {
        try {
            this.logger.debug('Signing...');
            let loggedAccount = await this.authService.login(loginDto);
            const dataPack = {
                accessToken: this.authService.generateAccessToken({ userUUID: loggedAccount.playerUUID, userName: loggedAccount.playerUserName }),
                refreshToken: this.authService.generateRefreshToken({ userUUID: loggedAccount.playerUUID, userName: loggedAccount.playerUserName })
            }
            this.logger.debug('Login successfully');
            this.logger.debug('Account info: ', loggedAccount);

            const responseData = ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: dataPack })

            FastRes.sendHttp(response, responseData)
        } catch (error) {
            if (error instanceof HttpException) throw error;
            else throw new InternalServerErrorException('Unkown error');
        }
    }

    @Post('forgot')
    async forgetPassword(@Body() forgotPasswordDto: ForgotPasswordDto, @Res() response: Response) {
        try {
            await this.authService.forgotPassword(forgotPasswordDto);
            this.logger.debug('send reset link successfully');

            FastRes.sendHttp(response, ResponseData.get({ statusCode: 200, statusMessage: 'Ok', data: {} }))
        } catch (error) {
            if (error instanceof HttpException) throw error;
            else throw new InternalServerErrorException('Unkown error');
        }
    }

    @Get('reset')
    async changePassword(@Query('token') token: string) {
        try {
            const payload: any = this.authService.verifyJwtToken(token);

            const createdAccount = await this.authService.changePassword(payload.userUUID, payload.password);
            if (!createdAccount) throw Error('Unknown error');

            return `Hiiiiiii ${createdAccount.playerUserName}, you reset password for your account successfully!`
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException(error, 'An unknown error occured while creating account.');
        }
    }
}