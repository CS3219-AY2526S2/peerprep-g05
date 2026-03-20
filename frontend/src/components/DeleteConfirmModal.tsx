import type { ReactNode } from "react";

interface Props {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
    children?: ReactNode;
}

export default function DeleteConfirmModal({
    title,
    message,
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    loading = false,
}: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
                <h2 className="mb-2 text-xl font-semibold text-slate-900">{title}</h2>
                <p className="mb-6 text-sm text-slate-600">{message}</p>

                <div className="flex gap-3 justify-end">
                    <button
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? "Deleting…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
