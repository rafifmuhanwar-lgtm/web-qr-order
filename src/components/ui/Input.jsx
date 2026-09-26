export default function Input({
    label,
    error,
    className = '',
    ...props
}) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-slate-700">
                    {label}
                </label>
            )}
            <input
                className={`
          w-full px-4 py-2.5 rounded-xl border border-border
          bg-white text-slate-800
          focus:ring-2 focus:ring-primary/20 focus:border-primary
          outline-none transition-all duration-200
          placeholder:text-slate-400
          ${error ? 'border-danger ring-2 ring-danger/20' : ''}
          ${className}
        `}
                {...props}
            />
            {error && <p className="text-xs text-danger">{error}</p>}
        </div>
    );
}
