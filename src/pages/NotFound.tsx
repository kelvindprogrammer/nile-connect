import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
        <h1 className="text-6xl font-bold text-teal-400 mb-4">404</h1>
        <p className="text-xl text-gray-400 mb-8">Page not found</p>
        <Link
            to="/onboarding"
            className="px-6 py-3 bg-teal-500 hover:bg-teal-600 rounded-lg text-white font-medium transition-colors"
        >
            Go Home
        </Link>
    </div>
);

export default NotFound;
