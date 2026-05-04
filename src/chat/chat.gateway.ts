import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { MessageService } from 'src/message/message.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  }
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;
  constructor(private readonly chatService: MessageService) { }
  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    client.rooms.forEach(room => {
      if (room !== client.id) {
        client.leave(room);
        console.log(`Client ${client.id} left room ${room}`);
      }
    });
  }

  @SubscribeMessage("join-room")
  async hangelClientRoomJoin(client: Socket, payload: any) {
    client.join(payload.workSpaceId);
    client.emit('joined-room', { workSpaceId: `room-${payload.workSpaceId}` });
  }

  @SubscribeMessage("leave-room")
  async hangelClientRoomLeave(client: Socket, payload: any) {
    client.leave(payload.workSpaceId);
    client.emit('left-room', { workSpaceId: `room-${payload.workSpaceId}` });
  }

  @SubscribeMessage("sent-message")
  async handeleMessage(client: Socket, payload: any) {
    try {
      await this.chatService.saveMessage(payload.text, payload.authorId, payload.workSpaceId);
      this.server.to(`room-${payload.workSpaceId}`).emit("received-message", payload);
    } catch (error) {
      console.error("Error in handeleMessage:", error);
    }
  }
  @SubscribeMessage("retrive-message")
  async loadMessages(client: Socket, payload: any) {
    try {
      const messages = await this.chatService.getMessages(payload.workSpaceId);
      client.emit("all-messages", messages);
    } catch (error) {
      console.error("Error in loadMessages:", error);
    }
  }
}
