import amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

let connection;
let channel;

export async function createChannel() {
    if (channel) return channel;

    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    console.log("✅ RabbitMQ connected (WS service)");

    return channel;
}