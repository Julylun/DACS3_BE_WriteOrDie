import { IsNotEmpty, IsString } from "class-validator";

export default class LoginDto {
    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}