const { Pool } = require("pg");
const NotFoundError = require("../../exceptions/NotFoundError");
const InvariantError = require("../../exceptions/InvariantError");
const AuthorizationError = require("../../exceptions/AuthorizationError");
const { mapDBToModel } = require("../../utils");
const { nanoid } = require("nanoid");

const AddNotesFailed = "Catatan gagal ditambahkan";
const NotesNotFound = "Catatan tidak ditemukan";
const EditNoteByIdFailed = "Gagal memperbarui catatan. Id tidak ditemukan";
const DeleteNoteByIdFailed = "Catatan gagal dihapus. Id tidak ditemukan";

class NotesService {
  constructor(collaborationService, cacheService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
    this._cacheService = cacheService;
  }

  async addNote({ title, body, tags, owner }) {
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const updateAt = createdAt;

    const query = {
      text: `INSERT INTO notes(id, title, body, tags, created_at, updated_at, "owner") 
      VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      values: [id, title, body, tags, createdAt, updateAt, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0]?.id) {
      throw new InvariantError(AddNotesFailed);
    }
    this._cacheService.delete(`notes:${owner}`);
    return result.rows[0].id;
  }

  async getNotes(owner) {
    try {
      const result = await this._cacheService.get(`notes:${owner}`);
      return JSON.parse(result);
    } catch (error) {
      const query = {
        text: `SELECT 
          notes.id, 
          notes.title, 
          notes.body, 
          notes.tags, 
          notes.created_at, 
          notes.updated_at, 
          notes."owner" 
        FROM public.notes 
        LEFT JOIN public.collaborations
        ON notes.id = collaborations.note_id
        WHERE notes.owner = $1 
          OR collaborations.user_id = $1
        GROUP BY notes.id
        LIMIT 10`,
        values: [owner],
      };
      const result = await this._pool.query(query);
      const mappedResult = result.rows.map(mapDBToModel);

      await this._cacheService.set(
        `notes:${owner}`,
        JSON.stringify(mappedResult)
      );

      return mappedResult;
    }
  }

  async getNotesById(id) {
    const query = {
      text: `SELECT 
        notes.id, 
        notes.title, 
        notes.body, 
        notes.tags, 
        notes.created_at, 
        notes.updated_at, 
        notes."owner",
        users.username
      FROM public.notes 
      LEFT JOIN public.users
        ON notes."owner" =users.id
      WHERE notes.id=$1`,
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
      text: `UPDATE notes 
      SET 
        title = $1, 
        body=$2, 
        tags=$3, 
        updated_at = $4 
      WHERE id = $5 
      RETURNING id, owner`,
      values: [title, body, tags, updateAt, id],
    };

    const result = await this._pool.query(query);
    if (result.rowCount == 0) {
      throw new NotFoundError(EditNoteByIdFailed);
    }
    const { id:retId, owner } = result.rows.map(mapDBToModel)[0];
    this._cacheService.delete(`notes:${owner}`);
    return retId;
  }

  async deleteNoteById(id) {
    const query = {
      text: "DELETE FROM notes WHERE id = $1 RETURNING id, owner",
      values: [id],
    };
    const result = await this._pool.query(query);
    if (result.rowCount == 0) {
      throw new NotFoundError(DeleteNoteByIdFailed);
    }
    const { owner } = result.rows[0];
    await this._cacheService.delete(`notes:${owner}`);
  }

  async verifyNoteAccess(noteId, userId) {
    try {
      await this.verifyNoteOwner(noteId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      try {
        await this._collaborationService.verifyCollaborator(noteId, userId);
      } catch {
        throw error;
      }
    }
  }

  async verifyNoteOwner(id, owner) {
    const query = {
      text: `SELECT 
        owner 
      FROM public.notes
      WHERE id = $1`,
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Catatan tidak ditemukan");
    }

    const note = result.rows[0];

    if (note.owner !== owner) {
      throw new AuthorizationError("Anda tidak berhak mengakses resource ini!");
    }
  }
}
module.exports = NotesService;
