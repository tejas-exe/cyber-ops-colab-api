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

  //__________________________________________________________________________________________

  @SubscribeMessage("video-join")
  async handelVideoJoin(client: Socket, payload: any) {

    const sockets = await this.server.in(`video-${payload.workSpaceId}`).fetchSockets();

    const peerCount = sockets.length;

    if (peerCount > 5) {
      client.emit('video-room-full', { workSpaceId: payload.workSpaceId });
      return;
    }
    client.join(`video-${payload.workSpaceId}`)

    // Save user info
    client.data.userId = payload.userId;
    client.data.workSpaceId = payload.workSpaceId;

    // Send existing peers to new user
    const existingPeers = sockets.map((s) => ({
      socketId: s.id,
      userId: s.data?.userId,
    }));

    client.emit("video-existing-peers", existingPeers);

    // Notify others
    client.to(`video-${payload.workSpaceId}`).emit("video-peer-joined", {
      socketId: client.id,
      userId: payload.userId,
    });
  }

  @SubscribeMessage("video-offer")
  async handelVideoOffer(client: Socket, payload: any) {
    this.server.to(payload.to).emit("video-offer", payload)
  }

  @SubscribeMessage("video-answer")
  async handelVideoAnswer(client: Socket, payload: any) {
    this.server.to(payload.to).emit("video-answer", payload)
  }

  @SubscribeMessage("video-ice-candidate")
  async handelVideoIceCandidate(client: Socket, payload: any) {
    this.server.to(payload.to).emit("video-ice-candidate", payload)
  }



  @SubscribeMessage("video-leave")
  async handelVideoLeave(client: Socket, payload: any) {
    const workSpaceId = client.data?.workSpaceId;
    if (workSpaceId) {
      client.leave(`video-${workSpaceId}`);
      client.to(`video-${workSpaceId}`).emit("video-peer-left", {
        socketId: client.id,
        userId: client.data?.userId,
      });
    }
  }

  //*****************************************************************************************
  /**
   * Handles the 'join-room' event.
   * Allows a client to join a specific workspace room.
   * @param client The socket instance of the client.
   * @param payload Contains the workSpaceId to join.
   */

  @SubscribeMessage("join-video-room")
  async hangelClientVideoRoomJoin(client: Socket, payload: any) {
    try {

      console.log("One user joined", payload)
      console.log("With work space id ", payload.workSpaceId);
      console.log("with socket id", client.id)

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
    console.log("user left room");
    console.log("with room id", `video-${payload.workSpaceId}`);
    console.log("with socket id", client.id)

    console.log(
      "before leave",
      (await this.server.in(`video-${payload.workSpaceId}`).fetchSockets()).length
    );

    await client.leave(`video-${payload.workSpaceId}`);

    console.log(
      "after leave",
      (await this.server.in(`video-${payload.workSpaceId}`).fetchSockets()).length
    );
    // getting the updated user count
    const particepents = (await this.server.in(`video-${payload.workSpaceId}`).fetchSockets()).length;
    // in the jus need to tell other you have left 
    this.server.to(`video-${payload.workSpaceId}`).emit("online-user-count", { particepents })
    this.server.to(`room-${payload.workSpaceId}`).emit("on-call-active", {
      status: particepents == 0 ? false : true,
      workSpaceId: payload.workSpaceId
    });

  }

}
