import { Injectable, InternalServerErrorException, Logger, MethodNotAllowedException, UnauthorizedException } from '@nestjs/common';
import { PlayerService } from 'src/player/player.service';
const bcrypt = require('bcryptjs');
import * as _bcrypt from 'bcrypt';
import { Player } from 'src/player/schemas/player.schema';
import RegisterDto from './dto/Register.dto';
import LoginDto from './dto/LoginDto';
import { privateDecrypt } from 'crypto';
import { throws } from 'assert';
import * as JsonWebToken from 'jsonwebtoken'
import { JwtConstants } from './constants/jwt.constants';
import * as NodeMailer from 'nodemailer'
import * as dotenv from 'dotenv'
import MailData from './data/mail.data';
import ForgotPasswordDto from './dto/ForgotPassword.dto';

dotenv.config();

@Injectable()
export class AuthService {
    private mailTransporter: any
    private readonly logger: Logger = new Logger('AuthService');
    constructor(
        private playerService: PlayerService,
    ) {
        this.mailTransporter = NodeMailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.MAILER_ADDRESS,
                pass: process.env.MAILER_PASSWORD,
            },
        })
    }

    sendResetEmail = async (targetEmail: string, username: string, resetLink: string) => {
        const mailOptions = {
            from: '"WriteOrDie Team" <julylun.save@gmail.com>',
            to: targetEmail,
            subject: '[WriteOrDie] - Reset password for your account!',
            html: MailData.getResetMail(resetLink, username),
            attachments: [
                {
                    filename: 'devil_image.png',
                    path: './src/auth/data/devil_image.png',
                    cid: 'devil_image',
                },
            ]
        };
        await this.mailTransporter.sendMail(mailOptions);
    }

    sendResgisterEmail = async (targetEmail: string, username: string, activationHref: string) => {
        const mailOptions = {
            from: '"WriteOrDie Team" <julylun.save@gmail.com>',
            to: targetEmail,
            subject: '[WriteOrDie] - Activate your account!',
            html: MailData.getRegisterMail(activationHref, username),
            attachments: [
                {
                    filename: 'devil_image.png',
                    path: './src/auth/data/devil_image.png',
                    cid: 'devil_image',
                },
            ]
        };
        await this.mailTransporter.sendMail(mailOptions);
    }

    generateAccessToken(payload) {
        return JsonWebToken.sign(payload, JwtConstants.secretKey, { expiresIn: '15d' })
    }

    generateRefreshToken(payload) {
        return JsonWebToken.sign(payload, JwtConstants.secretKey, { expiresIn: '15m' })
    }

    generateRegisterToken(payload) {
        return JsonWebToken.sign(payload, JwtConstants.secretKey, { expiresIn: '1d' })
    }

    /**
     * 
     * @param payload 
     * @returns {userUUID: string, username: string}
     */
    verifyJwtToken(jwt: string) {
        try {
            const payload = JsonWebToken.verify(jwt, JwtConstants.secretKey)
            return payload;
        } catch (error) {
            if (error instanceof JsonWebToken.JsonWebTokenError) throw new UnauthorizedException('Token is invalid')
            else if (error instanceof JsonWebToken.TokenExpiredError) throw new UnauthorizedException('Token is expired');
            else throw new InternalServerErrorException('An error occured while verify jwt token');
        }
    }

    static async encodeString(unsecuredString: string) {
        const hashSalt = bcrypt.genSaltSync(10);
        const hashedString = await bcrypt.hash(unsecuredString, hashSalt)
        return hashedString;
    }

    static async compareString(unsecuredString: string, securedString: string) {
        return await bcrypt.compare(unsecuredString, securedString);
    }

    async register(registerDto: RegisterDto) {
        try {

            let player = await this.playerService.findOneByUsername(registerDto.username);
            if (player) throw new MethodNotAllowedException('Username exists')

            player = await this.playerService.findOneByEmail(registerDto.usermail);
            if (player) throw new MethodNotAllowedException('Email exists')

            const registerToken = this.generateRegisterToken({ username: registerDto.username, usermail: registerDto.usermail, password: registerDto.password });

            const activationLink = `http://localhost:${process.env.PORT ?? 7749}/api/v1/auth/verify?token=${registerToken}`
            await this.sendResgisterEmail(registerDto.usermail, registerDto.username, activationLink);
        } catch (error) {
            this.logger.error(error)
            throw error;
        }
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        try {

            console.log(forgotPasswordDto)
            let player: Player | null = await this.playerService.findOneByEmail(forgotPasswordDto.usermail)
            if (!player) throw new MethodNotAllowedException('Player doesnt exists')


            const forgotToken = this.generateRegisterToken({ userUUID: player.playerUUID, password: forgotPasswordDto.password });

            const resetLink = `http://localhost:${process.env.PORT ?? 7749}/api/v1/auth/reset?token=${forgotToken}`
            await this.sendResetEmail(forgotPasswordDto.usermail, player.playerUserName, resetLink);
        } catch (error) {
            this.logger.error(error)
            throw error;
        }
    }

    async changePassword(userUUID: string, password: string) {
        try {

            // let user = await this.playerService.findOneByUUID(userUUID)
            const hashedPassword = await AuthService.encodeString(password);

            const createdPlayer = this.playerService.changePassword(userUUID, hashedPassword);
            return createdPlayer;
        } catch (error) {
            this.logger.error(error)
            throw error;
        }
    }

    async createAccount(registerDto: RegisterDto) {
        let createdPlayer: Player | null = null;
        try {
            const hashedPassword = await AuthService.encodeString(registerDto.password);
            createdPlayer = await this.playerService.create({ playerEmail: registerDto.usermail, playerUserName: registerDto.username, playerPassword: hashedPassword })
            return createdPlayer;
        } catch (error) {
            this.logger.error(error)
            throw error;
        }
    }

    async login(loginDto: LoginDto) {
        const foundAccount = await this.playerService.findOneByUsername(loginDto.username);
        try {
            if (!foundAccount) throw new UnauthorizedException('Account doesnt exist');
            if (!(await AuthService.compareString(loginDto.password, foundAccount.playerPassword))) throw new UnauthorizedException('Wrong password');
            return foundAccount;
        } catch (error) {
            this.logger.error('login', error.message);
            throw error;
        }
    }
}
