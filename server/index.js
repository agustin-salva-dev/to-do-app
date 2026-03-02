import dotenv from "dotenv";
dotenv.config();
import express, { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import cron from "node-cron";

import pool from "./shared/db.js";

import authRoutes from "./auth/auth.routes.js";
import taskRoutes from "./tasks/tasks.routes.js";
import tagRoutes from "./tags/tags.routes.js";
import categoryRoutes from "./categories/categories.routes.js";
import userRoutes from "./users/user.routes.js";
import dateRoutes from "./date/date.routes.js";
import prioritiesRoutes from "./priorities/priorities.routes.js";
import { deleteExpiredGuestUsers } from "./users/user.model.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(json());
app.use(cookieParser());

const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL];

app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);
app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);
app.use("/tags", tagRoutes);
app.use("/categories", categoryRoutes);
app.use("/users", userRoutes);
app.use("/dates", dateRoutes);
app.use("/priorities", prioritiesRoutes);

app.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT NOW() AS now");
    res.send(`Server is running, its : ${rows[0].now}.`);
  } catch (error) {
    console.error("Error to connect to database: ", error);
    res.status(500).send("Could not connect to the database :(");
  }
});

cron.schedule("*/30 * * * *", async () => {
  console.log("🤖 Limpiando cuentas de invitado expiradas...");
  try {
    const deletedCount = await deleteExpiredGuestUsers();
    console.log(`[CRON] Se eliminaron ${deletedCount} cuentas huérfanas.`);
  } catch (error) {
    console.error("[CRON ERROR] Falló la limpieza:", error);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
