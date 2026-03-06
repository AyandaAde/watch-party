"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { getHealthCheckWorker } from "@/lib/health-check-worker";

type Props = {
    children: React.ReactNode;
}

const queryClient = new QueryClient();

const Provider = ({ children }: Props) => {
    useEffect(() => {
        // Start health check worker when component mounts
        const worker = getHealthCheckWorker();
        worker.start();

        // Stop health check worker when component unmounts
        return () => {
            worker.stop();
        };
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

export default Provider