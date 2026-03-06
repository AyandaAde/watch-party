import { env } from "@/env";
import Mux from "@mux/mux-node";

export const mux = new Mux({
    tokenId: env.WATCH_PARTY_MUX_TOKEN_ID,
    tokenSecret: env.WATCH_PARTY_MUX_TOKEN_SECRET
});