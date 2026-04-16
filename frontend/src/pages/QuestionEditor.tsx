import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import * as qApi from "../api/questionApi.ts";
import type { QuestionApiError, TestCase } from "../api/questionApi.ts";

interface TestCaseInput {
    input: string;
    expected_output: string;
    is_public: boolean;
}

function buildDefaultTestCase(caseNumber: number): TestCaseInput {
    return {
        input: `values = [${caseNumber}]`,
        expected_output: String(caseNumber),
        is_public: true,
    };
}

export default function QuestionEditor() {
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const lockHolder = user?.username || user?.id || "unknown";

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [complexity, setComplexity] = useState("Easy");
    const [topicsStr, setTopicsStr] = useState("");
    const [companiesStr, setCompaniesStr] = useState("");
    const [boilerplateCode, setBoilerplateCode] = useState("");
    const [testCases, setTestCases] = useState<TestCaseInput[]>(
        isEdit ? [] : [buildDefaultTestCase(1)]
    );

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [lockError, setLockError] = useState("");

    const lockAcquired = useRef(false);

    // Load question for editing
    useEffect(() => {
        if (!isEdit || !id) return;
        if (authLoading) return;

        if (!user) {
            setLockError("You must be logged in to edit this question");
            setLoading(false);
            return;
        }

        async function load() {
            setLoading(true);
            setError("");
            try {
                // Acquire lock first
                await qApi.acquireLock(id!, lockHolder);
                lockAcquired.current = true;

                const res = await qApi.getQuestionById(id!);
                const q = res.data;
                setTitle(q.title);
                setDescription(q.description);
                setComplexity(q.complexity);
                setTopicsStr(q.topics.join(", "));
                setCompaniesStr(q.companies.join(", "));
                setBoilerplateCode(q.boilerplate_code || "");
                setTestCases(
                    (q.test_cases || []).map((tc: TestCase) => ({
                        input: tc.input,
                        expected_output: tc.expected_output,
                        is_public: tc.is_public ?? true,
                    }))
                );
            } catch (err) {
                const apiErr = err as QuestionApiError;
                if (apiErr.status === 409) {
                    setLockError(apiErr.data?.error || "Question is locked by another admin");
                } else {
                    setError(apiErr.data?.error || "Failed to load question");
                }
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [id, isEdit, lockHolder, authLoading, user]);

    // Release lock on unmount
    const releaseLockRef = useCallback(() => {
        if (isEdit && id && lockAcquired.current) {
            // Fire-and-forget release
            qApi.releaseLock(id, lockHolder).catch(() => {});
            lockAcquired.current = false;
        }
    }, [id, isEdit, lockHolder]);

    useEffect(() => {
        // On unmount, release lock
        return () => releaseLockRef();
    }, [releaseLockRef]);

    // Also release on browser close/tab change
    useEffect(() => {
        const handleBeforeUnload = () => releaseLockRef();
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [releaseLockRef]);

    // Test case management
    function addTestCase() {
        setTestCases((prev) => [...prev, buildDefaultTestCase(prev.length + 1)]);
    }

    function removeTestCase(index: number) {
        setTestCases((prev) => prev.filter((_, i) => i !== index));
    }

    function updateTestCase(index: number, field: keyof TestCaseInput, value: string | boolean) {
        setTestCases((prev) =>
            prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc))
        );
    }

    // Submit
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSaving(true);

        const topics = topicsStr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const companies = companiesStr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        if (topics.length === 0) {
            setError("At least one topic is required");
            setSaving(false);
            return;
        }

        const body: qApi.QuestionBody = {
            title: title.trim(),
            description: description.trim(),
            topics,
            complexity,
            companies,
            boilerplate_code: boilerplateCode.trim().length > 0 ? boilerplateCode : undefined,
            test_cases: testCases.length > 0 ? testCases : undefined,
        };

        try {
            if (isEdit && id) {
                if (!user) {
                    setError("You must be logged in to save changes");
                    setSaving(false);
                    return;
                }

                await qApi.updateQuestion(id, body, lockHolder);
                // Release lock after successful save
                await qApi.releaseLock(id, lockHolder).catch(() => {});
                lockAcquired.current = false;
                navigate(`/questions/${id}`);
            } else {
                const res = await qApi.createQuestion(body);
                navigate(`/questions/${res.data.id}`);
            }
        } catch (err) {
            const apiErr = err as QuestionApiError;
            const messages = apiErr.data?.errors?.join(", ") || apiErr.data?.error || "Failed to save question";
            setError(messages);
        } finally {
            setSaving(false);
        }
    }

    // Lock error state
    if (lockError) {
        return (
            <div className="p-8">
                <div className="mx-auto max-w-175 rounded-xl bg-white p-6 shadow">
                    <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                        <strong>🔒 Cannot Edit:</strong> {lockError}
                    </div>
                    <Link
                        to={`/questions/${id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-700 no-underline"
                    >
                        ← Back to Question
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex min-h-[calc(100vh-52px)] items-center justify-center">
                <p className="text-lg text-slate-500">Loading…</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mx-auto max-w-175">
                <Link
                    to={isEdit ? `/questions/${id}` : "/questions"}
                    className="mb-4 inline-block text-sm text-indigo-600 hover:text-indigo-700 no-underline"
                >
                    ← {isEdit ? "Back to Question" : "Back to Questions"}
                </Link>

                <div className="rounded-xl bg-white p-6 shadow">
                    <h2 className="m-0 mb-6 text-2xl font-semibold text-slate-900">
                        {isEdit ? "Edit Question" : "New Question"}
                    </h2>

                    {error && (
                        <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-center text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Title */}
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                required
                                maxLength={255}
                                placeholder="e.g. Two Sum"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                required
                                rows={8}
                                maxLength={10000}
                                placeholder="Describe the problem…"
                            />
                        </div>

                        {/* Complexity */}
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Difficulty <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={complexity}
                                onChange={(e) => setComplexity(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                            </select>
                        </div>

                        {/* Topics */}
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Topics <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={topicsStr}
                                onChange={(e) => setTopicsStr(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                required
                                placeholder="e.g. Arrays, Hash Table (comma-separated)"
                            />
                            <p className="mt-1 text-xs text-slate-400">Separate multiple topics with commas</p>
                        </div>

                        {/* Companies */}
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Companies
                            </label>
                            <input
                                type="text"
                                value={companiesStr}
                                onChange={(e) => setCompaniesStr(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                placeholder="e.g. Google, Meta (comma-separated)"
                            />
                            <p className="mt-1 text-xs text-slate-400">Optional, separate with commas</p>
                        </div>

                        {/* Boilerplate */}
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Boilerplate Code
                            </label>
                            <textarea
                                value={boilerplateCode}
                                onChange={(e) => setBoilerplateCode(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                rows={10}
                                placeholder={`def solve(...):\n    # Write starter template here\n    pass`}
                            />
                            <p className="mt-1 text-xs text-slate-400">
                                Optional starter code shown in collaborative execution.
                            </p>
                        </div>

                        {/* Test Cases */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-700">
                                    Test Cases
                                </label>
                                <button
                                    type="button"
                                    className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    onClick={addTestCase}
                                >
                                    + Add Test Case
                                </button>
                            </div>

                            {testCases.length === 0 && (
                                <p className="text-sm text-slate-400">No test cases added yet.</p>
                            )}

                            <div className="space-y-3">
                                {testCases.map((tc, i) => (
                                    <div
                                        key={i}
                                        className="rounded-lg border border-slate-200 p-3"
                                    >
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-500">
                                                Test Case {i + 1}
                                            </span>
                                            <button
                                                type="button"
                                                className="text-xs text-red-500 hover:text-red-700"
                                                onClick={() => removeTestCase(i)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <label className="text-xs font-medium text-slate-500">Input</label>
                                                <textarea
                                                    value={tc.input}
                                                    onChange={(e) => updateTestCase(i, "input", e.target.value)}
                                                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                    rows={2}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500">
                                                    Expected Output
                                                </label>
                                                <textarea
                                                    value={tc.expected_output}
                                                    onChange={(e) =>
                                                        updateTestCase(i, "expected_output", e.target.value)
                                                    }
                                                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                        <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={tc.is_public}
                                                onChange={(e) =>
                                                    updateTestCase(i, "is_public", e.target.checked)
                                                }
                                                className="rounded"
                                            />
                                            Public (visible to contestants)
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 border-t border-slate-100 pt-5">
                            <button
                                type="submit"
                                className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                                disabled={saving}
                            >
                                {saving
                                    ? "Saving…"
                                    : isEdit
                                      ? "Save Changes"
                                      : "Create Question"}
                            </button>
                            <button
                                type="button"
                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => navigate(isEdit ? `/questions/${id}` : "/questions")}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
