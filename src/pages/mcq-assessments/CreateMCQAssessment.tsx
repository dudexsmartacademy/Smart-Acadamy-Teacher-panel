import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle,
  Save,
  ArrowRight,
  RotateCcw,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import {
  mcqAssessmentService,
} from '../../services/mcqAssessmentService';
import CustomSelect from '../../components/CustomSelect';
import type {
  MCQAssessment,
  MCQQuestion,
  MCQOption,
  MCQSchedule,
  MCQClassInfo,
  MCQAssessmentDraft,
} from '../../types/mcqAssessment';
import {
  MCQQuestionTabs,
  MCQQuestionEditor,
  MCQAssessmentSummary,
  MCQPreview,
  MCQScheduleForm,
  MCQPublishModal,
} from '../../components/mcq-assessments';

interface Props {
  initialAssessment?: MCQAssessment;
  isEditMode?: boolean;
}

export default function CreateMCQAssessment({
  initialAssessment,
  isEditMode = false,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  // Step state: 1 = Questions, 2 = Preview, 3 = Schedule, 4 = Publish
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Assessment Meta
  const [availableClasses, setAvailableClasses] = useState<MCQClassInfo[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ id: string; name: string }>>([]);

  const [title, setTitle] = useState<string>(initialAssessment?.title || '');
  const [description, setDescription] = useState<string>(initialAssessment?.description || '');
  const [selectedClass, setSelectedClass] = useState<MCQClassInfo | undefined>(
    initialAssessment?.classInfo
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialAssessment?.subjectId || ''
  );

  useEffect(() => {
    async function loadMeta() {
      const classes = await mcqAssessmentService.fetchClasses();
      setAvailableClasses(classes);
      if (classes && classes.length > 0) {
        if (!initialAssessment) setSelectedClass(classes[0]);
      }
      const subjects = await mcqAssessmentService.fetchSubjects();
      setAvailableSubjects(subjects);
      if (subjects && subjects.length > 0) {
        if (!initialAssessment) setSelectedSubjectId(subjects[0].id);
      }
    }
    loadMeta();
  }, [initialAssessment]);

  // Questions state
  const createBlankQuestion = (order: number): MCQQuestion => {
    const qId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const options: MCQOption[] = [
      { id: `opt-${qId}-a`, optionKey: 'A', text: '' },
      { id: `opt-${qId}-b`, optionKey: 'B', text: '' },
      { id: `opt-${qId}-c`, optionKey: 'C', text: '' },
      { id: `opt-${qId}-d`, optionKey: 'D', text: '' },
    ];
    return {
      id: qId,
      questionText: '',
      options,
      correctOptionId: '',
      marks: 1,
      explanation: '',
      order,
    };
  };

  const [questions, setQuestions] = useState<MCQQuestion[]>(
    initialAssessment?.questions && initialAssessment.questions.length > 0
      ? initialAssessment.questions
      : [createBlankQuestion(1)]
  );

  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  // Schedule state
  const [schedule, setSchedule] = useState<MCQSchedule>(
    initialAssessment?.schedule || {
      date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      startTime: '10:00 AM',
      endTime: '10:30 AM',
      durationMinutes: 30,
      timezone: 'Asia/Kolkata (IST)',
    }
  );

  // Validation feedback
  const [showValidationErrors, setShowValidationErrors] = useState<boolean>(false);
  const [metaErrors, setMetaErrors] = useState<{ title?: string }>({});

  // Draft recovery notification
  const [draftAvailable, setDraftAvailable] = useState<boolean>(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  // Publish modal
  const [publishModalOpen, setPublishModalOpen] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Check for URL query for direct step access (e.g. /mcq-assessments/create/preview)
  useEffect(() => {
    if (location.pathname.endsWith('/preview')) {
      setCurrentStep(2);
    } else if (location.pathname.endsWith('/schedule')) {
      setCurrentStep(3);
    }
  }, [location.pathname]);

  // Check for draft recovery on initial load if creating a new assessment
  useEffect(() => {
    if (!isEditMode && !initialAssessment) {
      const savedDraft = mcqAssessmentService.getDraft();
      if (savedDraft && savedDraft.questions?.length > 0 && savedDraft.title) {
        setDraftAvailable(true);
      }
    }
  }, [isEditMode, initialAssessment]);

  const handleRestoreDraft = () => {
    const savedDraft = mcqAssessmentService.getDraft();
    if (savedDraft) {
      setTitle(savedDraft.title || '');
      setDescription(savedDraft.description || '');
      const cls = availableClasses.find((c) => c.classId === savedDraft.classId);
      setSelectedClass(cls);
      setSelectedSubjectId(savedDraft.subjectId || '');
      setQuestions(savedDraft.questions || [createBlankQuestion(1)]);
      setSchedule(savedDraft.schedule || schedule);
      setActiveQuestionIndex(savedDraft.activeQuestionIndex || 0);
      setDraftAvailable(false);
      setDraftNotice('Draft restored successfully!');
      setTimeout(() => setDraftNotice(null), 4000);
    }
  };

  const handleDismissDraft = () => {
    setDraftAvailable(false);
    mcqAssessmentService.clearDraft();
  };

  // Helper validation for single question
  const isQuestionValid = (q: MCQQuestion): boolean => {
    const hasText = q.questionText.trim().length > 0;
    const hasOptions = q.options.filter((o) => o.text.trim().length > 0).length >= 2;
    const hasCorrect = Boolean(q.correctOptionId) && q.options.some((o) => o.id === q.correctOptionId && o.text.trim().length > 0);
    const hasMarks = Number(q.marks) > 0;
    return hasText && hasOptions && hasCorrect && hasMarks;
  };

  const allQuestionsValid = questions.every(isQuestionValid);
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  // Tab & Question Handlers
  const handleSelectTab = (idx: number) => {
    setActiveQuestionIndex(idx);
  };

  const handleAddQuestion = () => {
    const nextOrder = questions.length + 1;
    const newQ = createBlankQuestion(nextOrder);
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleQuestionChange = (updated: MCQQuestion) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === activeQuestionIndex ? updated : q))
    );
  };

  const handleDuplicateQuestion = () => {
    const currentQ = questions[activeQuestionIndex];
    const newQId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicatedOptions = currentQ.options.map((opt) => ({
      ...opt,
      id: `opt-${newQId}-${opt.optionKey.toLowerCase()}`,
    }));
    const correctOptIndex = currentQ.options.findIndex((o) => o.id === currentQ.correctOptionId);
    const newCorrectId = correctOptIndex >= 0 ? duplicatedOptions[correctOptIndex].id : '';

    const duplicated: MCQQuestion = {
      ...currentQ,
      id: newQId,
      order: questions.length + 1,
      options: duplicatedOptions,
      correctOptionId: newCorrectId,
    };

    setQuestions((prev) => [...prev, duplicated]);
    setActiveQuestionIndex(questions.length);
  };

  const handleDeleteQuestion = () => {
    if (questions.length <= 1) return;
    const updated = questions
      .filter((_, i) => i !== activeQuestionIndex)
      .map((q, i) => ({ ...q, order: i + 1 }));

    setQuestions(updated);
    setActiveQuestionIndex((prev) => Math.min(prev, updated.length - 1));
  };

  const handleMoveLeft = () => {
    if (activeQuestionIndex === 0) return;
    const newQuestions = [...questions];
    const temp = newQuestions[activeQuestionIndex];
    newQuestions[activeQuestionIndex] = newQuestions[activeQuestionIndex - 1];
    newQuestions[activeQuestionIndex - 1] = temp;
    // Re-index orders
    newQuestions.forEach((q, i) => (q.order = i + 1));
    setQuestions(newQuestions);
    setActiveQuestionIndex((prev) => prev - 1);
  };

  const handleMoveRight = () => {
    if (activeQuestionIndex === questions.length - 1) return;
    const newQuestions = [...questions];
    const temp = newQuestions[activeQuestionIndex];
    newQuestions[activeQuestionIndex] = newQuestions[activeQuestionIndex + 1];
    newQuestions[activeQuestionIndex + 1] = temp;
    // Re-index orders
    newQuestions.forEach((q, i) => (q.order = i + 1));
    setQuestions(newQuestions);
    setActiveQuestionIndex((prev) => prev + 1);
  };

  // Helper to find specific issue with a question
  const getQuestionValidationIssue = (q: MCQQuestion): string => {
    if (!q.questionText.trim()) return 'Please enter the question statement.';
    const validOpts = q.options.filter((o) => o.text.trim().length > 0);
    if (validOpts.length < 2) return 'Please enter text for at least 2 options (Option A, B, etc.).';
    if (!q.correctOptionId) return 'Please select the correct answer radio button.';
    const selectedOpt = q.options.find((o) => o.id === q.correctOptionId);
    if (!selectedOpt || !selectedOpt.text.trim()) return 'The selected correct answer option cannot be empty.';
    if (!q.marks || Number(q.marks) <= 0) return 'Please provide valid positive marks for this question.';
    return '';
  };

  // Draft saving
  const handleSaveDraft = (notify = true) => {
    if (!selectedClass) {
      setDraftNotice('Select a class from the database before saving this draft.');
      return;
    }
    const currentSubject = availableSubjects.find((s) => s.id === selectedSubjectId);
    const draftPayload: MCQAssessmentDraft = {
      title: title.trim() || 'Draft MCQ Assessment',
      description: description.trim(),
      classId: selectedClass.classId,
      className: selectedClass.className,
      subjectId: selectedSubjectId,
      subjectName: currentSubject?.name || 'Subject',
      questions,
      schedule,
      currentStep,
      activeQuestionIndex,
      lastSavedAt: new Date().toISOString(),
    };
    mcqAssessmentService.saveDraft(draftPayload);
    if (notify) {
      setDraftNotice('Assessment draft saved successfully to your workspace.');
      setTimeout(() => setDraftNotice(null), 4000);
    }
  };

  // Step 1 Validation & Proceed to Preview (Step 2)
  const handleProceedToPreview = () => {
    if (!selectedClass || !selectedSubjectId) {
      setDraftNotice('Select an available class and subject before continuing.');
      return;
    }

    // 1. Check title
    if (!title.trim()) {
      setMetaErrors({ title: 'Assessment title is compulsory.' });
      setDraftNotice('Please fill the compulsory Assessment Title at the top.');
      const titleEl = document.getElementById('assessment-title-input');
      if (titleEl) {
        titleEl.focus();
        titleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    setMetaErrors({});

    // 2. Check each question in order and navigate to the first unfilled option
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const issue = getQuestionValidationIssue(q);
      if (issue) {
        setShowValidationErrors(true);
        setActiveQuestionIndex(i);
        setDraftNotice(`MCQ ${String(i + 1).padStart(2, '0')} is incomplete: ${issue}`);
        
        setTimeout(() => {
          const editorCard = document.getElementById('question-editor-card');
          if (editorCard) {
            editorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          if (!q.questionText.trim()) {
            document.getElementById('question-statement-input')?.focus();
          }
        }, 100);
        return;
      }
    }

    // 3. All options & questions are filled -> Automatically save the MCQ and move to preview
    setShowValidationErrors(false);
    handleSaveDraft(false); // Automatically saves MCQ
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2 Action Handlers
  const handleUpdateFromPreview = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmFromPreview = () => {
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3 Action Handlers
  const handleBackToPreviewFromSchedule = () => {
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToStep4 = () => {
    if (isEditMode && initialAssessment) {
      // Direct save update
      handleSaveExistingAssessment();
    } else {
      // Open step 4 confirmation modal
      setPublishModalOpen(true);
    }
  };

  // Final Publish Handler
  const handleConfirmPublish = async () => {
    if (!selectedClass || !selectedSubjectId) {
      setDraftNotice('Select an available class and subject before publishing.');
      return;
    }
    setIsPublishing(true);
    const currentSubject = availableSubjects.find((s) => s.id === selectedSubjectId);

    const result = await mcqAssessmentService.createAssessment({
      title: title.trim(),
      description: description.trim() || undefined,
      classInfo: selectedClass,
      subjectId: selectedSubjectId,
      subjectName: currentSubject?.name || 'Subject',
      questions,
      schedule,
      status: 'Scheduled',
    });

    setIsPublishing(false);

    if (result.error || !result.data) {
      alert(result.error || 'Failed to schedule assessment in database.');
      return;
    }

    setPublishModalOpen(false);
    mcqAssessmentService.clearDraft();

    navigate('/mcq-assessments', {
      state: {
        highlightedId: result.data.id,
        message: 'MCQ Assessment scheduled successfully!',
      },
    });
  };

  const handleSaveExistingAssessment = async () => {
    if (!initialAssessment) return;
    if (!selectedClass || !selectedSubjectId) {
      setDraftNotice('Select an available class and subject before saving.');
      return;
    }
    setIsPublishing(true);
    const currentSubject = availableSubjects.find((s) => s.id === selectedSubjectId);

    const updateRes = await mcqAssessmentService.updateAssessment(initialAssessment.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      classInfo: selectedClass,
      subjectId: selectedSubjectId,
      subjectName: currentSubject?.name || 'Subject',
      questions,
      schedule,
    });

    setIsPublishing(false);

    if (updateRes.error || !updateRes.data) {
      alert(updateRes.error || 'Failed to update assessment in database.');
      return;
    }

    navigate('/mcq-assessments', {
      state: {
        highlightedId: initialAssessment.id,
        message: 'Assessment updated successfully.',
      },
    });
  };

  const currentSubjectObj = availableSubjects.find((s) => s.id === selectedSubjectId);

  // Step labels
  const steps = [
    { num: '01', title: 'Questions' },
    { num: '02', title: 'Preview' },
    { num: '03', title: 'Schedule' },
    { num: '04', title: 'Publish' },
  ];

  if (!selectedClass || availableClasses.length === 0 || availableSubjects.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] p-6 lg:p-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#E7DED3] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-[#1B1C1E]">Assessment setup unavailable</h1>
          <p className="mt-2 text-sm text-[#625D57]">
            No active classes or subjects were returned by the academy database. Configure them before creating an assessment.
          </p>
          <button
            type="button"
            onClick={() => navigate('/mcq-assessments')}
            className="mt-5 rounded-xl bg-[#1B1C1E] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to assessments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] p-6 lg:p-8 space-y-6">
      {/* Draft Recovery Banner */}
      {draftAvailable && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-[#B08E67] bg-[#E9DED0] p-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <RotateCcw size={18} className="text-[#9C7449] shrink-0" />
            <div className="text-xs">
              <strong className="text-[#1B1C1E] font-bold">Unsaved draft found!</strong>
              <p className="text-[#625D57]">
                We found an unfinished MCQ assessment draft in your browser. Would you like to restore it?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="rounded-xl bg-[#1B1C1E] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#9C7449] transition-all"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={handleDismissDraft}
              className="rounded-xl border border-[#B08E67]/40 bg-transparent px-3 py-1.5 text-xs font-semibold text-[#625D57] hover:text-[#1B1C1E] transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Notice Toast */}
      {draftNotice && (
        <div className="rounded-xl border border-[#5E8065]/40 bg-[#5E8065]/10 px-4 py-2.5 text-xs font-semibold text-[#5E8065] animate-fadeIn flex items-center gap-2">
          <CheckCircle size={15} />
          <span>{draftNotice}</span>
        </div>
      )}

      {/* Wizard Header & Step Indicator */}
      <div className="rounded-2xl border border-[#E7DED3] bg-white p-6 shadow-sm space-y-6">
        <div className="border-b border-[#E7DED3] pb-4">
          <h1 className="text-2xl font-extrabold text-[#1B1C1E] tracking-tight">
            {isEditMode ? 'Update MCQ Assessment' : 'Create MCQ Assessment'}
          </h1>
          <p className="mt-0.5 text-xs text-[#625D57]">
            {isEditMode
              ? 'Modify questions, answer keys, marks, and schedule details.'
              : 'Follow the guided multi-step authoring workflow to prepare your assessment.'}
          </p>
        </div>

        {/* Visual Step Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {steps.map((s, idx) => {
            const stepNumber = idx + 1;
            const isCurrent = currentStep === stepNumber;
            const isCompleted = currentStep > stepNumber;

            return (
              <div
                key={s.num}
                className={`relative flex items-center gap-3 rounded-xl border p-3 transition-all ${
                  isCurrent
                    ? 'border-[#B08E67] bg-[#FAF7F2] ring-2 ring-[#B08E67]/25 shadow-xs'
                    : isCompleted
                    ? 'border-[#5E8065]/40 bg-[#5E8065]/5'
                    : 'border-[#E7DED3] bg-white opacity-60'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#B08E67] text-white shadow-xs'
                      : isCompleted
                      ? 'bg-[#5E8065] text-white'
                      : 'bg-[#E9DED0] text-[#1B1C1E]'
                  }`}
                >
                  {isCompleted ? <CheckCircle size={14} /> : s.num}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-[#8C857D] block leading-none">
                    Step {s.num}
                  </span>
                  <span
                    className={`text-xs font-bold truncate block mt-0.5 ${
                      isCurrent
                        ? 'text-[#1B1C1E]'
                        : isCompleted
                        ? 'text-[#5E8065]'
                        : 'text-[#625D57]'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= STEP 1: CREATE MCQ QUESTIONS ================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Assessment Basic Information Form */}
          <div className="rounded-2xl border border-[#E7DED3] bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1.5 border-b border-[#E7DED3] pb-3">
              <BookOpen size={14} className="text-[#B08E67]" />
              <span>Assessment Basic Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Assessment Title */}
              <div className="md:col-span-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1 mb-1.5">
                  <span>Assessment Title</span>
                  <span className="text-[#A75B52] font-bold">*</span>
                </label>
                <input
                  id="assessment-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (metaErrors.title) setMetaErrors({});
                  }}
                  placeholder="e.g. Python Fundamentals Assessment"
                  className={`w-full rounded-xl border p-3 text-xs font-semibold transition-all focus:outline-none ${
                    metaErrors.title
                      ? 'border-[#A75B52] bg-[#FAF7F2]'
                      : 'border-[#E7DED3] bg-[#FAF7F2]/50 focus:border-[#B08E67] focus:bg-white'
                  }`}
                />
                {metaErrors.title && (
                  <p className="mt-1 text-xs text-[#A75B52] font-medium">{metaErrors.title}</p>
                )}
              </div>

              {/* Batch Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1 mb-1.5">
                  <span>Target Batch</span>
                  <span className="text-[#A75B52] font-bold">*</span>
                </label>
                <CustomSelect
                  value={selectedClass.classId}
                  onChange={(val) => {
                    const c = availableClasses.find((cl) => cl.classId === val);
                    if (c) setSelectedClass(c);
                  }}
                  options={availableClasses.map((c) => ({
                    value: c.classId,
                    label: c.className,
                  }))}
                />
              </div>

              {/* Subject Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1 mb-1.5">
                  <span>Subject</span>
                  <span className="text-[#A75B52] font-bold">*</span>
                </label>
                <CustomSelect
                  value={selectedSubjectId}
                  onChange={(val) => setSelectedSubjectId(val)}
                  options={availableSubjects.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                />
              </div>

              {/* Optional Description */}
              <div className="md:col-span-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1 mb-1.5">
                  <span>Optional Assessment Description / Instructions</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter any instructions or guidelines for students..."
                  className="w-full rounded-xl border border-[#E7DED3] bg-[#FAF7F2]/50 p-2.5 text-xs transition-all focus:border-[#B08E67] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* MCQ Question Tabs Bar */}
          <MCQQuestionTabs
            questions={questions}
            activeIndex={activeQuestionIndex}
            onSelectTab={handleSelectTab}
            onAddTab={handleAddQuestion}
            isQuestionValid={isQuestionValid}
          />

          {/* Main Layout: Question Editor + Assessment Progress Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MCQQuestionEditor
                question={questions[activeQuestionIndex]}
                index={activeQuestionIndex}
                totalQuestions={questions.length}
                onChange={handleQuestionChange}
                onDuplicate={handleDuplicateQuestion}
                onDeleteRequest={handleDeleteQuestion}
                onMoveLeft={handleMoveLeft}
                onMoveRight={handleMoveRight}
                showValidationErrors={showValidationErrors}
              />

              {/* Add Another MCQ Button underneath editor */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FAF7F2] border border-[#E7DED3] px-5 py-2.5 text-xs font-bold text-[#1B1C1E] hover:bg-[#E9DED0] hover:border-[#B08E67] transition-all"
                >
                  <span>+ Add Another MCQ</span>
                </button>

                <div className="text-xs text-[#8C857D]">
                  Question <strong className="text-[#1B1C1E]">{activeQuestionIndex + 1}</strong> of{' '}
                  <strong className="text-[#1B1C1E]">{questions.length}</strong>
                </div>
              </div>
            </div>

            {/* Assessment Progress Summary Widget */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <MCQAssessmentSummary
                  questions={questions}
                  activeIndex={activeQuestionIndex}
                  onSelectQuestion={handleSelectTab}
                  isQuestionValid={isQuestionValid}
                />
              </div>
            </div>
          </div>

          {/* Bottom Step Actions Bar */}
          <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-[#E7DED3] bg-white p-4 shadow-lg">
            <button
              type="button"
              onClick={() => handleSaveDraft(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E7DED3] bg-[#FAF7F2] px-5 py-2.5 text-xs font-bold text-[#1B1C1E] hover:bg-[#E9DED0] hover:border-[#B08E67] active:scale-95 transition-all shadow-xs"
            >
              <Save size={14} className="text-[#B08E67]" />
              <span>Save Draft</span>
            </button>

            <div className="flex items-center gap-3">
              {!allQuestionsValid && (
                <span className="hidden sm:inline text-xs font-medium text-[#A75B52] flex items-center gap-1">
                  <AlertTriangle size={13} /> Complete all questions to preview
                </span>
              )}

              <button
                type="button"
                onClick={handleProceedToPreview}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B1C1E] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#9C7449] transition-all"
              >
                <span>Preview Assessment</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: MCQ PREVIEW ================= */}
      {currentStep === 2 && (
        <MCQPreview
          title={title}
          description={description}
          classInfo={selectedClass}
          subjectName={currentSubjectObj?.name || 'Subject'}
          questions={questions}
          onUpdateClick={handleUpdateFromPreview}
          onConfirmClick={handleConfirmFromPreview}
        />
      )}

      {/* ================= STEP 3: CONFIRM AND SCHEDULE ================= */}
      {currentStep === 3 && (
        <MCQScheduleForm
          title={title}
          classInfo={selectedClass}
          questionsCount={questions.length}
          maxMarks={totalMarks}
          schedule={schedule}
          onScheduleChange={setSchedule}
          availableClasses={availableClasses}
          onClassChange={setSelectedClass}
          onBack={handleBackToPreviewFromSchedule}
          onProceed={handleProceedToStep4}
          isEditMode={isEditMode}
        />
      )}

      {/* ================= STEP 4: PROCEED / PUBLISH MODAL ================= */}
      <MCQPublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onConfirmPublish={handleConfirmPublish}
        title={title}
        classInfo={selectedClass}
        subjectName={currentSubjectObj?.name || 'Subject'}
        questionsCount={questions.length}
        maxMarks={totalMarks}
        schedule={schedule}
        isPublishing={isPublishing}
      />
    </div>
  );
}
