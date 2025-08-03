import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

interface CustomWebSocket extends WebSocket {
  roomId?: string;
}

const rooms = new Map<string, Set<CustomWebSocket>>();

wss.on("connection", (socket: CustomWebSocket) => {
  console.log("Client Connected");

  socket.on("message", (message: string) => {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      console.log(error);
      socket.send(
        JSON.stringify({ type: "error", message: "Invalid JSON Format" })
      );
      return;
    }

    switch(parsedMessage.type){
        case "join":{
            const {roomId} = parsedMessage.payload;
            if(!roomId) return;
            if(!rooms.has(roomId)){
                rooms.set(roomId,new Set());
            }
            rooms.get(roomId)?.add(socket);
            socket.roomId = roomId;
            console.log(`Client joined room: ${roomId}`);
            break;
        }

        case "chat":{
            const {roomId} = socket;
            const {message:chatMessage} = parsedMessage.payload;
            if(!roomId || !chatMessage) return;

            const clientsInRoom = rooms.get(roomId);
            if(clientsInRoom){
                for(const client of clientsInRoom){
                    client.send(JSON.stringify({
                        type:"chat",
                        payload:{message:chatMessage}
                    }));
                }
            } 
            break;
        }
    }

    socket.on("close",()=>{
        const {roomId} = socket;
        if(roomId){
            const clientsInRoom = rooms.get(roomId);
            if(clientsInRoom){
                clientsInRoom.delete(socket);
                if(clientsInRoom.size==0){
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} is now empty and has been closed.`);
                }
            }
        }
        console.log("Client disconnected");
    });
    socket.on("error", (error) => {
        console.error("WebSocket error:", error);
    });
  });
});
console.log("WebSocket server started on port 8080");
