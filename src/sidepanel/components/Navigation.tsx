import React from 'react';
import {
  Timer,
  Settings,
  FileText,
  Sparkles,
  Award,
  type LucideIcon,
} from 'lucide-react';
import type { TabId } from '../SidePanel';

interface TabItem {
  id: TabId;
  icon: LucideIcon;
  label: string;
}

const tabs: TabItem[] = [
  { id: 'summary', icon: Sparkles, label: 'Summary' },
  { id: 'quiz', icon: Award, label: 'Quiz' },
  { id: 'transcript', icon: FileText, label: 'Transcript' },
  { id: 'timer', icon: Timer, label: 'Timer' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

interface NavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around"
      style={{
        height: '64px',
        backgroundColor: 'rgba(9, 9, 11, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        zIndex: 50,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center justify-center gap-1 border-none bg-transparent"
            style={{
              cursor: 'pointer',
              padding: '8px 4px',
              transition: 'all 150ms ease',
              outline: 'none',
              flex: '1',
              minWidth: '0',
            }}
          >
            <Icon
              size={18}
              strokeWidth={isActive ? 2 : 1.5}
              style={{
                color: isActive ? '#fafafa' : '#52525b',
                transition: 'color 150ms ease',
              }}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#fafafa' : '#52525b',
                transition: 'color 150ms ease',
                letterSpacing: '0.01em',
              }}
            >
              {tab.label}
            </span>

            {/* Active indicator dot */}
            <div
              style={{
                width: '3px',
                height: '3px',
                borderRadius: '50%',
                backgroundColor: '#fafafa',
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scale(1)' : 'scale(0)',
                transition: 'all 150ms ease',
                marginTop: '-2px',
              }}
            />
          </button>
        );
      })}
    </div>
  );
};
