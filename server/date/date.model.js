import pool from "../shared/db.js";

export const setTaskDate = async (userId, taskId, date) => {
  const { rows: task } = await pool.query(
    "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
    [taskId, userId],
  );
  if (task.length === 0) {
    throw new Error("Tarea no encontrada o no autorizada.");
  }

  const { rows: existingDate } = await pool.query(
    "SELECT * FROM task_date WHERE task_id = $1",
    [taskId],
  );
  if (existingDate.length > 0) {
    await pool.query("UPDATE task_date SET date = $1 WHERE task_id = $2", [
      date,
      taskId,
    ]);
  } else {
    await pool.query("INSERT INTO task_date (task_id, date) VALUES ($1, $2)", [
      taskId,
      date,
    ]);
  }
};

export const getTaskDate = async (userId, taskId) => {
  const { rows: task } = await pool.query(
    "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
    [taskId, userId],
  );

  if (task.length === 0) {
    throw new Error("Tarea no encontrada o no autorizada.");
  }

  const { rows: dateRow } = await pool.query(
    "SELECT date FROM task_date WHERE task_id = $1",
    [taskId],
  );

  return dateRow.length > 0 ? dateRow[0].date : null;
};
