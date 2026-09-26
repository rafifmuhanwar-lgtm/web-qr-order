import { Outlet } from 'react-router-dom';

export default function CustomerLayout() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-light/30 to-white">
            <main className="max-w-lg mx-auto pb-24">
                <Outlet />
            </main>
        </div>
    );
}
