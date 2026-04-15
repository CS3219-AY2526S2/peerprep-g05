import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as qApi from "../api/questionApi.ts";
import type { QuestionApiError, UserAttemptHistory, UserQuestionProgress } from "../api/questionApi.ts";
import { useAuth } from "../context/AuthContext.tsx";

const COMPLEXITY_COLORS: Record<string, string> = {
    Easy: "bg-emerald-100 text-emerald-800",
    Medium: "bg-amber-100 text-amber-800",
    Hard: "bg-red-100 text-red-800",
};

function formatDate(value: string | null) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString();
}

function HistoryTable({
    title,
    subtitle,
    rows,
}: {
    title: string;
    subtitle: string;
    rows: UserQuestionProgress[];
}) {
    const navigate = useNavigate();

    return (
        <section className="rounded-xl bg-white shadow overflow-x-auto">
            <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="m-0 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </div>

            {rows.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">No questions yet.</div>
            ) : (
                <table className="w-full min-w-190 border-collapse">
                    <thead>
                        <tr>
                            <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">#</th>
                            <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Question</th>
                            <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Difficulty</th>
                            <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Topics</th>
                            <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Attempted At</th>
                            <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Completed At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((item) => {
                            const normalizedComplexity = item.complexity || "Unknown";
                            const topics = Array.isArray(item.topics) ? item.topics : [];

                            return (
                                <tr
                                    key={`${item.status}-${item.question_id}`}
                                    className="cursor-pointer transition-colors hover:bg-slate-50"
                                    onClick={() => navigate(`/questions/${item.question_id}`)}
                                >
                                    <td className="border-b border-slate-100 px-4 py-3 align-middle text-sm font-mono text-slate-500">
                                        {item.question_id}
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-3 align-middle text-sm font-medium text-slate-900">
                                        {item.title || `Question ${item.question_id}`}
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-3 align-middle">
                                        <span
                                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${COMPLEXITY_COLORS[normalizedComplexity] || "bg-slate-100 text-slate-600"}`}
                                        >
                                            {normalizedComplexity}
                                        </span>
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-3 align-middle text-sm text-slate-600">
                                        {topics.length > 0 ? topics.join(", ") : "-"}
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-3 align-middle text-sm text-slate-600">
                                        {formatDate(item.attempted_at)}
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-3 align-middle text-sm text-slate-600">
                                        {formatDate(item.completed_at)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </section>
    );
}

export default function AttemptHistory() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [history, setHistory] = useState<UserAttemptHistory | null>(null);

    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            setError("User profile is unavailable.");
            return;
        }

        setLoading(true);
        setError("");

        qApi
            .getUserAttemptHistory(user.id, true, true)
            .then((res) => {
                setHistory(res.data);
            })
            .catch((err: QuestionApiError) => {
                setError(err.data?.error || "Failed to fetch attempt history");
            })
            .finally(() => {
                setLoading(false);
            });
    }, [user?.id]);

    const completedRows = useMemo(() => history?.completed_questions || [], [history]);
    const attemptedRows = useMemo(() => history?.attempted_questions || [], [history]);

    return (
        <div className="p-8">
            <div className="mx-auto max-w-300">
                <div className="mb-6">
                    <h2 className="m-0 text-2xl font-semibold text-slate-900">Attempt History</h2>
                    <p className="mt-1 text-slate-600">A record of questions you have attempted and completed.</p>
                </div>

                {loading ? (
                    <div className="rounded-xl bg-white py-16 text-center text-slate-500 shadow">Loading attempt history...</div>
                ) : error ? (
                    <div className="rounded-md bg-red-100 px-3 py-2 text-center text-sm text-red-700">{error}</div>
                ) : (
                    <>
                        <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed</p>
                                <p className="mt-2 text-2xl font-bold text-emerald-900">{history?.total_completed_questions || 0}</p>
                            </article>
                            <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-amber-700">Attempted</p>
                                <p className="mt-2 text-2xl font-bold text-amber-900">{history?.total_attempted_questions || 0}</p>
                            </article>
                            <article className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-sky-700">Total Progress</p>
                                <p className="mt-2 text-2xl font-bold text-sky-900">
                                    {(history?.total_completed_questions || 0) + (history?.total_attempted_questions || 0)}
                                </p>
                            </article>
                        </section>

                        <div className="space-y-5">
                            <HistoryTable
                                title="Completed Questions"
                                subtitle="Great work. These are the problems you fully solved."
                                rows={completedRows}
                            />
                            <HistoryTable
                                title="Attempted Questions"
                                subtitle="These are in progress and ready for your next push."
                                rows={attemptedRows}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
