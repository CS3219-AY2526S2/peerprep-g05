import amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

export async function createChannel() {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(
        process.env.MATCH_EXCHANGE,
        "topic",
        { durable: true }
    );
    return channel;
}

export async function publishEvent(channel, routingKey, payload) {
    channel.publish(
        process.env.MATCH_EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
    );
}