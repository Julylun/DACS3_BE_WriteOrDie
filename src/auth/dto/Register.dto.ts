import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export default class RegisterDto {
    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsEmail()
    usermail: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}