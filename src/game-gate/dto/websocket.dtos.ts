import { ApiProperty } from '@nestjs/swagger';

export class SendAnswerDto {
    @ApiProperty({
        description: 'Player\'s answer to the current question',
        example: 'This is my answer'
    })
    answer: string;
}

export class JudgeAnswersDto {
    @ApiProperty({
        description: 'Empty object as no parameters are needed',
        example: {}
    })
    empty: Record<string, never>;
}

export class GetAvailableRoomDto {
    @ApiProperty({
        description: 'Empty object as no parameters are needed',
        example: {}
    })
    empty: Record<string, never>;
}

export class GetGameStatusDto {
    @ApiProperty({
        description: 'Empty object as no parameters are needed',
        example: {}
    })
    empty: Record<string, never>;
}

export class LeaveGameRoomDto {
    @ApiProperty({
        description: 'Empty object as no parameters are needed',
        example: {}
    })
    empty: Record<string, never>;
} 