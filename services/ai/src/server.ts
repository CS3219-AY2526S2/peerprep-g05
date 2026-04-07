import app from "@/app.js";
import { config } from "@/config.js";

app.listen(config.PORT, () => {
  console.log(`[ai-service] Running on http://localhost:${config.PORT}`);
});
