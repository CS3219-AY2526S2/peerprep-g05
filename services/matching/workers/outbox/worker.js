import dotenv from "dotenv";
import { createChannel } from "../../infrastructure/rabbitmq/client.js";
import { getPendingOutboxEvents, markOutboxEventPublished } from "../../domain/match/outboxRepository.js";

dotenv.config();

async function startOutboxWorker() {
    const channel = await createChannel();

    // Ensure both exchanges exist before publishing
    await channel.assertExchange(process.env.MATCH_EXCHANGE, "topic", { durable: true });
    await channel.assertExchange(process.env.MATCH_EVENTS_EXCHANGE, "topic", { durable: true });

    setInterval(async () => {
        try {
            const events = await getPendingOutboxEvents();
            if (events.length === 0) return;

            for (const event of events) {
                try {
                    channel.publish(
                        event.exchange,
                        event.routing_key,
                        Buffer.from(JSON.stringify(event.payload)),
                        { persistent: true }
                    );

                    await markOutboxEventPublished(event.id);
                    console.log(`[Outbox] published ${event.routing_key} id=${event.id}`);

                } catch (err) {
                    // Leave published_at null — will retry on next poll
                    console.error(`[Outbox] failed to publish id=${event.id}:`, err.message);
                }
            }
        } catch (err) {
            console.error("[Outbox] poll error:", err.message);
        }
    }, 1000);

    console.log("[Outbox] worker started");
}

startOutboxWorker();