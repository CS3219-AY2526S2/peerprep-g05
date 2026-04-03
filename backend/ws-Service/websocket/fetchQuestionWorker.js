import dotenv from "dotenv";
import { createChannel } from "./rabbitmq/client.js";

dotenv.config();

export async function startQuestionWorker() {
  const channel = await createChannel();

  await channel.assertExchange(process.env.MATCH_EVENTS_EXCHANGE, "topic", { durable: true });

  const queue = await channel.assertQueue("question.worker.queue", { durable: true });

  await channel.bindQueue(queue.queue, process.env.MATCH_EVENTS_EXCHANGE, "match.confirmed");

  channel.consume(queue.queue, async (msg) => {
    if (!msg) return;

    const event = JSON.parse(msg.content.toString());

    try {
      const question = await fetchSingleQuestion(event.topic, event.difficulty);

      channel.publish(
        process.env.MATCH_EVENTS_EXCHANGE,
        "question.assigned",
        Buffer.from(JSON.stringify({
          match_id: event.match_id,
          user_id_a: event.user_id_a,
          user_id_b: event.user_id_b,
          question_id: question?.id ?? null,
        }))
      );

      channel.ack(msg);

    } catch (err) {
      console.error("Question worker error:", err);
      channel.nack(msg, false, true);
    }
  });

  console.log("Question worker started");
}

async function fetchSingleQuestion(topic, difficulty) {
  difficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  topic = topic.charAt(0).toUpperCase() + topic.slice(1).toLowerCase();
    let url;
    console.log(difficulty);
    if (difficulty === "Any") {
        url = `${process.env.QUESTION_SERVICE_URL}/api/v1/questions?category=${encodeURIComponent(topic)}&limit=1`;
    } else {
        url = `${process.env.QUESTION_SERVICE_URL}/api/v1/questions?category=${encodeURIComponent(topic)}&complexity=${encodeURIComponent(difficulty)}&limit=1`;
    }
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Question service returned status ${res.status}`);
      return null; // gracefully handle HTTP errors
    }

    const json = await res.json();
    if (!json.data || !json.data.length) {
      console.warn("No question found for topic", topic, "difficulty", difficulty);
      return null; // gracefully handle empty results
    }

    return json.data[0];
  } catch (err) {
    console.error("Error fetching question:", err);
    return null; // return null on network or other unexpected errors
  }
}