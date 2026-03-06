import { createEnv } from "@t3-oss/env-nextjs";
import z from "zod";


export const env = createEnv({
    server: {
        DATABASE_URL: z.string().min(1),
        BLOB_READ_WRITE_TOKEN: z.string().min(1),
    },
    client: {
    },
    experimental__runtimeEnv: {
    }
})
