import { Injectable, Logger } from "@nestjs/common";
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { GameManagerService } from "src/game-manager/game-manager.service";

@WebSocketGateway({
    cors: {
        origin: '*'
    }
})
@Injectable()
export class GameGateService implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger("GameGateService")
    constructor(
        private gameManagerService: GameManagerService
    ) { }

    handleConnection(client: any, ...args: any[]) {
        console.log('Player connected: ' + client.id);
    }

    handleDisconnect(client: any) {
        console.log('Player disconnected: ' + client.id);
    }

    @SubscribeMessage('createRoom')
    handleCreateRoom(@MessageBody() { playerId, gameMode, maxPlayer }: { playerId: string, gameMode: number, maxPlayer: number }, client: Socket) {
        const roomId = this.gameManagerService.createRoom(playerId, maxPlayer, gameMode)
        if (roomId != "-1") {
            this.gameManagerService.addPlayerToRoom(playerId, roomId);

            client.emit('Room_createRoomSuccessfully', 'Create room successfully!');
            console.log(`Player ${playerId} created a room - room id: ${roomId}`);
        } else {
            console.error(`Player ${playerId} failed while creating a room`);
            client.emit('Room_createRoomFailed', 'Create room failed')
        }
    }   
    
    @SubscribeMessage('joinRoom')
    handleJoinRoom(@MessageBody() { playerId, roomId }: { playerId: string, roomId: string }, client: Socket) {
        this.gameManagerService.addPlayerToRoom(playerId, roomId)
        console.log(`Player ${playerId} joined a room - room id: ${roomId}`);
    }
}

