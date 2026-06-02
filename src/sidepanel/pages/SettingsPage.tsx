import React, { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, Info, Key, Brain } from 'lucide-react';
import type { UserSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/utils/constants';

const defaultSettings: UserSettings = DEFAULT_SETTINGS;

// Custom toggle switch component
const ToggleSwitch: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className="relative rounded-full border-none"
    style={{
      width: '38px',
      height: '20px',
      backgroundColor: enabled
        ? 'rgba(255,255,255,0.85)'
        : 'rgba(255,255,255,0.08)',
      cursor: 'pointer',
      transition: 'background-color 200ms ease',
      flexShrink: 0,
      padding: 0,
    }}
  >
    <div
      className="absolute rounded-full"
      style={{
        width: '14px',
        height: '14px',
        top: '3px',
        left: enabled ? '21px' : '3px',
        backgroundColor: enabled ? '#09090b' : 'rgba(255,255,255,0.35)',
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }}
    />
  </button>
);

// Setting row component
const SettingRow: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <div
    className="flex items-center justify-between py-2.5"
    style={{
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}
  >
    <div className="flex-1 pr-3">
      <span style={{ fontSize: '13px', color: '#d4d4d8', fontWeight: 400 }}>
        {label}
      </span>
      {description && (
        <p style={{ fontSize: '11px', color: '#3f3f46', margin: '2px 0 0 0' }}>
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
);

// Section header
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <p
    style={{
      fontSize: '11px',
      fontWeight: 600,
      color: '#52525b',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      margin: '0 0 8px 0',
    }}
  >
    {title}
  </p>
);

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      if (response?.data) {
        setSettings((prev) => ({
          ...prev,
          ...response.data,
          distractions: { ...prev.distractions, ...response.data.distractions },
          timer: { ...prev.timer, ...response.data.timer },
          ai: { ...prev.ai, ...response.data.ai },
        }));
      }
    });
  }, []);

  const updateSettings = useCallback(
    (path: string, value: any) => {
      setSettings((prev) => {
        const keys = path.split('.');
        const updated = JSON.parse(JSON.stringify(prev));
        let obj = updated;
        for (let i = 0; i < keys.length - 1; i++) {
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;

        chrome.runtime.sendMessage({
          type: 'UPDATE_SETTINGS',
          payload: updated,
        });

        return updated;
      });
    },
    []
  );

  const handleExportData = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'EXPORT_DATA' }, (response) => {
      if (response?.data) {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `learntube-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }, []);

  const handleClearData = useCallback(() => {
    if (
      confirm(
        'Are you sure you want to clear all data? This action cannot be undone.'
      )
    ) {
      chrome.runtime.sendMessage({ type: 'CLEAR_DATA' }, () => {
        setSettings(defaultSettings);
      });
    }
  }, []);

  const modelOptions = [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ];

  return (
    <div className="flex flex-col px-4 pt-5 pb-8 gap-6">
      {/* Header */}
      <h1
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#fafafa',
          margin: 0,
          letterSpacing: '-0.02em',
        }}
      >
        Settings
      </h1>

      {/* Learn Mode Section */}
      <div>
        <SectionHeader title="Learn Mode" />
        <div
          className="rounded-xl px-4"
          style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <SettingRow
            label="Auto-activate"
            description="Enable Learn Mode when opening YouTube"
          >
            <ToggleSwitch
              enabled={settings.autoActivate}
              onChange={(val) => updateSettings('autoActivate', val)}
            />
          </SettingRow>
          <SettingRow
            label="Extra Strict"
            description="Blocks browser back and reminds you to stay focused"
          >
            <ToggleSwitch
              enabled={settings.distractions.extraStrictEnabled}
              onChange={(val) =>
                updateSettings('distractions.extraStrictEnabled', val)
              }
            />
          </SettingRow>
        </div>
      </div>

      {/* Distractions Section */}
      <div>
        <SectionHeader title="Distractions" />
        <div
          className="rounded-xl px-4"
          style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <SettingRow label="Hide Home Feed">
            <ToggleSwitch
              enabled={settings.distractions.hideHomeFeed}
              onChange={(val) =>
                updateSettings('distractions.hideHomeFeed', val)
              }
            />
          </SettingRow>
          <SettingRow label="Hide Shorts">
            <ToggleSwitch
              enabled={settings.distractions.hideShorts}
              onChange={(val) =>
                updateSettings('distractions.hideShorts', val)
              }
            />
          </SettingRow>
          <SettingRow label="Hide Comments">
            <ToggleSwitch
              enabled={settings.distractions.hideComments}
              onChange={(val) =>
                updateSettings('distractions.hideComments', val)
              }
            />
          </SettingRow>
          <SettingRow label="Hide Related Videos">
            <ToggleSwitch
              enabled={settings.distractions.hideRelated}
              onChange={(val) =>
                updateSettings('distractions.hideRelated', val)
              }
            />
          </SettingRow>
          <SettingRow label="Hide End Screen">
            <ToggleSwitch
              enabled={settings.distractions.hideEndScreen}
              onChange={(val) =>
                updateSettings('distractions.hideEndScreen', val)
              }
            />
          </SettingRow>
          <SettingRow label="Disable Autoplay">
            <ToggleSwitch
              enabled={settings.distractions.hideAutoplay}
              onChange={(val) =>
                updateSettings('distractions.hideAutoplay', val)
              }
            />
          </SettingRow>
        </div>
      </div>

      {/* Timer Section */}
      <div>
        <SectionHeader title="Timer" />
        <div
          className="rounded-xl px-4"
          style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <SettingRow
            label="Auto-start timer"
            description="Start timer when watching a video"
          >
            <ToggleSwitch
              enabled={settings.timer.autoStart}
              onChange={(val) => updateSettings('timer.autoStart', val)}
            />
          </SettingRow>
          <SettingRow label="Daily goal (minutes)">
            <input
              type="number"
              value={settings.timer.dailyGoalMinutes}
              onChange={(e) =>
                updateSettings(
                  'timer.dailyGoalMinutes',
                  Math.max(5, parseInt(e.target.value) || 5)
                )
              }
              min={5}
              max={480}
              style={{
                width: '64px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                color: '#fafafa',
                fontSize: '13px',
                fontWeight: 500,
                padding: '5px 8px',
                textAlign: 'center',
                outline: 'none',
                transition: 'border-color 150ms ease',
                fontFamily: "'Inter', sans-serif",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')
              }
            />
          </SettingRow>
        </div>
      </div>

      {/* AI Section (Phase 3) */}
      <div>
        <SectionHeader title="AI — Phase 3" />
        <div
          className="rounded-xl px-4 py-3"
          style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* API Key */}
          <div className="py-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Key size={12} color="#52525b" />
              <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 500 }}>
                API Key
              </span>
            </div>
            <input
              type="password"
              value={settings.ai.apiKey}
              onChange={(e) => updateSettings('ai.apiKey', e.target.value)}
              placeholder="sk-..."
              style={{
                width: '100%',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                color: '#fafafa',
                fontSize: '12px',
                padding: '8px 10px',
                outline: 'none',
                fontFamily: "'JetBrains Mono', monospace",
                boxSizing: 'border-box',
                transition: 'border-color 150ms ease',
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')
              }
            />
          </div>

          {/* Model selector */}
          <div className="py-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Brain size={12} color="#52525b" />
              <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 500 }}>
                Model
              </span>
            </div>
            <select
              value={settings.ai.model}
              onChange={(e) => updateSettings('ai.model', e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                color: '#fafafa',
                fontSize: '12px',
                padding: '8px 10px',
                outline: 'none',
                fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box',
                cursor: 'pointer',
                appearance: 'none',
                transition: 'border-color 150ms ease',
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')
              }
            >
              {modelOptions.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  style={{
                    backgroundColor: '#18181b',
                    color: '#fafafa',
                  }}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <p style={{ fontSize: '10px', color: '#3f3f46', margin: '8px 0 4px 0' }}>
            AI features will be available in Phase 3.
          </p>
        </div>
      </div>

      {/* Data Section */}
      <div>
        <SectionHeader title="Data" />
        <div className="flex gap-3">
          <button
            onClick={handleExportData}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 border-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#d4d4d8',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = '#fafafa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.color = '#d4d4d8';
            }}
          >
            <Download size={14} />
            <span>Export Data</span>
          </button>

          <button
            onClick={handleClearData}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 border-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#71717a',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = '#fafafa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.color = '#71717a';
            }}
          >
            <Trash2 size={14} />
            <span>Clear Data</span>
          </button>
        </div>
      </div>

      {/* About Section */}
      <div>
        <SectionHeader title="About" />
        <div
          className="rounded-xl px-4 py-3.5 flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex items-center gap-2">
            <Info size={13} color="#3f3f46" />
            <span style={{ fontSize: '13px', color: '#71717a' }}>LearnTube</span>
          </div>
          <span
            style={{
              fontSize: '11px',
              color: '#3f3f46',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            v1.0.0
          </span>
        </div>
      </div>
    </div>
  );
};
