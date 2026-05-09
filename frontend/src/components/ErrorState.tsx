interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-md border-2 border-brown bg-white p-4 text-ink"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h3 className="font-bold text-brown">Error: {title}</h3>
          <p className="text-sm mt-1">{message}</p>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm rounded-md border border-brown px-3 py-1.5 bg-white text-brown hover:bg-gold hover:text-white"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
