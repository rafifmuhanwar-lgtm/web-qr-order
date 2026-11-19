import React from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-100 text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-secondary">Terjadi Kendala Tampilan</h2>
                            <p className="text-xs text-slate-500 mt-1">
                                {this.state.error?.message || 'Halaman mengalami sedikit masalah saat memuat data.'}
                            </p>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Muat Ulang Halaman</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href = '/';
                                }}
                                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Home className="w-3.5 h-3.5" />
                                <span>Beranda</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
