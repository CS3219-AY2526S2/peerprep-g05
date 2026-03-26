import dotenv from "dotenv";
import { createChannel } from "./rabbitmq/client.js";
import { sendToUser } from "./wsServer.js";

dotenv.config();

export async function startWsWorker() {
    const channel = await createChannel();

    // Assert separate exchange for WebSocket events
    await channel.assertExchange(process.env.MATCH_EVENTS_EXCHANGE, "topic", { durable: true });

    const queue = await channel.assertQueue("match.ws.queue", { durable: true });

    await channel.bindQueue(queue.queue, process.env.MATCH_EVENTS_EXCHANGE, "match.waiting");
    await channel.bindQueue(queue.queue, process.env.MATCH_EVENTS_EXCHANGE, "match.redirected");
    await channel.bindQueue(queue.queue, process.env.MATCH_EVENTS_EXCHANGE, "match.proposed");
    await channel.bindQueue(queue.queue, process.env.MATCH_EVENTS_EXCHANGE, "match.accepted");
    await channel.bindQueue(queue.queue, process.env.MATCH_EVENTS_EXCHANGE, "match.declined");
    await channel.bindQueue(queue.queue, process.env.MATCH_EVENTS_EXCHANGE, "match.cancelled");
    await channel.bindQueue(queue.queue, process.env.MATCH_EVENTS_EXCHANGE, "match.timeout");
    await channel.bindQueue(queue.queue, process.env.MATCH_EVENTS_EXCHANGE, "match.confirmed");

    channel.consume(queue.queue, async (msg) => {
        if (!msg) return;

        const event = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;
        console.log(`WebSocket worker received: ${routingKey}`, event);

        try {
            switch (routingKey) {
                //User joins queue or gets requeued
                case "match.waiting":
                    sendToUser(event.user_id, { 
                        type: "MATCH_WAITING", 
                        match_id: event.match_id 
                    });
                    break;
                //UserA gets proposed
                case "match.proposed":
                    sendToUser(event.user_id_a, { 
                        type: "MATCH_PROPOSED", 
                        match_id: event.match_id, 
                        peer: event.user_id_b 
                    });
                    break;
                //UserB gets redirected
                case "match.redirected":
                    sendToUser(event.user_id_b, { 
                        type: "MATCH_PROPOSED", 
                        match_id: event.redirected_to, 
                        peer: event.user_id_a 
                    });
                    break;
                //User Accepts
                case "match.accepted":
                    sendToUser(event.user_id, {
                        type: "MATCH_ACCEPTED",
                        match_id: event.match_id
                    });
                    break;
                //User declines
                case "match.declined":
                    sendToUser(event.declined_by, {
                        type: "MATCH_CANCELLED",
                        match_id: event.match_id
                    });
                    break;
                //User declines: Decliner gets cancelled, other user gets requeued
                case "match.cancelled":
                    sendToUser(event.declined_by, { 
                        type: "MATCH_CANCELLED", 
                        match_id: event.match_id 
                    });
                    break;
                //Proposal Expired or waiting timeout
                case "match.timeout":
                    sendToUser(event.user_id, {
                        type: "MATCH_TIMEOUT",
                        match_id: event.match_id
                    });
                    break;
                //Both users accepted
                case "match.confirmed":
                    sendToUser(event.user_id_a, { 
                        type: "MATCH_CONFIRMED", 
                        match_id: event.match_id 
                    });
                    sendToUser(event.user_id_b, { 
                        type: "MATCH_CONFIRMED", 
                        match_id: event.match_id 
                    });
                    break;
            }

            channel.ack(msg);
        } catch (err) {
            console.error("WebSocket worker error:", err);
            channel.nack(msg, false, false);
        }
    });

    console.log("WebSocket worker started");
}