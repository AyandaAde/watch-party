import { Server as HTTPServer } from "http";
import { Socket as ClientSocket } from "socket.io-client";
import { Server, Socket } from "socket.io";
import { prisma } from "@/lib/prisma";

let io: Server | null = null;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-party", (partyId: string, userId: string, username: string) => {
      socket.join(`party-${partyId}`);
      io?.to(`party-${partyId}`).emit("member-joined", { userId, username, socketId: socket.id });
    });

    socket.on("leave-party", (partyId: string) => {
      socket.leave(`party-${partyId}`);
      io?.to(`party-${partyId}`).emit("member-left", { socketId: socket.id });
    });

    socket.on("play", (partyId: string, currentTime: number) => {
      // Persist playback so late joiners can resume from the correct position.
      prisma.watchParty
        .update({
          where: { id: partyId },
          data: {
            isPlaying: true,
            currentTime,
          },
        })
        .catch((error) => console.error("Error persisting play state:", error));
      io?.to(`party-${partyId}`).emit("play", { currentTime });
    });

    socket.on("pause", (partyId: string, currentTime: number) => {
      prisma.watchParty
        .update({
          where: { id: partyId },
          data: {
            isPlaying: false,
            currentTime,
          },
        })
        .catch((error) => console.error("Error persisting pause state:", error));
      io?.to(`party-${partyId}`).emit("pause", { currentTime });
    });

    socket.on("seek", (partyId: string, currentTime: number) => {
      prisma.watchParty
        .update({
          where: { id: partyId },
          data: {
            currentTime,
          },
        })
        .catch((error) => console.error("Error persisting seek state:", error));
      io?.to(`party-${partyId}`).emit("seek", { currentTime });
    });

    socket.on("next-movie", (partyId: string, movieId: string, currentTime: number) => {
      prisma.watchParty
        .update({
          where: { id: partyId },
          data: {
            currentMovieId: movieId,
            currentTime,
            isPlaying: true,
          },
        })
        .catch((error) => console.error("Error persisting next-movie state:", error));
      io?.to(`party-${partyId}`).emit("next-movie", { movieId, currentTime });
    });

    socket.on("previous-movie", (partyId: string, movieId: string, currentTime: number) => {
      prisma.watchParty
        .update({
          where: { id: partyId },
          data: {
            currentMovieId: movieId,
            currentTime,
            isPlaying: true,
          },
        })
        .catch((error) => console.error("Error persisting previous-movie state:", error));
      io?.to(`party-${partyId}`).emit("previous-movie", { movieId, currentTime });
    });

    socket.on("disconnect", () => {
      console.log("[v0] User disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => io;
