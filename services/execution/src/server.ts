import app from "@/app.js";
import { config } from "@/config.js";

app.listen(config.PORT, () => {
  console.log(`[execution-service] Running on http://localhost:${config.PORT}`);
});
