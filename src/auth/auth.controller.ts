import { Body, Controller, Logger, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import RegisterDto from './dto/Register.dto';
import { log } from 'console';
import LoginDto from './dto/LoginDto';

@Controller('auth')
export class AuthController {
    private logger: Logger = new Logger(AuthController.name);
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        this.logger.debug('Registering...');
        let createdAccount = await this.authService.register(registerDto);
        if (!createdAccount) {
            this.logger.debug('Register failed');
        }
        this.logger.debug('Register successfully');
        this.logger.debug('Account info: ', createdAccount);
        return createdAccount;
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        this.logger.debug('Signing...');
        let loggedAccount = await this.authService.login(loginDto);
        if (!loggedAccount) {
            this.logger.debug('Login failed');
        }
        this.logger.debug('Login successfully');
        this.logger.debug('Account info: ', loggedAccount);
        return loggedAccount;
    }
    
    @Post('forget-password')
    async forgetPassword() {
        return '';
    }
}