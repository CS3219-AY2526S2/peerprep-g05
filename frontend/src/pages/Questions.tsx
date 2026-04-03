import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import * as qApi from "../api/questionApi.ts";
import type { Question, QuestionFilters, QuestionApiError } from "../api/questionApi.ts";
import DeleteConfirmModal from "../components/DeleteConfirmModal.tsx";
import { isAdminRole } from "../utils/roles.ts";

const COMPLEXITY_COLORS: Record<string, string> = {
    Easy: "bg-emerald-100 text-emerald-800",
    Medium: "bg-amber-100 text-amber-800",
    Hard: "bg-red-100 text-red-800",
};

export default function Questions() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const isAdmin = isAdminRole(user?.role);

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [search, setSearch] = useState("");
    const [complexity, setComplexity] = useState("");
    const [topic, setTopic] = useState("");
    const [company, setCompany] = useState("");

    // Filter options
    const [topics, setTopics] = useState<string[]>([]);
    const [companies, setCompanies] = useState<string[]>([]);

    // Delete modal
    const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Load filter options
    useEffect(() => {
        qApi.getTopics().then((r) => setTopics(r.data)).catch(() => {});
        qApi.getCompanies().then((r) => setCompanies(r.data)).catch(() => {});
    }, []);

    // Load questions
    const loadQuestions = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const filters: QuestionFilters = { page, limit: 20 };
            if (search) filters.search = search;
            if (complexity) filters.complexity = complexity;
            if (topic) filters.topic = topic;
            if (company) filters.company = company;

            const res = await qApi.getAllQuestions(filters);
            setQuestions(res.data);
            setTotalPages(res.pagination.totalPages);
            setTotal(res.pagination.total);
        } catch (err) {
            setError((err as QuestionApiError).data?.error || "Failed to fetch questions");
        } finally {
            setLoading(false);
        }
    }, [page, search, complexity, topic, company]);

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    // Search with debounce via re-render
    const [searchInput, setSearchInput] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await qApi.deleteQuestion(deleteTarget.id, token || undefined);
            setDeleteTarget(null);
            loadQuestions();
        } catch (err) {
            setError((err as QuestionApiError).data?.error || "Failed to delete question");
            setDeleteTarget(null);
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="p-8">
            <div className="mx-auto max-w-[1200px]">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="m-0 text-2xl font-semibold text-slate-900">Questions</h2>
                        <p className="mt-1 text-slate-600">
                            {total} question{total !== 1 ? "s" : ""} total
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                            onClick={() => navigate("/questions/new")}
                        >
                            + Add Question
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="mb-4 rounded-xl bg-white p-4 shadow">
                    <div className="flex flex-wrap gap-3">
                        <input
                            type="text"
                            placeholder="Search questions…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-64"
                        />
                        <select
                            value={complexity}
                            onChange={(e) => { setComplexity(e.target.value); setPage(1); }}
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                            <option value="">All Difficulties</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                        <select
                            value={topic}
                            onChange={(e) => { setTopic(e.target.value); setPage(1); }}
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                            <option value="">All Topics</option>
                            {topics.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <select
                            value={company}
                            onChange={(e) => { setCompany(e.target.value); setPage(1); }}
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                            <option value="">All Companies</option>
                            {companies.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="mb-3 rounded-md bg-red-100 px-3 py-2 text-center text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Table */}
                <div className="rounded-xl bg-white shadow overflow-x-auto">
                    {loading ? (
                        <div className="py-16 text-center text-slate-500">Loading questions…</div>
                    ) : questions.length === 0 ? (
                        <div className="py-16 text-center text-slate-500">No questions found.</div>
                    ) : (
                        <table className="min-w-[800px] w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                        #
                                    </th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                        Title
                                    </th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                        Difficulty
                                    </th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                        Topics
                                    </th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                        Companies
                                    </th>
                                    {isAdmin && (
                                        <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {questions.map((q) => {
                                    const topics = Array.isArray(q.topics) ? q.topics : [];
                                    const companies = Array.isArray(q.companies) ? q.companies : [];

                                    return (
                                    <tr
                                        key={q.id}
                                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => navigate(`/questions/${q.id}`)}
                                    >
                                        <td className="border-b border-slate-100 px-4 py-3 align-middle text-sm text-slate-500 font-mono">
                                            {q.id}
                                        </td>
                                        <td className="border-b border-slate-100 px-4 py-3 align-middle font-medium text-slate-900">
                                            {q.title}
                                        </td>
                                        <td className="border-b border-slate-100 px-4 py-3 align-middle">
                                            <span
                                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${COMPLEXITY_COLORS[q.complexity] || ""}`}
                                            >
                                                {q.complexity}
                                            </span>
                                        </td>
                                        <td className="border-b border-slate-100 px-4 py-3 align-middle">
                                            <div className="flex flex-wrap gap-1">
                                                {topics.slice(0, 3).map((c) => (
                                                    <span
                                                        key={c}
                                                        className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                                                    >
                                                        {c}
                                                    </span>
                                                ))}
                                                {topics.length > 3 && (
                                                    <span className="text-xs text-slate-400">
                                                        +{topics.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="border-b border-slate-100 px-4 py-3 align-middle text-sm text-slate-600">
                                            {companies.length > 0
                                                ? companies.slice(0, 2).join(", ") +
                                                  (companies.length > 2 ? ` +${companies.length - 2}` : "")
                                                : "—"}
                                        </td>
                                        {isAdmin && (
                                            <td className="border-b border-slate-100 px-4 py-3 align-middle">
                                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                        onClick={() => navigate(`/questions/${q.id}/edit`)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="rounded border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                        onClick={() => setDeleteTarget(q)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                        <button
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            ← Previous
                        </button>
                        <span className="px-3 text-sm text-slate-600">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {deleteTarget && (
                <DeleteConfirmModal
                    title="Delete Question"
                    message={`Are you sure you want to delete "${deleteTarget.title}"? This cannot be undone.`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                    loading={deleting}
                />
            )}
        </div>
    );
}
