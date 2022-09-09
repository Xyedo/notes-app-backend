const { Pool } = require("pg");
const NotFoundError = require("../../exceptions/NotFoundError");
const InvariantError = require("../../exceptions/InvariantError");
const { mapDBToModel } = require("../../utils");
const { nanoid } = require("nanoid");

const AddNotesFailed = "Catatan gagal ditambahkan";
const NotesNotFound = "Catatan tidak ditemukan";
const EditNoteByIdFailed = "Gagal memperbarui catatan. Id tidak ditemukan";
const DeleteNoteByIdFailed = "Catatan gagal dihapus. Id tidak ditemukan";

class NotesService {
  constructor() {
    this._pool = new Pool();
  }

  async addNote({ title, body, tags }) {
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const updateAt = createdAt;

    const query = {
      text: `INSERT INTO notes(id, title, body, tags, created_at, updated_at) 
      VALUES($1, $2, $3, $4, $5, $6) RETURNING id`,
      values: [id, title, body, tags, createdAt, updateAt],
    };
    
    const result = await this._pool.query(query);

    if (!result.rows[0]?.id) {
      throw new InvariantError(AddNotesFailed);
    }
    return result.rows[0].id;
  }

  async getNotes() {
    const query = {
      text: `SELECT id, title, body, tags, created_at, updated_at FROM public.notes LIMIT 10`,
    };
    const result = await this._pool.query(query);
    return result.rows.map(mapDBToModel);
  }

  async getNotesById(id) {
    const query = {
      text: `SELECT id, title, body, tags, created_at, updated_at FROM public.notes WHERE id=$1`,
      values: [id],
    };
    const result = await this._pool.query(query);
    if (result.rowCount == 0) {
      throw new NotFoundError(NotesNotFound);
    }

    return result.rows.map(mapDBToModel)[0];
  }

  async editNoteById(id, { title, body, tags }) {
    const updateAt = new Date().toISOString();
    const query = {
      text: `UPDATE notes SET title = $1, body=$2, tags=$3, updated_at = $4 WHERE id = $5`,
      values: [title, body, tags, updateAt, id],
    };
    const result = await this._pool.query(query);

    if (result.rowCount == 0) {
      throw new NotFoundError(EditNoteByIdFailed);
    }
    return result.rows.map(mapDBToModel)[0];
  }

  async deleteNoteById(id) {
    const query = {
      text: "DELETE FROM notes WHERE id = $1 RETURNING id",
      values: [id],
    };
    const result = await this._pool.query(query);
    if (result.rowCount == 0) {
      throw new NotFoundError(DeleteNoteByIdFailed);
    }
  }
}
module.exports = NotesService;
