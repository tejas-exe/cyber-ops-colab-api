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
    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage("sent-message")
  async handeleMessage(client: Socket, payload: any) {
    try {
      await this.chatService.saveMessage(payload.text, payload.authorId, payload.workSpaceId);
      this.server.emit("received-message", payload);
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
