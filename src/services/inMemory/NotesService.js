const { nanoid } = require("nanoid");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");

const addNotesFailed = "Catatan gagal ditambahkan";
const NotesNotFound = "Catatan tidak ditemukan";

class NotesService {
  constructor() {
    this._notes = [];
  }

  addNote({ title, body, tags }) {
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const updateAt = createdAt;

    const newNote = {
      title,
      tags,
      body,
      id,
      createdAt,
      updateAt,
    };
    this._notes.push(newNote);
    const isSuccess = this._notes.filter((note) => note.id === id).length > 0;
    if (!isSuccess) {
      throw new InvariantError(addNotesFailed);
    }
    return id;
  }

  getNotes() {
    return this._notes;
  }

  getNotesById(id) {
    const note = this._notes.filter((n) => n.id === id)[0];

    if (!note) {
      throw new NotFoundError(NotesNotFound);
    }
    return note;
  }

  editNoteById(id, { title, body, tags }) {
    const idx = this._notes.findIndex((note) => note.id === id);

    if (idx === -1) {
      throw new NotFoundError("Gagal memperbarui catatan. Id tidak ditemukan");
    }

    const updateAt = new Date().toISOString();

    this._notes[idx] = {
      ...this._notes[idx],
      title,
      body,
      tags,
      updateAt,
    };
  }

  deleteNoteById(id) {
    const idx = this._notes.findIndex((note) => note.id === id);

    if (idx === -1) {
      throw new NotFoundError("Gagal memperbarui catatan. Id tidak ditemukan");
    }

    this._notes.splice(idx, 1);
  }
}

module.exports = NotesService;
