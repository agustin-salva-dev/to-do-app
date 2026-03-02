import pool from "../shared/db.js";

export const createCategory = async (userId, name) => {
  const { rows } = await pool.query(
    `INSERT INTO categories (user_id, name)
     VALUES ($1, $2)
     ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [userId, name],
  );
  return rows[0];
};

export const deleteCategory = async (userId, categoryId) => {
  const { rowCount } = await pool.query(
    "DELETE FROM categories WHERE id = $1 AND user_id = $2",
    [categoryId, userId],
  );

  if (rowCount === 0) {
    throw new Error("Category not found or not authorized to delete");
  }
  return { affectedRows: rowCount };
};

export const getCategoriesInTask = async (userId, taskId) => {
  const { rows: categories } = await pool.query(
    "SELECT c.* FROM categories c JOIN task_categories tc ON c.id = tc.category_id WHERE tc.task_id = $1 AND c.user_id = $2",
    [taskId, userId],
  );
  return categories;
};

export const assignCategoryToTask = async (userId, taskId, categoryId) => {
  const { rows: validationResult } = await pool.query(
    `
      SELECT
        (SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2) AS "taskExists",
        (SELECT 1 FROM categories WHERE id = $3 AND user_id = $4) AS "categoryExists"
    `,
    [taskId, userId, categoryId, userId],
  );
  const { taskExists, categoryExists } = validationResult[0];

  if (!taskExists) {
    throw new Error("Tarea no encontrada o no autorizada.");
  }
  if (!categoryExists) {
    throw new Error("Categoría no encontrada o no autorizada.");
  }
  await pool.query(
    `INSERT INTO task_categories (task_id, category_id)
      VALUES ($1, $2)
      ON CONFLICT (task_id, category_id) DO NOTHING`,
    [taskId, categoryId],
  );
};

export const removeCategoryFromTask = async (userId, taskId, categoryId) => {
  const { rows: tasks } = await pool.query(
    "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
    [taskId, userId],
  );
  if (tasks.length === 0) {
    return { notFound: true };
  }

  await pool.query(
    "DELETE FROM task_categories WHERE task_id = $1 AND category_id = $2",
    [taskId, categoryId],
  );

  return { notFound: false };
};

export const getAllCategories = async (userId) => {
  const { rows: categories } = await pool.query(
    "SELECT * FROM categories WHERE user_id = $1",
    [userId],
  );
  return categories;
};
