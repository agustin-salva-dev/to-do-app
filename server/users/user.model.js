import { nanoid } from "nanoid";
import pool from "../shared/db.js";
import { hash } from "bcrypt";

export async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return rows;
}

export async function findUserByUsername(username) {
  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  return rows;
}

export async function updateUsername(userId, newUsername) {
  const { rowCount } = await pool.query(
    "UPDATE users SET username = $1 WHERE id = $2",
    [newUsername, userId],
  );
  return rowCount === 1;
}

export async function createUser(username, email, hashedPassword) {
  const id = nanoid(10);
  await pool.query(
    "INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4)",
    [id, username, email, hashedPassword],
  );
  return id;
}

export async function createGuestUser() {
  const id = nanoid(10);

  const guestUsername = `Invitado_${nanoid(6)}`;
  const guestEmail = `guest_${id}@temp.com`;
  const tempPassword = await hash(nanoid(20), 10);

  try {
    await pool.query(
      "INSERT INTO users (id, username, email, password, is_guest) VALUES ($1, $2, $3, $4, TRUE)",
      [id, guestUsername, guestEmail, tempPassword],
    );

    return id;
  } catch (error) {
    console.error("Error al crear usuario invitado:", error);
    throw new Error("Fallo al crear el usuario invitado en la base de datos.");
  }
}

export const findUserById = async (userId) => {
  const { rows: result } = await pool.query(
    "SELECT id, username, email, is_guest FROM users WHERE id = $1",
    [userId],
  );
  return result[0];
};

export const findUserPasswordById = async (userId) => {
  const { rows: result } = await pool.query(
    "SELECT id, username, email, password FROM users WHERE id = $1",
    [userId],
  );
  return result[0];
};

export const updatePassword = async (userId, newPlainPassword) => {
  const hashedNewPassword = await hash(newPlainPassword, 10);

  const { rowCount } = await pool.query(
    "UPDATE users SET password = $1 WHERE id = $2",
    [hashedNewPassword, userId],
  );

  return rowCount === 1;
};

export async function deleteUser(userId) {
  const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [
    userId,
  ]);
  return rowCount === 1;
}

export async function deleteExpiredGuestUsers() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const { rowCount } = await pool.query(
    `DELETE FROM users 
         WHERE is_guest = TRUE 
         AND created_at < $1`,
    [twoHoursAgo],
  );

  return rowCount;
}
