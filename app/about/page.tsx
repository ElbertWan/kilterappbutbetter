'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-4">
        <Link href="/climbs">
          <button className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </Link>

        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">About</h1>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-100 p-5 space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">What is this?</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                A mobile-friendly web app for browsing climbing routes on Kilter Boards.
                Connect via Web Bluetooth to light up routes on a physical board.
              </p>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Features</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Browse thousands of climbs with real-time stats</li>
                <li>Filter by grade, ascents, quality, and board angle</li>
                <li>Visualize routes before you climb</li>
                <li>Web Bluetooth support for lighting up holds</li>
              </ul>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">About Kilter Boards</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Kilter Boards are modular climbing walls with motorized LED holds that display routes.
                Installed at climbing gyms worldwide.{' '}
                <a
                  href="https://kiltergrips.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 underline underline-offset-2 hover:text-gray-600"
                >
                  kiltergrips.com →
                </a>
              </p>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Privacy</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Uses the Kilter Portal API to fetch public climb data. Credentials are stored only
                in environment variables and never logged or shared.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-300">
            v1.0.0 · Next.js · TypeScript · Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  );
}
