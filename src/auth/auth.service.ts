import { Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
    private readonly logger: Logger = new Logger('AuthService');
    constructor(
        private playerService: PlayerService,
    ) { }


    generateAccessToken(payload) {
        return JsonWebToken.sign(payload, JwtConstants.secretKey, { expiresIn: '15d' })
    }

    generateRefreshToken(payload) {
        return JsonWebToken.sign(payload, JwtConstants.secretKey, { expiresIn: '15m' })
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
        let createdPlayer: Player | null = null;
        try {
            const hashedPassword = await AuthService.encodeString(registerDto.password);
            createdPlayer = await this.playerService.create({ playerEmail: registerDto.usermail, playerUserName: registerDto.username, playerPassword: hashedPassword })
        } catch (error) {
            throw error;
        }
        return createdPlayer;
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
