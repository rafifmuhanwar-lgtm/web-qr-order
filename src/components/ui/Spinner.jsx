import { Loader2 } from 'lucide-react';

export default function Spinner({ text = 'Memuat...' }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <p className="text-sm text-slate-500 font-medium">{text}</p>
        </div>
    );
}
