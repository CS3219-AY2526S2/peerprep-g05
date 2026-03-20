import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import * as qApi from "../api/questionApi.ts";
import type { Question, QuestionLock, QuestionApiError } from "../api/questionApi.ts";
import DeleteConfirmModal from "../components/DeleteConfirmModal.tsx";

const COMPLEXITY_COLORS: Record<string, string> = {
    Easy: "bg-emerald-100 text-emerald-800",
    Medium: "bg-amber-100 text-amber-800",
    Hard: "bg-red-100 text-red-800",
};

export default function QuestionDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [question, setQuestion] = useState<Question | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Lock info
    const [lock, setLock] = useState<QuestionLock | null>(null);

    // Delete modal
    const [showDelete, setShowDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        setError("");

        Promise.all([
            qApi.getQuestionById(id),
            qApi.getLockStatus(id),
        ])
            .then(([qRes, lockRes]) => {
                setQuestion(qRes.data);
                setLock(lockRes.data);
            })
            .catch((err: QuestionApiError) => {
                setError(err.data?.error || "Failed to load question");
            })
            .finally(() => setLoading(false));
    }, [id]);

    async function handleDelete() {
        if (!id) return;
        setDeleting(true);
        try {
            await qApi.deleteQuestion(id);
            navigate("/questions");
        } catch (err) {
            setError((err as QuestionApiError).data?.error || "Failed to delete question");
            setShowDelete(false);
        } finally {
            setDeleting(false);
        }
    }

    function handleEdit() {
        navigate(`/questions/${id}/edit`);
    }

    if (loading) {
        return (
            <div className="flex min-h-[calc(100vh-52px)] items-center justify-center">
                <p className="text-lg text-slate-500">Loading…</p>
            </div>
        );
    }

    if (error || !question) {
        return (
            <div className="p-8">
                <div className="mx-auto max-w-[900px] rounded-xl bg-white p-6 shadow">
                    <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-center text-sm text-red-700">
                        {error || "Question not found"}
                    </div>
                    <Link to="/questions" className="text-sm text-indigo-600 hover:text-indigo-700">
                        ← Back to Questions
                    </Link>
                </div>
            </div>
        );
    }

    const lockedByOther = lock && lock.locked_by !== (user?.username || user?.id);

    return (
        <div className="p-8">
            <div className="mx-auto max-w-[900px]">
                {/* Back link */}
                <Link
                    to="/questions"
                    className="mb-4 inline-block text-sm text-indigo-600 hover:text-indigo-700 no-underline"
                >
                    ← Back to Questions
                </Link>

                {/* Lock banner */}
                {lockedByOther && (
                    <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                        <strong>🔒 Locked:</strong> This question is currently being edited by{" "}
                        <strong>{lock!.locked_by}</strong>.
                    </div>
                )}

                <div className="rounded-xl bg-white p-6 shadow">
                    {/* Header */}
                    <div className="mb-6 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <h1 className="m-0 text-2xl font-semibold text-slate-900">
                                {question.title}
                            </h1>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span
                                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${COMPLEXITY_COLORS[question.complexity]}`}
                                >
                                    {question.complexity}
                                </span>
                                <span className="text-xs text-slate-400">
                                    ID: {question.id}
                                </span>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="flex gap-2 shrink-0">
                                <button
                                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                                    onClick={handleEdit}
                                    disabled={!!lockedByOther}
                                    title={lockedByOther ? `Locked by ${lock!.locked_by}` : "Edit question"}
                                >
                                    Edit
                                </button>
                                <button
                                    className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                                    onClick={() => setShowDelete(true)}
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <h3 className="mb-2 text-sm font-semibold text-slate-700">Description</h3>
                        <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-800 leading-relaxed">
                            {question.description}
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="mb-6">
                        <h3 className="mb-2 text-sm font-semibold text-slate-700">Categories</h3>
                        <div className="flex flex-wrap gap-2">
                            {question.categories.map((c) => (
                                <span
                                    key={c}
                                    className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                                >
                                    {c}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Companies */}
                    {question.companies.length > 0 && (
                        <div className="mb-6">
                            <h3 className="mb-2 text-sm font-semibold text-slate-700">Companies</h3>
                            <div className="flex flex-wrap gap-2">
                                {question.companies.map((c) => (
                                    <span
                                        key={c}
                                        className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                                    >
                                        {c}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Test Cases */}
                    {question.test_cases && question.test_cases.length > 0 && (
                        <div>
                            <h3 className="mb-2 text-sm font-semibold text-slate-700">
                                Test Cases ({question.test_cases.length})
                            </h3>
                            <div className="space-y-3">
                                {question.test_cases.map((tc, i) => (
                                    <div
                                        key={tc.id ?? i}
                                        className="rounded-lg border border-slate-200 p-3"
                                    >
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-500">
                                                Test Case {i + 1}
                                            </span>
                                            {tc.is_public === false && (
                                                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                                    PRIVATE
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <div>
                                                <span className="text-xs font-medium text-slate-500">Input</span>
                                                <pre className="mt-1 rounded bg-slate-50 p-2 text-xs text-slate-800 overflow-x-auto">
                                                    {tc.input}
                                                </pre>
                                            </div>
                                            <div>
                                                <span className="text-xs font-medium text-slate-500">
                                                    Expected Output
                                                </span>
                                                <pre className="mt-1 rounded bg-slate-50 p-2 text-xs text-slate-800 overflow-x-auto">
                                                    {tc.expected_output}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
                        Created: {new Date(question.created_at).toLocaleString()} · Updated:{" "}
                        {new Date(question.updated_at).toLocaleString()}
                    </div>
                </div>
            </div>

            {showDelete && (
                <DeleteConfirmModal
                    title="Delete Question"
                    message={`Are you sure you want to delete "${question.title}"? This cannot be undone.`}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDelete(false)}
                    loading={deleting}
                />
            )}
        </div>
    );
}
