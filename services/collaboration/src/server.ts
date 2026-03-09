import app from "./app.js";
import { connectDB } from "./db.js";
import { config } from "./config.js";

await connectDB();

app.listen(config.EXPRESS_PORT, () => {
  console.log(`Server is running on: http://localhost:${config.EXPRESS_PORT}/`);
});
