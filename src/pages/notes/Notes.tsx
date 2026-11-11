import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Copy,
  Edit,
  Eye,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { notesService } from "../../services/notesService";
import CustomSelect from "../../components/CustomSelect";
import MultiSelectChecklist from "../../components/MultiSelectChecklist";
import { useBatchOptions } from "../../hooks/useBatchOptions";

type NoteStatus = "Published" | "Draft";

type Note = {
  id: string;
  title: string;
  subject: string;
  topic: string;
  classId: string;
  className: string;
  description: string;
  createdAt: string;
  status: NoteStatus;
};

const initialNotes: Note[] = [];

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [search, setSearch] = useState("");
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const { options: globalBatchOptions, loading: batchesLoading } = useBatchOptions();

  const [statusFilter, setStatusFilter] =
    useState<"All" | NoteStatus>("All");


  const loadNotes = () =>
    notesService.getNotes().then((res) => {
      setNotes(
        (res.data || []).map((item) => ({
          id: item.id,
          title: item.title,
          subject: item.subjectName || "Subject",
          topic: item.title,
          classId: item.classId || "",
          className: item.className || "No batch",
          description: item.description || "",
          createdAt: item.createdAt?.split("T")[0] || item.noteDate,
          status: (item.isPublished ? "Published" : "Draft") as NoteStatus,
        }))
      );
    });

  useEffect(() => {
    void loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // The notes query returns only this teacher's notes (row-level security).
  const filteredNotes = notes.filter(
    (note) => {
      const matchesSearch =
        note.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        note.subject
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        note.topic
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        note.className
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesBatch =
        selectedBatches.length === 0 ||
        selectedBatches.some((b) => note.className.split(", ").map((s) => s.trim()).includes(b));

      const matchesStatus =
        statusFilter === "All" ||
        note.status === statusFilter;


      return (
        matchesSearch &&
        matchesBatch &&
        matchesStatus
      );
    }
  );

  // Notes have no archive state in the database, so archiving deletes the note.
  const archiveNote = async (id: string) => {
    const note = notes.find((item) => item.id === id);
    if (!note || !window.confirm(`Delete "${note.title}"? Students will no longer see it.`)) return;
    const res = await notesService.archiveNote(id);
    if (!res.success) {
      alert(`Could not delete the note: ${res.error}`);
      return;
    }
    setNotes((current) => current.filter((item) => item.id !== id));
  };

  const duplicateNote = async (id: string) => {
    const res = await notesService.duplicateNote(id);
    if (!res.success) {
      alert(`Could not duplicate the note: ${res.error}`);
      return;
    }
    await loadNotes();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Notes
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage study notes for your batches.
          </p>
        </div>

        <Link
          to="/notes/create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus size={18} />
          Create Note
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 bg-[#fffdf9] py-2 pl-10 pr-3 text-xs sm:text-sm outline-none focus:border-gray-900 transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-3">
          {/* Batch Filter */}
          <div className="w-full md:w-52">
            <MultiSelectChecklist
              values={selectedBatches}
              onChange={setSelectedBatches}
              options={globalBatchOptions}
              placeholder="All Batches"
              allLabel="All Batches"
              disabled={batchesLoading}
            />
          </div>

          <div className="w-full md:w-44">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as "All" | NoteStatus)}
              options={[
                { value: "All", label: "All Status" },
                { value: "Published", label: "Published" },
                { value: "Draft", label: "Draft" },
              ]}
            />
          </div>
        </div>

      </div>

      {/* Notes Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Note
                </th>

                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Subject
                </th>

                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Topic
                </th>

                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Batch
                </th>

                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Created
                </th>

                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>

                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredNotes.length > 0 ? (
                filteredNotes.map((note) => (
                  <tr
                    key={note.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {note.title}
                        </p>

                        <p className="mt-1 max-w-xs text-xs text-gray-500">
                          {note.description}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700">
                      {note.subject}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700">
                      {note.topic}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700">
                      {note.className}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700">
                      {note.createdAt}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          note.status === "Published"
                            ? "bg-green-100 text-green-700"
                            : note.status === "Draft"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {note.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/notes/${note.id}`}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title="View"
                        >
                          <Eye size={17} />
                        </Link>

                        <Link
                          to={`/notes/${note.id}/edit`}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title="Edit"
                        >
                          <Edit size={17} />
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            duplicateNote(note.id)
                          }
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title="Duplicate"
                        >
                          <Copy size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => archiveNote(note.id)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No notes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}