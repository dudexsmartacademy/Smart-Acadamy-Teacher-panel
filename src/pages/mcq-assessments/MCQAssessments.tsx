import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  Table as TableIcon,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  mcqAssessmentService,
} from '../../services/mcqAssessmentService';
import type { MCQAssessment, MCQClassInfo } from '../../types/mcqAssessment';
import {
  MCQAssessmentCard,
  MCQAssessmentTable,
  MCQDeleteModal,
} from '../../components/mcq-assessments';
import CustomSelect from '../../components/CustomSelect';

export default function MCQAssessments() {
  const location = useLocation();
  const [assessments, setAssessments] = useState<MCQAssessment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('Newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<MCQAssessment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Success toast / highlighted ID
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    // Check for navigation state (e.g. freshly created or updated)
    const state = location.state as { highlightedId?: string; message?: string } | null;
    if (state?.highlightedId) {
      setHighlightedId(state.highlightedId);
    }
    if (state?.message) {
      setToastMessage(state.message);
      setTimeout(() => setToastMessage(null), 5000);
    }
  }, [location.state]);

  // Available classes and subjects
  const [availableClasses, setAvailableClasses] = useState<MCQClassInfo[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    async function loadMeta() {
      const cls = await mcqAssessmentService.fetchClasses();
      if (cls && cls.length > 0) setAvailableClasses(cls);
      const subs = await mcqAssessmentService.fetchSubjects();
      if (subs && subs.length > 0) setAvailableSubjects(subs);
    }
    loadMeta();
  }, []);

  const loadAssessments = async () => {
    setLoading(true);
    const { data } = await mcqAssessmentService.getAssessments({
      search,
      classId: classFilter,
      subjectId: subjectFilter,
      status: statusFilter,
      sortBy,
    });
    setAssessments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAssessments();
  }, [search, classFilter, subjectFilter, statusFilter, sortBy]);

  const handleDeleteRequest = (item: MCQAssessment) => {
    setAssessmentToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (item: MCQAssessment) => {
    setIsDeleting(true);
    const res = await mcqAssessmentService.deleteAssessment(item.id, true);
    setIsDeleting(false);
    setDeleteModalOpen(false);
    setAssessmentToDelete(null);

    if (!res.success) {
      alert(res.error || 'Failed to archive assessment in database.');
      return;
    }

    setToastMessage('Assessment archived successfully.');
    loadAssessments();
  };

  // Pagination calculation
  const totalPages = Math.ceil(assessments.length / pageSize) || 1;
  const paginatedAssessments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return assessments.slice(start, start + pageSize);
  }, [assessments, currentPage]);

  const statusTabs: Array<{ label: string; value: string }> = [
    { label: 'All Active', value: 'All' },
    { label: 'Scheduled', value: 'Scheduled' },
    { label: 'Active (Live)', value: 'Active' },
    { label: 'Drafts', value: 'Draft' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Archived', value: 'Archived' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] p-6 lg:p-8 space-y-6">
      {/* Toast message if present */}
      {toastMessage && (
        <div className="flex items-center justify-between rounded-xl border border-[#B08E67]/50 bg-[#E9DED0] px-4 py-3 text-xs font-semibold text-[#1B1C1E] shadow-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#9C7449]" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-[#625D57] hover:text-[#1B1C1E]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#1B1C1E] tracking-tight">
              MCQ Assessment
            </h1>
            <span className="rounded-full bg-[#E9DED0] px-3 py-0.5 text-xs font-bold text-[#1B1C1E] border border-[#B08E67]/30">
              {assessments.length} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-[#625D57]">
            Create, manage, schedule and publish MCQ assessments for your students.
          </p>
        </div>

        {/* Top-Right Create Button */}
        <Link
          to="/mcq-assessments/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B1C1E] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#9C7449] active:scale-98 transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>+ Create MCQ Assessment</span>
        </Link>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E7DED3] pb-3">
        {statusTabs.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#1B1C1E] text-white shadow-sm'
                  : 'bg-white text-[#625D57] hover:bg-[#E9DED0] hover:text-[#1B1C1E] border border-[#E7DED3]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search, Filter Dropdowns, and View Controls */}
      <div className="rounded-2xl border border-[#E7DED3] bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Bar */}
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-3 text-[#8C857D]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search assessment title, class or subject..."
              className="w-full rounded-xl border border-[#E7DED3] bg-[#FAF7F2]/50 pl-9 pr-3 py-2 text-xs transition-all focus:border-[#B08E67] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#B08E67]"
            />
          </div>

          {/* Batch Filter */}
          <div>
            <CustomSelect
              value={classFilter}
              onChange={(val) => {
                setClassFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "All", label: "All Batches" },
                ...availableClasses.filter(
                  (c) => c.classId !== "all-batches" && c.className !== "All Batches"
                ).map((c) => ({
                  value: c.classId,
                  label: c.className,
                })),
              ]}
            />
          </div>

          {/* Subject Filter */}
          <div>
            <CustomSelect
              value={subjectFilter}
              onChange={(val) => {
                setSubjectFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "All", label: "All Subjects" },
                ...availableSubjects.map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
              ]}
            />
          </div>

          {/* Sort By & View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <CustomSelect
                value={sortBy}
                onChange={(val) => setSortBy(val)}
                options={[
                  { value: "Newest", label: "Newest First" },
                  { value: "Oldest", label: "Oldest First" },
                  { value: "Upcoming", label: "Upcoming Date" },
                  { value: "Recently Updated", label: "Recently Updated" },
                ]}
              />
            </div>

            <div className="flex items-center rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#1B1C1E] shadow-xs'
                    : 'text-[#8C857D] hover:text-[#1B1C1E]'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-[#1B1C1E] shadow-xs'
                    : 'text-[#8C857D] hover:text-[#1B1C1E]'
                }`}
                title="Table View"
              >
                <TableIcon size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Assessment List / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-64 rounded-2xl border border-[#E7DED3] bg-white p-5 animate-pulse space-y-4"
            >
              <div className="h-4 bg-[#E9DED0] rounded w-3/4" />
              <div className="h-3 bg-[#FAF7F2] rounded w-1/2" />
              <div className="h-20 bg-[#FAF7F2] rounded" />
              <div className="h-8 bg-[#E9DED0] rounded" />
            </div>
          ))}
        </div>
      ) : paginatedAssessments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CFBAA1] bg-white p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF7F2] text-[#B08E67]">
            <HelpCircle size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1B1C1E]">
              No MCQ assessments found
            </h3>
            <p className="mt-1 text-xs text-[#8C857D] max-w-sm mx-auto">
              No assessments match your active filter criteria. Try resetting filters or create a new assessment.
            </p>
          </div>
          <Link
            to="/mcq-assessments/create"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B1C1E] px-4 py-2 text-xs font-bold text-white hover:bg-[#9C7449] transition-all"
          >
            <Plus size={14} />
            <span>Create First MCQ</span>
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedAssessments.map((a) => (
            <MCQAssessmentCard
              key={a.id}
              assessment={a}
              onDeleteClick={handleDeleteRequest}
              isHighlighted={a.id === highlightedId}
            />
          ))}
        </div>
      ) : (
        <MCQAssessmentTable
          assessments={paginatedAssessments}
          onDeleteClick={handleDeleteRequest}
        />
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E7DED3] pt-4 text-xs text-[#625D57]">
          <span>
            Showing page <strong className="text-[#1B1C1E]">{currentPage}</strong> of{' '}
            <strong className="text-[#1B1C1E]">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-[#E7DED3] bg-white px-3 py-1.5 font-semibold text-[#1B1C1E] hover:bg-[#FAF7F2] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                  currentPage === page
                    ? 'bg-[#1B1C1E] text-white shadow-xs'
                    : 'bg-white text-[#625D57] hover:bg-[#FAF7F2] border border-[#E7DED3]'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-[#E7DED3] bg-white px-3 py-1.5 font-semibold text-[#1B1C1E] hover:bg-[#FAF7F2] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Modal */}
      <MCQDeleteModal
        isOpen={deleteModalOpen}
        assessment={assessmentToDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setAssessmentToDelete(null);
        }}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
