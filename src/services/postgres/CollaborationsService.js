const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const InvariantError = require("../../exceptions/InvariantError");

class CollaborationsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addCollaboration(noteId, userId) {
    const collabId = `collab=${nanoid(16)}`;

    const query = {
      text: `INSERT INTO 
        collaborations (id, note_id, user_id) 
      VALUES($1, $2, $3)
      RETURNING id`,
      values: [collabId, noteId, userId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError("Kolaborasi gagal ditambahkan");
    }
    this._cacheService.delete(`notes:${userId}`);
    return result.rows[0].id;
  }

  async deleteCollaboration(notedId, userId) {
    const query = {
      text: `DELETE FROM collaborations WHERE note_id = $1 and user_id = $2 RETURNING id`,
      values: [notedId, userId],
    };

    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new InvariantError("Kolaborasi gagal dihapus");
    }

    await this._cacheService.delete(`notes:${userId}`);
  }

  async verifyCollaborator(noteId, userId) {
    const query = {
      text: `SELECT id, note_id, user_id FROM collaborations WHERE note_id =$1 AND user_id = $2`,
      values: [noteId, userId],
    };

    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new InvariantError("Kolaborasi gagal diverifikasi");
    }
  }
}

module.exports = CollaborationsService;
