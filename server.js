import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static(__dirname));
app.use(express.json());

// Store active rooms and users
const rooms = new Map();
const users = new Map();

// Store messages per room
const roomMessages = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data) => {
    const { room, account, userName } = data;
    
    // Leave previous room if any
    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
    }
    
    // Join new room
    socket.join(room);
    socket.currentRoom = room;
    socket.account = account;
    
    // Initialize room if not exists
    if (!rooms.has(room)) {
      rooms.set(room, new Map());
      roomMessages.set(room, new Map());
    }
    
    // Add user to room
    const userData = {
      id: socket.id,
      account: account,
      name: userName || account.slice(0, 8),
      online: true,
      lastSeen: Date.now()
    };
    
    rooms.get(room).set(account, userData);
    users.set(socket.id, userData);
    
    // Send current room users to the new user
    socket.emit('room-users', Array.from(rooms.get(room).values()));
    
    // Send recent messages to the new user
    const messages = Array.from(roomMessages.get(room).values());
    messages.forEach(msg => {
      socket.emit('new-message', msg);
    });
    
    // Broadcast to room that user joined
    socket.to(room).emit('user-joined', userData);
    socket.to(room).emit('room-users', Array.from(rooms.get(room).values()));
    
    console.log(`User ${account} joined room ${room}`);
  });

  socket.on('send-message', (data) => {
    const { room, message } = data;
    
    if (!roomMessages.has(room)) {
      roomMessages.set(room, new Map());
    }
    
    // Store message
    roomMessages.get(room).set(message.id, message);
    
    // Broadcast message to room
    io.to(room).emit('new-message', message);
    
    console.log('Message sent to room:', room, 'by:', message.from);
  });

  socket.on('typing-start', (data) => {
    socket.to(data.room).emit('user-typing', {
      account: socket.account,
      typing: true
    });
  });

  socket.on('typing-stop', (data) => {
    socket.to(data.room).emit('user-typing', {
      account: socket.account,
      typing: false
    });
  });

  socket.on('react-message', (data) => {
    const { room, messageId, reactions } = data;
    
    if (roomMessages.has(room)) {
      const message = roomMessages.get(room).get(messageId);
      if (message) {
        message.reactions = reactions;
        io.to(room).emit('reaction-updated', {
          messageId: messageId,
          reactions: reactions
        });
      }
    }
  });

  socket.on('delete-message', (data) => {
    const { room, messageId } = data;
    
    if (roomMessages.has(room)) {
      roomMessages.get(room).delete(messageId);
      io.to(room).emit('message-deleted', messageId);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const userData = users.get(socket.id);
    if (userData && socket.currentRoom) {
      const room = rooms.get(socket.currentRoom);
      if (room) {
        room.delete(userData.account);
        io.to(socket.currentRoom).emit('user-left', userData);
        io.to(socket.currentRoom).emit('room-users', Array.from(room.values()));
      }
    }
    
    users.delete(socket.id);
  });
});

// API route to get room info
app.get('/api/room/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  if (rooms.has(roomId)) {
    res.json({
      users: Array.from(rooms.get(roomId).values()),
      messageCount: roomMessages.has(roomId) ? roomMessages.get(roomId).size : 0
    });
  } else {
    res.json({ users: [], messageCount: 0 });
  }
});

const PORT = 8765;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🚀 Socket.IO Chat Server Active   ║
  ║   📡 http://localhost:${PORT}         ║
  ║   📡 http://192.168.1.4:${PORT}       ║
  ║   ⚡ Real-time chat enabled          ║
  ╚══════════════════════════════════════╝
  `);
});