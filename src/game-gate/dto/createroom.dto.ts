import { ApiProperty } from '@nestjs/swagger';

export default class CreateRoomDto {
    @ApiProperty({
        description: 'comming soon',
        example: 1,
        default: 1
    })
    gameMode: number;

    @ApiProperty({
        description: 'Maximum number of players allowed in the room',
        example: 4,
        minimum: 1,
        maximum: 10
    })
    maxPlayers: number
}