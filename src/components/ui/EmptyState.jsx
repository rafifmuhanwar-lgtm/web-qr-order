import { PackageOpen } from 'lucide-react';

export default function EmptyState({ icon, title = 'Tidak ada data', description = '' }) {
    const IconComponent = icon || PackageOpen;
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <IconComponent className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-600">{title}</h3>
            {description && <p className="text-sm text-slate-400 max-w-xs">{description}</p>}
        </div>
    );
}
