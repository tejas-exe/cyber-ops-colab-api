import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { MessageService } from 'src/message/message.service';

/**
 * WebSocket Gateway for handling real-time chat functionality.
 * Manages connections, room joining/leaving, and message broadcasting.
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  /**
   * Reference to the WebSocket server instance.
   */
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: MessageService) { }

  /**
   * Triggered when a new client connects to the WebSocket server.
   * @param client The socket instance of the connected client.
   */
  handleConnection(client: Socket) { }

  /**
   * Triggered when a client disconnects from the WebSocket server.
   * Ensures the client leaves all joined rooms.
   * @param client The socket instance of the disconnected client.
   */
  handleDisconnect(client: Socket) {
    client.rooms.forEach(room => {
      if (room !== client.id) {
        client.leave(room);
        console.log(`Client ${client.id} left room ${room}`);
      }
    });
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  /**
   * Handles the 'join-room' event.
   * Allows a client to join a specific workspace room.
   * @param client The socket instance of the client.
   * @param payload Contains the workSpaceId to join.
   */
  @SubscribeMessage("join-room")
  async hangelClientRoomJoin(client: Socket, payload: any) {
    client.join(`room-${payload.workSpaceId}`);
    client.emit('joined-room', { workSpaceId: `${payload.workSpaceId}` });
  }

  /**
   * Handles the 'leave-room' event.
   * Allows a client to leave a specific workspace room.
   * @param client The socket instance of the client.
   * @param payload Contains the workSpaceId to leave.
   */
  @SubscribeMessage("leave-room")
  async hangelClientRoomLeave(client: Socket, payload: any) {
    client.leave(`room-${payload.workSpaceId}`)
    client.emit('left-room', { workSpaceId: `room-${payload.workSpaceId}` });
  }

  /**
   * Handles 'sent-message' event.
   * Saves the message to the database and broadcasts it to all clients in the workspace room.
   * @param client The socket instance of the client sending the message.
   * @param payload Contains message text, authorId, and workSpaceId.
   */
  @SubscribeMessage("sent-message")
  async handeleMessage(client: Socket, payload: any) {
    try {
      await this.chatService.saveMessage(payload.text, payload.authorId, payload.workSpaceId);
      this.server.to(`room-${payload.workSpaceId}`).emit("received-message", payload);
    } catch (error) {
      console.error("Error in handeleMessage:", error);
    }
  }

  /**
   * Handles 'retrive-message' event.
   * Fetches message history for a workspace and sends it back to the requesting client.
   * @param client The socket instance of the client requesting messages.
   * @param payload Contains the workSpaceId.
   */
  @SubscribeMessage("retrive-message")
  async loadMessages(client: Socket, payload: any) {
    try {
      const messages = await this.chatService.getMessages(payload.workSpaceId);
      client.emit("all-messages", messages);
    } catch (error) {
      console.error("Error in loadMessages:", error);
    }
  }
  // ── Video ──────────────────────────────────────────────────────────────────
  /**
   * Handles the 'join-room' event.
   * Allows a client to join a specific workspace room.
   * @param client The socket instance of the client.
   * @param payload Contains the workSpaceId to join.
   */

  @SubscribeMessage("join-video-room")
  async hangelClientVideoRoomJoin(client: Socket, payload: any) {
    try {
      // check if space is available in room 
      const sockets = await this.server.in(`video-${payload.workSpaceId}`).fetchSockets();

      // if not give error 
      if (sockets.length >= 5) {
        client.emit("room-full")
        return
      }

      // initially when the user arives make the user join a room
      await client.join(`video-${payload.workSpaceId}`);

      // getting the count after user joined 
      const particepents = (await this.server.in(`video-${payload.workSpaceId}`).fetchSockets()).length;

      //tell existing user some one joins
      client.broadcast.to(`video-${payload.workSpaceId}`).emit("user-joined", { userId: payload.userId })

      //simalylarly updating the participents count 
      // ---------------------- 
      // // tell the whole room
      // client.broadcast.to(`video-${payload.workSpaceId}`).emit("online-user-count", { particepents })
      // // thell the individual as well
      // client.emit("online-user-count", { particepents })
      // ---------------------- 
      //  to simplify the above  to all (! server(whole) and client are different(to only one))
      this.server.to(`video-${payload.workSpaceId}`).emit("online-user-count", { particepents })
      this.server.to(`room-${payload.workSpaceId}`).emit("on-call-active", {
        status: true,
        workSpaceId: payload.workSpaceId
      });
    } catch (error) {
      console.log(error);
    }
  }
  @SubscribeMessage("leave-video-room")
  async handelLeaveRoom(client: Socket, payload: any) {
    await client.leave(`video-${payload.workSpaceId}`);
    // getting the updated user count
    const particepents = (await this.server.in(`video-${payload.workSpaceId}`).fetchSockets()).length;
    // in the jus need to tell other you have left 
    this.server.to(`video-${payload.workSpaceId}`).emit("online-user-count", { particepents })
    this.server.to(`room-${payload.workSpaceId}`).emit("on-call-active", {
      status: particepents == 0 ? false : true,
      workSpaceId: payload.workSpaceId
    });

  }

  @SubscribeMessage("call-offer")
  async handelVCoffer(client: Socket, payload: any) {
    const { workSpaceId, offer, userId } = payload
    const from = client.id
    client.broadcast.to(`video-${payload.workSpaceId}`).emit("incoming-offer", {
      from,
      fromUserId: userId,
      workSpaceId,
      offer
    })
  }

  @SubscribeMessage("offer-accepted")
  async handleOfferAccepted(client: Socket, payload: any) {
    const { ans, to } = payload
    if (!to) return
    this.server.to(to).emit("offer-accepted", { ans, from: client.id })
  }

  @SubscribeMessage('ice-candidate')
  async handleIceCandidate(client: Socket, payload: any) {
    const { to, candidate, workSpaceId } = payload;
    if (to) {
      this.server.to(to).emit('ice-candidate', {
        candidate,
        from: client.id,
      });
    } else if (workSpaceId) {
      client.broadcast.to(`video-${workSpaceId}`).emit('ice-candidate', {
        candidate,
        from: client.id,
      });
    }
  }
}
