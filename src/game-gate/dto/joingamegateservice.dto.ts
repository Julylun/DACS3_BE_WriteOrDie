import { ApiProperty } from '@nestjs/swagger';

export class JoinGameGateServiceDto {
    @ApiProperty({
        description: 'set access token in header at accesstoken field instead of | JWT access token for authentication',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    accessToken: string
}