'use client';

import { useState } from 'react';

export type Page = 'nya-foretag' | 'sparade-foretag' | 'scraper-details';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold">Company Scraper</h1>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => onPageChange('nya-foretag')}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                currentPage === 'nya-foretag'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              Nya Företag
            </button>
          </li>
          <li>
            <button
              onClick={() => onPageChange('sparade-foretag')}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                currentPage === 'sparade-foretag'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              Sparade Företag
            </button>
          </li>
          <li>
            <button
              onClick={() => onPageChange('scraper-details')}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                currentPage === 'scraper-details'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              Scraper Details
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}