'use client';

import React, { useState } from 'react';

// Aggiorniamo il tipo per includere 'Graph'
export type EditorTabType = 'Graph' | 'Locations' | 'Items' | 'Characters';

interface EditorTabsProps {
  onTabChange: (tab: EditorTabType) => void;
  initialTab?: EditorTabType;
  // Definiamo le schede disponibili
  tabs: EditorTabType[];
}

const EditorTabs: React.FC<EditorTabsProps> = ({ onTabChange, initialTab = 'Graph', tabs }) => {
  const [activeTab, setActiveTab] = useState<EditorTabType>(initialTab);

  const handleTabClick = (tab: EditorTabType) => {
    setActiveTab(tab);
    onTabChange(tab);
  };

  return (
    <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
      <ul className="flex flex-wrap -mb-px text-sm font-medium text-center" role="tablist">
        {tabs.map((tab) => ( // Usiamo la prop 'tabs'
          <li className="mr-2" role="presentation" key={tab}>
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
              }`}
              onClick={() => handleTabClick(tab)}
              role="tab"
              aria-controls={tab.toLowerCase()}
              aria-selected={activeTab === tab}
            >
              {tab}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EditorTabs;