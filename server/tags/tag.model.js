import pool from "../shared/db.js";

export const createTag = async (userId, name) => {
  const { rows } = await pool.query(
    `INSERT INTO tags (user_id, name)
     VALUES ($1, $2)
     ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [userId, name],
  );
  return rows[0];
};

export const deleteTag = async (userId, tagId) => {
  const { rowCount } = await pool.query(
    "DELETE FROM tags WHERE id = $1 AND user_id = $2",
    [tagId, userId],
  );

  if (rowCount === 0) {
    throw new Error("Tag not found or not authorized to delete");
  }
  return { affectedRows: rowCount };
};

export const getTagsByUserId = async (userId) => {
  const { rows: tags } = await pool.query(
    "SELECT * FROM tags WHERE user_id = $1",
    [userId],
  );
  return tags;
};

export const getTagsInTask = async (userId, taskId) => {
  const { rows: tags } = await pool.query(
    "SELECT t.* FROM tags t JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = $1 AND t.user_id = $2",
    [taskId, userId],
  );
  return tags;
};

export const assignTagToTask = async (userId, taskId, tagId) => {
  const { rows: validationResult } = await pool.query(
    `
      SELECT
        (SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2) AS "taskExists",
        (SELECT 1 FROM tags WHERE id = $3 AND user_id = $4) AS "tagExists"
    `,
    [taskId, userId, tagId, userId],
  );
  const { taskExists, tagExists } = validationResult[0];

  if (!taskExists) {
    throw new Error("Tarea no encontrada o no autorizada.");
  }
  if (!tagExists) {
    throw new Error("Tag no encontrado o no autorizado.");
  }
  await pool.query(
    `INSERT INTO task_tags (task_id, tag_id)
      VALUES ($1, $2)
      ON CONFLICT (task_id, tag_id) DO NOTHING`,
    [taskId, tagId],
  );
};

export const removeTagFromTask = async (userId, taskId, tagId) => {
  const { rows: task } = await pool.query(
    "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
    [taskId, userId],
  );
  if (task.length === 0) {
    throw new Error("Task not found or not authorized");
  }

  const { rows: tag } = await pool.query(
    "SELECT * FROM tags WHERE id = $1 AND user_id = $2",
    [tagId, userId],
  );
  if (tag.length === 0) {
    throw new Error("Tag not found or not authorized");
  }

  const { rowCount } = await pool.query(
    "DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2",
    [taskId, tagId],
  );

  if (rowCount === 0) {
    throw new Error("The tag was not assigned to this task");
  }
};
