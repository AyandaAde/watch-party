import { Server as HTTPServer } from "http";
import { Socket as ClientSocket } from "socket.io-client";
import { Server, Socket } from "socket.io";

let io: Server | null = null;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("[v0] User connected:", socket.id);

    socket.on("join-party", (partyId: string, userId: string, username: string) => {
      socket.join(`party-${partyId}`);
      io?.to(`party-${partyId}`).emit("member-joined", { userId, username, socketId: socket.id });
    });

    socket.on("leave-party", (partyId: string) => {
      socket.leave(`party-${partyId}`);
      io?.to(`party-${partyId}`).emit("member-left", { socketId: socket.id });
    });

    socket.on("play", (partyId: string, currentTime: number) => {
      io?.to(`party-${partyId}`).emit("play", { currentTime });
    });

    socket.on("pause", (partyId: string, currentTime: number) => {
      io?.to(`party-${partyId}`).emit("pause", { currentTime });
    });

    socket.on("seek", (partyId: string, currentTime: number) => {
      io?.to(`party-${partyId}`).emit("seek", { currentTime });
    });

    socket.on("next-movie", (partyId: string, movieId: string, currentTime: number) => {
      io?.to(`party-${partyId}`).emit("next-movie", { movieId, currentTime });
    });

    socket.on("previous-movie", (partyId: string, movieId: string, currentTime: number) => {
      io?.to(`party-${partyId}`).emit("previous-movie", { movieId, currentTime });
    });

    socket.on("disconnect", () => {
      console.log("[v0] User disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => io;
