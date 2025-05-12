import { Logger } from "@nestjs/common";
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import JoinChatRoomDto from "./dto/joinchatroom.dto";


@WebSocketGateway({})
export class ChatService implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect{
    private readonly logger = new Logger(ChatService.name);
    @WebSocketServer() server: Server;
    constructor() {
        this.logger.debug('Initlize ChatService...')
    }
    
    handleConnection(client: any, ...args: any[]) {
        this.logger.log('[ChatService]:',`User ${client.id} has connected to the Chat server.`)
    }
    handleDisconnect(client: any) {
        this.logger.log('[ChatService]:',`User ${client.id} has disconnected from the Chat server.`)
    }
    
    afterInit(server: Socket) {
        this.logger.log('[Chat Websocket]','Initilize completely!')
    }
    private onlineUsersMap: Map<string, string> = new Map<string, string>();

    //Room chat
    @SubscribeMessage('joinChatRoom')
    handleRoomConnection(@MessageBody() joinChatRoomDto: JoinChatRoomDto, client: Socket) {
        console.log(`[ChatService]: User ${client.id} joined room ${joinChatRoomDto.roomId}`);

        client.join(joinChatRoomDto.roomId.toString());
        console.log(`[ChatService]: User ${client.id} joined room ${joinChatRoomDto.roomId}`);
    }

    @SubscribeMessage('messageChatRoom')
    handleRoomMessage(@MessageBody() {roomId, message}: {roomId: string, message: string}, client: Socket) {
        this.server.to(roomId).emit('chatRoom', {from: client.id, message});
        console.log(`[ChatService]: User ${client.id} sent to ${roomId} the message \"${message}\"`);
    }

    //Directly chat
    @SubscribeMessage('joinDirectlyChat')
    handleDirectlyChatConnection(@MessageBody() userId: string, client: Socket) {
        this.onlineUsersMap.set(userId, client.id);
        console.log(`User ${userId} joined with socket ID: ${client.id}`);
    }

    @SubscribeMessage('messageDirectlyChat')
    handleDirectlyChatMessage(@MessageBody() {userId, message}: {userId: string, message: string}, client: Socket) {
        const targetSocketId = this.onlineUsersMap.get(userId)

        if (targetSocketId) {
            this.server.to(targetSocketId).emit('chat', { from: client.id, message });
        }
    }

}
