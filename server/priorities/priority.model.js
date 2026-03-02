import pool from "../shared/db.js";

export const setTaskPriority = async (userId, taskId, priority) => {
  if (priority !== null && priority > 4) {
    throw new Error("La prioridad debe ser entre 1 y 4.");
  }

  const { rowCount } = await pool.query(
    "UPDATE tasks SET priority = $1 WHERE id = $2 AND user_id = $3",
    [priority, taskId, userId],
  );

  if (rowCount === 0) {
    throw new Error("Tarea no encontrada o no autorizada.");
  }
};

export const getTaskPriority = async (userId, taskId) => {
  try {
    const { rows } = await pool.query(
      "SELECT priority FROM tasks WHERE id = $1 AND user_id = $2",
      [taskId, userId],
    );
    if (rows.length === 0) {
      throw new Error("Tarea no encontrada o no autorizada.");
    }
    return rows[0].priority;
  } catch (error) {
    throw error;
  }
};

export const deleteTaskPriority = async (userId, taskId) => {
  const { rowCount } = await pool.query(
    "UPDATE tasks SET priority = NULL WHERE id = $1 AND user_id = $2",
    [taskId, userId],
  );

  if (rowCount === 0) {
    throw new Error("Tarea no encontrada o no autorizada.");
  }
};
