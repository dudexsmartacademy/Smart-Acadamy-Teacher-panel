import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { CustomSelect } from "../../components/CustomSelect";
import ResponsiveDatePicker from "../../components/ResponsiveDatePicker";
import { useAuth } from "../../context/AuthContext";
import { classService } from "../../services/classService";
import { batchService } from "../../services/batchService";
import { codingAssessmentService } from "../../services/codingAssessmentService";

type TestCase = {
  id: number;
  input: string;
  output: string;
};

export default function CreateCodingAssessment() {
  const navigate = useNavigate();
  const { assignments } = useAuth();

  const [problemTitle, setProblemTitle] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [classList, setClassList] = useState<string[]>([]);
  // Batch picker: "All Batches" plus every global batch.
  const ALL = "All Batches";
  const [saving, setSaving] = useState(false);
  const [subjectList, setSubjectList] = useState<string[]>([]);

  useEffect(() => {
    async function fetchOptions() {
      const [batchRes, subjRes] = await Promise.all([
        batchService.getBatches(),
        classService.getSubjects(),
      ]);

      const names = [ALL, ...batchRes.data.map((b) => b.name)];
      setClassList(names);
      setSelectedClass((current) => (names.includes(current) ? current : ALL));

      const subjNames = new Set<string>();
      if (assignments && assignments.length > 0) {
        assignments.forEach((a) => {
          if (a.subject) subjNames.add(a.subject);
        });
      }
      if (subjRes.data) {
        subjRes.data.forEach((s) => {
          if (s.name) subjNames.add(s.name);
        });
      }
      const finalSubjs = Array.from(subjNames);
      setSubjectList(finalSubjs);
      if (finalSubjs.length > 0 && !selectedSubject) {
        setSelectedSubject(finalSubjs[0]);
      }
    }
    fetchOptions();
  }, [assignments]);
  const [problemStatement, setProblemStatement] = useState("");
  const [description, setDescription] = useState("");
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [constraints, setConstraints] = useState("");
  const [examples, setExamples] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [marks, setMarks] = useState("10");
  const [timeLimit, setTimeLimit] = useState("2");
  const [memoryLimit, setMemoryLimit] = useState("256");

  const [allowedLanguages, setAllowedLanguages] = useState<string[]>([
    "Python",
  ]);

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [visibleTestCases, setVisibleTestCases] = useState<TestCase[]>([
    {
      id: 1,
      input: "",
      output: "",
    },
  ]);

  const [hiddenTestCases, setHiddenTestCases] = useState<TestCase[]>([
    {
      id: 1,
      input: "",
      output: "",
    },
  ]);

  const languages = ["Python", "Java", "C", "C++", "JavaScript"];

  /*
   * Preserve the original datetime-local value format:
   * YYYY-MM-DDTHH:mm
   *
   * The responsive date picker edits the date portion,
   * while the time input edits the time portion.
   */

  const getDatePart = (value: string) => {
    return value ? value.split("T")[0] : "";
  };

  const getTimePart = (value: string) => {
    return value?.includes("T") ? value.split("T")[1] : "";
  };

  const updateDateTimeDate = (
    currentValue: string,
    selectedDate: string,
    setValue: (value: string) => void,
  ) => {
    if (!selectedDate) {
      setValue("");
      return;
    }

    const currentTime = getTimePart(currentValue) || "00:00";

    setValue(`${selectedDate}T${currentTime}`);
  };

  const updateDateTimeTime = (
    currentValue: string,
    selectedTime: string,
    setValue: (value: string) => void,
  ) => {
    const currentDate = getDatePart(currentValue);

    if (!currentDate) {
      return;
    }

    setValue(`${currentDate}T${selectedTime}`);
  };

  const toggleLanguage = (language: string) => {
    setAllowedLanguages((current) =>
      current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language],
    );
  };

  const addVisibleTestCase = () => {
    setVisibleTestCases((current) => [
      ...current,
      {
        id: Date.now(),
        input: "",
        output: "",
      },
    ]);
  };

  const addHiddenTestCase = () => {
    setHiddenTestCases((current) => [
      ...current,
      {
        id: Date.now(),
        input: "",
        output: "",
      },
    ]);
  };

  const updateVisibleTestCase = (
    id: number,
    field: "input" | "output",
    value: string,
  ) => {
    setVisibleTestCases((current) =>
      current.map((testCase) =>
        testCase.id === id
          ? { ...testCase, [field]: value }
          : testCase,
      ),
    );
  };

  const updateHiddenTestCase = (
    id: number,
    field: "input" | "output",
    value: string,
  ) => {
    setHiddenTestCases((current) =>
      current.map((testCase) =>
        testCase.id === id
          ? { ...testCase, [field]: value }
          : testCase,
      ),
    );
  };

  const deleteVisibleTestCase = (id: number) => {
    setVisibleTestCases((current) =>
      current.filter((testCase) => testCase.id !== id),
    );
  };

  const deleteHiddenTestCase = (id: number) => {
    setHiddenTestCases((current) =>
      current.filter((testCase) => testCase.id !== id),
    );
  };

  const handleSave = async () => {
    if (!problemTitle.trim()) {
      alert("Please enter a problem title.");
      return;
    }
    const batches = selectedClass === ALL ? classList.filter((b) => b !== ALL) : [selectedClass];
    if (batches.length === 0) {
      alert("Please select a batch. Students only see coding assessments for their batch.");
      return;
    }

    setSaving(true);
    try {
      await codingAssessmentService.create({
        title: problemTitle.trim(),
        batches,
        subject: selectedSubject || "Programming",
        difficulty: (difficulty as "Easy" | "Medium" | "Hard") || "Easy",
        marks: Number(marks) || 10,
        timeLimit: Number(timeLimit) || 2,
        durationMinutes: 60,
        start,
        end,
        problemStatement,
        description,
        inputFormat,
        outputFormat,
        constraints,
        examples,
        memoryLimit,
        allowedLanguages,
        visibleTestCases,
        hiddenTestCases,
      });
      navigate("/coding");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save the coding assessment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex min-w-0 items-center gap-3">
        <Link
          to="/coding"
          className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
        </Link>

        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Create Coding Assessment
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create a coding problem and configure its test cases.
          </p>
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        {/* Problem Information */}
        <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Problem Information
          </h2>

          <div className="space-y-5">
            <div className="grid min-w-0 gap-5 md:grid-cols-2">
              <Field label="Target Class / Batch">
                <CustomSelect
                  value={selectedClass}
                  onChange={(val) => setSelectedClass(String(val))}
                  options={classList}
                  placeholder="Select Class / Batch"
                />
              </Field>

              <Field label="Subject">
                <CustomSelect
                  value={selectedSubject}
                  onChange={(val) => setSelectedSubject(String(val))}
                  options={subjectList.length > 0 ? subjectList : ["General Programming"]}
                  placeholder="Select Subject"
                />
              </Field>
            </div>

            <Field label="Problem Title">
              <input
                value={problemTitle}
                onChange={(e) => setProblemTitle(e.target.value)}
                placeholder="Enter problem title"
                className="input"
              />
            </Field>

            <Field label="Problem Statement">
              <textarea
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="Enter problem statement"
                rows={5}
                className="input resize-none"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter problem description"
                rows={4}
                className="input resize-none"
              />
            </Field>

            <div className="grid min-w-0 gap-5 md:grid-cols-2">
              <Field label="Input Format">
                <textarea
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  placeholder="Describe input format"
                  rows={4}
                  className="input resize-none"
                />
              </Field>

              <Field label="Output Format">
                <textarea
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  placeholder="Describe output format"
                  rows={4}
                  className="input resize-none"
                />
              </Field>
            </div>

            <Field label="Constraints">
              <textarea
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="Enter constraints"
                rows={4}
                className="input resize-none"
              />
            </Field>

            <Field label="Examples">
              <textarea
                value={examples}
                onChange={(e) => setExamples(e.target.value)}
                placeholder="Enter examples"
                rows={5}
                className="input resize-none"
              />
            </Field>
          </div>
        </section>

        {/* Assessment Configuration */}
        <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Assessment Configuration
          </h2>

          <div className="grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Difficulty">
              <CustomSelect
                value={difficulty}
                onChange={(val) => setDifficulty(String(val))}
                options={["Easy", "Medium", "Hard"]}
                placeholder="Select Difficulty"
              />
            </Field>

            <Field label="Marks">
              <input
                type="number"
                min="0"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Time Limit (seconds)">
              <input
                type="number"
                min="1"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Memory Limit (MB)">
              <input
                type="number"
                min="1"
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          {/* Allowed Languages */}
          <div className="mt-5">
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Allowed Languages
            </label>

            <div className="flex flex-wrap gap-3">
              {languages.map((language) => (
                <label
                  key={language}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={allowedLanguages.includes(language)}
                    onChange={() => toggleLanguage(language)}
                  />

                  {language}
                </label>
              ))}
            </div>
          </div>

          {/* Responsive Start and End Date/Time */}
          <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-2">
            {/* Start */}
            <div className="min-w-0 space-y-3">
              <div className="min-w-0">
                <ResponsiveDatePicker
                  label="Start Date"
                  value={getDatePart(start)}
                  minDate="1900-01-01"
                  onChange={(selectedDate) =>
                    updateDateTimeDate(
                      start,
                      selectedDate,
                      setStart,
                    )
                  }
                />
              </div>

              <Field label="Start Time">
                <input
                  type="time"
                  value={getTimePart(start)}
                  onChange={(e) =>
                    updateDateTimeTime(
                      start,
                      e.target.value,
                      setStart,
                    )
                  }
                  disabled={!getDatePart(start)}
                  className="input disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </Field>
            </div>

            {/* End */}
            <div className="min-w-0 space-y-3">
              <div className="min-w-0">
                <ResponsiveDatePicker
                  label="End Date"
                  value={getDatePart(end)}
                  minDate="1900-01-01"
                  onChange={(selectedDate) =>
                    updateDateTimeDate(
                      end,
                      selectedDate,
                      setEnd,
                    )
                  }
                />
              </div>

              <Field label="End Time">
                <input
                  type="time"
                  value={getTimePart(end)}
                  onChange={(e) =>
                    updateDateTimeTime(
                      end,
                      e.target.value,
                      setEnd,
                    )
                  }
                  disabled={!getDatePart(end)}
                  className="input disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Visible Test Cases */}
        <TestCaseSection
          title="Visible Test Cases"
          testCases={visibleTestCases}
          onAdd={addVisibleTestCase}
          onUpdate={updateVisibleTestCase}
          onDelete={deleteVisibleTestCase}
        />

        {/* Hidden Test Cases */}
        <TestCaseSection
          title="Hidden Test Cases"
          testCases={hiddenTestCases}
          onAdd={addHiddenTestCase}
          onUpdate={updateHiddenTestCase}
          onDelete={deleteHiddenTestCase}
        />

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            to="/coding"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={17} />
            {saving ? "Saving…" : "Save Coding Assessment"}
          </button>
        </div>
      </div>

      <style>{`
        .input {
          display: block;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          border-radius: 0.5rem;
          border: 1px solid rgb(209 213 219);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }

        .input:focus {
          border-color: rgb(59 130 246);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function TestCaseSection({
  title,
  testCases,
  onAdd,
  onUpdate,
  onDelete,
}: {
  title: string;
  testCases: TestCase[];
  onAdd: () => void;
  onUpdate: (
    id: number,
    field: "input" | "output",
    value: string,
  ) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {title}
        </h2>

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus size={16} />
          Add Test Case
        </button>
      </div>

      <div className="space-y-4">
        {testCases.map((testCase, index) => (
          <div
            key={testCase.id}
            className="min-w-0 rounded-lg border border-gray-200 p-3 sm:p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-800">
                Test Case {index + 1}
              </h3>

              {testCases.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDelete(testCase.id)}
                  aria-label={`Delete test case ${index + 1}`}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Input
                </label>

                <textarea
                  value={testCase.input}
                  onChange={(e) =>
                    onUpdate(testCase.id, "input", e.target.value)
                  }
                  placeholder="Test case input"
                  rows={4}
                  className="input resize-none"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Expected Output
                </label>

                <textarea
                  value={testCase.output}
                  onChange={(e) =>
                    onUpdate(testCase.id, "output", e.target.value)
                  }
                  placeholder="Expected output"
                  rows={4}
                  className="input resize-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {title === "Hidden Test Cases" && (
        <p className="mt-4 text-xs text-gray-500">
          Hidden test cases are used for evaluation and must not be exposed to
          students.
        </p>
      )}
    </section>
  );
}