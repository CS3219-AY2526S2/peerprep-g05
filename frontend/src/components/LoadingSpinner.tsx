export function LoadingSpinner() {
  return (
    <div className="h-full w-full justify-center items-center flex">
      <div className="w-16 h-16 border-y-8 border-blue-400 rounded-full animate-spin"></div>
      <p className="px-2 text-3xl animate-pulse">Loading...</p>
    </div>
  );
}
