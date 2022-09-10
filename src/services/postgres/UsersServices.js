const { Pool } = require("pg");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");


const UsernameIsTaken = "Gagal menambahkan user. Username sudah digunakan.";
const FailedAddUser = "User gagal ditambahkan";
const UserNotFound = "User tidak ditemukan";

class UsersService {
  constructor() {
    this._pool = new Pool();
  }

  async addUser({ username, password, fullname }) {
    await this._verifyNewUsername(username);
    const id = `user-${nanoid(16)}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = {
      text: `INSERT INTO 
      users
        (id, username, password, fullname)
      VALUES
        ($1,$2,$3,$4)
        RETURNING id`,
      values: [id, username, hashedPassword, fullname],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0]?.id) {
      throw new InvariantError(FailedAddUser);
    }
    return result.rows[0].id;
  }
  async getUserById(userId) {
    const query = {
      text: `SELECT 
        id, username, fullname 
      FROM 
        users 
      WHERE  
        id = $1`,
      values: [userId],
    };
    const result = await this._pool.query(query);
    if (result.rowCount === 0) {
      throw new NotFoundError(UserNotFound);
    }
    return result.rows[0];
  }

  async _verifyNewUsername(username) {
    const query = {
      text: `SELECT 
        username 
      FROM 
        users 
      WHERE 
        username = $1`,
      values: [username],
    };
    const result = await this._pool.query(query);
    if (result.rowCount !== 0) {
      throw new InvariantError(UsernameIsTaken);
    }
  }
}

module.exports = UsersService;