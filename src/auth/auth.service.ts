import { Injectable, Logger } from '@nestjs/common';
import { PlayerService } from 'src/player/player.service';
const bcrypt = require('bcryptjs');
import * as _bcrypt from 'bcrypt';
import { Player } from 'src/player/schemas/player.schema';
import RegisterDto from './dto/Register.dto';
import LoginDto from './dto/LoginDto';
import { privateDecrypt } from 'crypto';

@Injectable()
export class AuthService {
    private readonly logger: Logger = new Logger('AuthService');
    constructor(
        private playerService: PlayerService
    ) { }

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
            createdPlayer = await this.playerService.create({ playerUserName: registerDto.username, playerPassword: hashedPassword })
        } catch(error) {
            this.logger.error(error.message);
        }
        return createdPlayer;
    }

    async login(loginDto: LoginDto) {
        const foundAccount = await this.playerService.findOneByUsername(loginDto.username);
        try {
            if(!foundAccount) throw new Error('Account can not be found!');
            if(!(await AuthService.compareString(loginDto.password, foundAccount.playerPassword))) throw new Error('Wrong password');
            return foundAccount;
        } catch (error) {
            this.logger.error(error.message);
            return null;
        }
    }
}
