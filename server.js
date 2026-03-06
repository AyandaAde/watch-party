const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('[v0] Next.js app prepared');
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('[v0] User connected:', socket.id);

    socket.on('join-party', (partyId, userId, username) => {
      socket.join(`party-${partyId}`);
      socket.data.partyId = partyId;
      socket.data.userId = userId;
      socket.data.username = username;

      io.to(`party-${partyId}`).emit('member-joined', {
        userId,
        username,
        socketId: socket.id,
      });
    });

    socket.on('leave-party', (partyId) => {
      socket.leave(`party-${partyId}`);
      io.to(`party-${partyId}`).emit('member-left', {
        socketId: socket.id,
      });
    });

    socket.on('play', (partyId, currentTime) => {
      io.to(`party-${partyId}`).emit('play', {
        currentTime,
      });
    });

    socket.on('pause', (partyId, currentTime) => {
      io.to(`party-${partyId}`).emit('pause', {
        currentTime,
      });
    });

    socket.on('seek', (partyId, currentTime) => {
      io.to(`party-${partyId}`).emit('seek', {
        currentTime,
      });
    });

    socket.on('next-movie', (partyId, movieId, currentTime) => {
      io.to(`party-${partyId}`).emit('next-movie', {
        movieId,
        currentTime,
      });
    });

    socket.on('previous-movie', (partyId, movieId, currentTime) => {
      io.to(`party-${partyId}`).emit('previous-movie', {
        movieId,
        currentTime,
      });
    });

    socket.on('disconnect', () => {
      console.log('[v0] User disconnected:', socket.id);
      if (socket.data.partyId) {
        io.to(`party-${socket.data.partyId}`).emit('member-left', {
          socketId: socket.id,
        });
      }
    });
  });

  const PORT = process.env.PORT || 3000;

  httpServer.listen(PORT, () => {
    console.log(`[v0] Server listening on port ${PORT}`);
  });

  httpServer.on('error', (error) => {
    console.error('[v0] Server error:', error);
  });
}).catch((error) => {
  console.error('[v0] Failed to prepare app:', error);
  process.exit(1);
});
