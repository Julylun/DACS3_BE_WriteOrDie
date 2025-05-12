import { ApiProperty } from '@nestjs/swagger';

export class RoomCreatedResponseDto {
    @ApiProperty({ description: 'Status code of the response', example: 200 })
    statusCode: number;

    @ApiProperty({ description: 'Status message', example: 'Ok' })
    statusMessage: string;

    @ApiProperty({
        description: 'Created room data',
        example: { roomId: 'room123' }
    })
    data: { roomId: string };
}

export class GameStatusResponseDto {
    @ApiProperty({ description: 'Status code of the response', example: 200 })
    statusCode: number;

    @ApiProperty({ description: 'Status message', example: 'Ok' })
    statusMessage: string;

    @ApiProperty({
        description: 'Game status data',
        example: { rooms: [], onlinePlayers: 0 }
    })
    data: { rooms: any[]; onlinePlayers: number };
}

export class BasicResponseDto {
    @ApiProperty({ description: 'Status code of the response', example: 200 })
    statusCode: number;

    @ApiProperty({ description: 'Status message', example: 'Ok' })
    statusMessage: string;
} 