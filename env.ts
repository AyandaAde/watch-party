import { createEnv } from "@t3-oss/env-nextjs";
import z from "zod";


export const env = createEnv({
    server: {
        DATABASE_URL: z.string().min(1),
        BLOB_READ_WRITE_TOKEN: z.string().min(1),
        WATCH_PARTY_MUX_TOKEN_ID: z.string().min(1),
        WATCH_PARTY_MUX_TOKEN_SECRET: z.string().min(1),
        MUX_WEBHOOK_SECRET: z.string().min(1),
        EMAIL_USER: z.string().min(1),
        EMAIL_PASSWORD: z.string().min(1),
    },
    client: {
    },
    experimental__runtimeEnv: {
    }
})
