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