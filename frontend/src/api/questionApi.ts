import { GATEWAY_URL } from "../utils/types";

const QUESTION_BASE = `${GATEWAY_URL}/api/v1`;

// ── Types ─────────────────────────────────────────────

export interface Question {
    id: number;
    title: string;
    description: string;
    topics: string[];
    complexity: "Easy" | "Medium" | "Hard";
    companies: string[];
    created_at: string;
    updated_at: string;
    test_cases?: TestCase[];
}

export interface TestCase {
    id?: number;
    question_id?: number;
    input: string;
    expected_output: string;
    is_public?: boolean;
    order_index?: number;
}

export interface QuestionLock {
    question_id: number;
    locked_by: string;
    locked_at: string;
}

export interface PaginatedResponse {
    success: boolean;
    data: Question[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        links: { self: string; next: string | null; prev: string | null };
    };
}

interface SingleResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    errors?: string[];
}

export interface QuestionApiError {
    status: number;
    data: { error?: string; errors?: string[]; data?: QuestionLock } | null;
}

export type CompletionStatus = "ATTEMPTED" | "COMPLETED";

export interface UserQuestionProgress {
    question_id: number;
    status: CompletionStatus;
    attempted_at: string | null;
    completed_at: string | null;
    title?: string;
    complexity?: string;
    topics?: string[];
}

export interface UserAttemptHistory {
    user_id: string;
    total_completed_questions: number;
    total_attempted_questions: number;
    completed_questions: UserQuestionProgress[];
    attempted_questions?: UserQuestionProgress[];
}

interface RawQuestion extends Omit<Question, "topics"> {
    categories?: string[];
    topics?: string[];
}

// ── Helpers ───────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const mergedHeaders: HeadersInit = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    const res = await fetch(`${QUESTION_BASE}${path}`, {
        credentials: "include",
        ...options,
        headers: mergedHeaders,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw { status: res.status, data } as QuestionApiError;
    return data as T;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === "string");
}

function normalizeQuestion(raw: RawQuestion): Question {
    return {
        ...raw,
        topics: asStringArray(raw.topics ?? raw.categories),
        companies: asStringArray(raw.companies),
    };
}

// ── Questions ─────────────────────────────────────────

export interface QuestionFilters {
    page?: number;
    limit?: number;
    complexity?: string;
    topic?: string;
    company?: string;
    search?: string;
}

export function getAllQuestions(filters: QuestionFilters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.complexity) params.set("complexity", filters.complexity);
    if (filters.topic) params.set("topic", filters.topic);
    if (filters.company) params.set("company", filters.company);
    if (filters.search) params.set("search", filters.search);
    const qs = params.toString();
    return request<PaginatedResponse>(`/questions${qs ? `?${qs}` : ""}`).then((res) => ({
        ...res,
        data: (res.data || []).map((q) => normalizeQuestion(q as RawQuestion)),
    }));
}

export function getQuestionById(id: number | string) {
    return request<SingleResponse<RawQuestion>>(`/questions/${id}?include_private=true`).then((res) => ({
        ...res,
        data: normalizeQuestion(res.data),
    }));
}

export interface QuestionBody {
    title: string;
    description: string;
    topics: string[];
    complexity: string;
    companies?: string[];
    test_cases?: Omit<TestCase, "id" | "question_id" | "order_index">[];
}

export function createQuestion(body: QuestionBody) {
    return request<SingleResponse<RawQuestion>>("/questions", {
        method: "POST",
        body: JSON.stringify({
            ...body,
            topics: body.topics,
        }),
    }).then((res) => ({
        ...res,
        data: normalizeQuestion(res.data),
    }));
}

export function updateQuestion(
    id: number | string,
    body: Partial<QuestionBody>,
    lockHolder?: string
) {
    const headers: HeadersInit = {
        ...(lockHolder ? { "x-lock-holder": lockHolder } : {}),
    };

    return request<SingleResponse<RawQuestion>>(`/questions/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
            ...body,
            ...(body.topics ? { topics: body.topics } : {}),
        }),
    }).then((res) => ({
        ...res,
        data: normalizeQuestion(res.data),
    }));
}

export function deleteQuestion(id: number | string) {
    return request<{ success: boolean; message: string }>(`/questions/${id}`, {
        method: "DELETE",
    });
}

// ── Topics & Companies ────────────────────────────────

export function getTopics() {
    return request<SingleResponse<string[]>>("/questions/topics");
}

export function getCompanies() {
    return request<SingleResponse<string[]>>("/questions/companies");
}

// ── Locks ─────────────────────────────────────────────

export function acquireLock(id: number | string, lockedBy: string) {
    return request<SingleResponse<QuestionLock>>(`/questions/${id}/lock`, {
        method: "POST",
        body: JSON.stringify({ locked_by: lockedBy }),
    });
}

export function releaseLock(id: number | string, lockedBy: string) {
    return request<{ success: boolean; message: string }>(`/questions/${id}/lock`, {
        method: "DELETE",
        body: JSON.stringify({ locked_by: lockedBy }),
    });
}

export function getLockStatus(id: number | string) {
    return request<SingleResponse<QuestionLock | null>>(`/questions/${id}/lock`);
}

// ── User Progress ────────────────────────────────────

export function getUserAttemptHistory(userId: string, includeAttempted = true, includeDetails = true) {
    const params = new URLSearchParams();
    params.set("include_attempted", String(includeAttempted));
    params.set("include_details", String(includeDetails));

    return request<SingleResponse<UserAttemptHistory>>(
        `/questions/completions/users/${encodeURIComponent(userId)}?${params.toString()}`
    );
}
