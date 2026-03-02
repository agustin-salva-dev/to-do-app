import pool from "../shared/db.js";
import {
  defaultCategories,
  defaultTags,
  defaultTasks,
} from "../shared/defaultData.js";

const TASK_QUERY_BASE = `
  SELECT 
    t.*, 
    STRING_AGG(DISTINCT c.name, ',') AS category_names,
    STRING_AGG(DISTINCT c.id::TEXT, ',') AS category_ids,
    STRING_AGG(DISTINCT tg.name, ',') AS tag_names,
    STRING_AGG(DISTINCT tg.id::TEXT, ',') AS tag_ids
  FROM tasks t
  LEFT JOIN task_categories tc ON t.id = tc.task_id
  LEFT JOIN categories c ON tc.category_id = c.id
  LEFT JOIN task_tags tt ON t.id = tt.task_id
  LEFT JOIN tags tg ON tt.tag_id = tg.id
`;

/*
 * CRUD principal de las tareas
 */
export const createTask = async (userId, title, description) => {
  const { rows } = await pool.query(
    `INSERT INTO tasks (user_id, title, description) VALUES ($1, $2, $3) RETURNING id`,
    [userId, title, description],
  );
  const { rows: newTask } = await pool.query(
    "SELECT * FROM tasks WHERE id = $1",
    [rows[0].id],
  );
  return newTask[0];
};

export const getAllTasks = async (userId) => {
  const query = `${TASK_QUERY_BASE} WHERE t.user_id = $1 GROUP BY t.id ORDER BY t.created_at DESC`;
  const { rows: tasks } = await pool.query(query, [userId]);
  return tasks;
};

export const updateTask = async (taskId, userId, fields, values) => {
  const sql = `UPDATE tasks SET ${fields.join(
    ", ",
  )} WHERE id = $${values.length + 1} AND user_id = $${values.length + 2}`;
  values.push(taskId, userId);
  return pool.query(sql, values);
};

export const deleteTask = async (taskId, userId) => {
  const { rowCount } = await pool.query(
    "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
    [taskId, userId],
  );
  return { affectedRows: rowCount };
};

/*
 * Obtener tareas FILTRADAS
 */
export const findTaskById = async (taskId, userId) => {
  const query = `${TASK_QUERY_BASE} WHERE t.id = $1 AND t.user_id = $2 GROUP BY t.id`;
  const { rows } = await pool.query(query, [taskId, userId]);
  return rows;
};

export const getInboxTasks = async (userId) => {
  const query = `${TASK_QUERY_BASE} 
    WHERE t.user_id = $1 AND t.completed = false 
    GROUP BY t.id 
    ORDER BY t.created_at DESC 
    LIMIT 10`;
  const { rows: tasks } = await pool.query(query, [userId]);
  return tasks;
};

export const getTasksByDateRange = async (userId, startOfDay, endOfDay) => {
  const query = `${TASK_QUERY_BASE} 
    WHERE t.user_id = $1 AND t.due_date >= $2 AND t.due_date <= $3 AND t.completed = false
    GROUP BY t.id
    ORDER BY t.priority DESC, t.created_at ASC`;
  const { rows } = await pool.query(query, [userId, startOfDay, endOfDay]);
  return rows;
};

export const getCompletedTasks = async (userId) => {
  const query = `${TASK_QUERY_BASE} 
    WHERE t.user_id = $1 AND t.completed = true 
    GROUP BY t.id 
    ORDER BY t.created_at DESC`;
  const { rows: tasks } = await pool.query(query, [userId]);
  return tasks;
};

/* 
! NOT IN USE
export const getFilteredTasks = async (userId, filters = {}) => {
  let query = \`
        SELECT 
            t.*, 
            STRING_AGG(DISTINCT c.name, ',') AS category_names,
            STRING_AGG(DISTINCT c.id::TEXT, ',') AS category_ids,
            STRING_AGG(DISTINCT tg.name, ',') AS tag_names,
            STRING_AGG(DISTINCT tg.id::TEXT, ',') AS tag_ids
        FROM tasks t
        LEFT JOIN task_categories tc ON t.id = tc.task_id
        LEFT JOIN categories c ON tc.category_id = c.id
        LEFT JOIN task_tags tt ON t.id = tt.task_id
        LEFT JOIN tags tg ON tt.tag_id = tg.id
        WHERE t.user_id = $1
    \`;
  return []; // Placeholder
};
*/

/*
 * ESTO DE COMPLETADO en las tareas
 */
export const getTaskCompletionStatus = async (taskId, userId, column) => {
  const { rows: tasks } = await pool.query(
    `SELECT ${column} FROM tasks WHERE id = $1 AND user_id = $2`,
    [taskId, userId],
  );
  return tasks.length > 0 ? tasks[0][column] : null;
};

export const toggleTaskCompletion = async (taskId, userId, completedStatus) => {
  const { rowCount } = await pool.query(
    `
    UPDATE tasks
    SET completed = $1
    WHERE id = $2 AND user_id = $3
    `,
    [completedStatus, taskId, userId],
  );
  if (rowCount === 0) {
    throw new Error("Tarea no encontrada o no autorizada para el usuario.");
  }
};

/*
 * FECHAS en las tareas
 */
export const getTaskDueDate = async (userId, taskId) => {
  const { rows } = await pool.query(
    "SELECT due_date FROM tasks WHERE id = $1 AND user_id = $2",
    [taskId, userId],
  );

  if (rows.length === 0) {
    throw new Error("Tarea no encontrada o no autorizada.");
  }
  return rows[0].due_date;
};

export const setTaskDueDate = async (userId, taskId, date) => {
  const { rowCount } = await pool.query(
    "UPDATE tasks SET due_date = $1 WHERE id = $2 AND user_id = $3",
    [date, taskId, userId],
  );

  if (rowCount === 0) {
    throw new Error("Tarea no encontrada o no autorizada.");
  }
  return { affectedRows: rowCount };
};

export const removeTaskDueDate = async (userId, taskId) => {
  const { rowCount } = await pool.query(
    "UPDATE tasks SET due_date = NULL WHERE id = $1 AND user_id = $2",
    [taskId, userId],
  );

  if (rowCount === 0) {
    throw new Error("Tarea no encontrada o no autorizada.");
  }
  return { affectedRows: rowCount };
};

/*
 * CARGA LAS TAREAS, TAGS Y CATEGORIAS POR DEFECTO
 */
export async function initializeUserData(userId) {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const categoryMap = {};
    const tagMap = {};

    for (const cat of defaultCategories) {
      const { rows: result } = await client.query(
        `INSERT INTO categories (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [userId, cat.name],
      );
      categoryMap[cat.name] = result[0].id;
    }

    for (const tag of defaultTags) {
      const { rows: result } = await client.query(
        `INSERT INTO tags (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [userId, tag.name],
      );
      tagMap[tag.name] = result[0].id;
    }

    for (const task of defaultTasks) {
      const categoryId = categoryMap[task.categoryName];

      const { rows: taskResult } = await client.query(
        `INSERT INTO tasks (user_id, title, description, priority) VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, task.title, task.description, task.priority],
      );
      const taskId = taskResult[0].id;

      if (categoryId) {
        await client.query(
          `INSERT INTO task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [taskId, categoryId],
        );
      }

      for (const tagName of task.tagNames) {
        const tagId = tagMap[tagName];
        if (tagId) {
          await client.query(
            `INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [taskId, tagId],
          );
        }
      }
    }

    await client.query("COMMIT");
    console.log(`Datos iniciales cargados para el usuario: ${userId}`);
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error(
      `Error al inicializar datos para el usuario ${userId}:`,
      error,
    );
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}
