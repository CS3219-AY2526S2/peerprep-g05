import express from "express";
const app = express();

const router = express.Router();

router.get("/", (req, res) => res.send("Hi"));

app.use("/api/v1", router);

app.listen(3000, (e) => {
  if (e) {
    console.error(e);
  }
  console.log("Server is running...");
});
