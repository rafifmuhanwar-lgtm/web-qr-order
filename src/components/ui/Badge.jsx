const statusStyles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    on_delivery: 'bg-orange-100 text-orange-700 border-orange-200',
    ready: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    unavailable: 'bg-red-100 text-red-700 border-red-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const statusLabels = {
    pending: 'Menunggu',
    processing: 'Diproses',
    on_delivery: 'Sedang Diantar',
    ready: 'Siap Diambil',
    completed: 'Selesai',
    available: 'Tersedia',
    unavailable: 'Habis',
    cancelled: 'Dibatalkan',
};

export default function Badge({ status, className = '' }) {
    return (
        <span
            className={`
        inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
        border ${statusStyles[status] || 'bg-slate-100 text-slate-600 border-slate-200'}
        ${className}
      `}
        >
            {statusLabels[status] || status}
        </span>
    );
}
