import { IsNotEmpty, IsString } from "class-validator";

export default class RegisterDto {
    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}