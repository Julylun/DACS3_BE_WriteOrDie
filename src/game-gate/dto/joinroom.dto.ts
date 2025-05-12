import { ApiProperty } from '@nestjs/swagger';

export default class JoinRoomDto {
    @ApiProperty({
        description: 'Room ID to join',
        example: 'acxdfew'
    })
    roomId: string;
}