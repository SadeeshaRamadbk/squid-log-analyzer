'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  Database,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Clock,
  ArrowLeft,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  Server,
  Network,
  Sliders,
  Bell,
  Mail,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { formatNumber } from '@/lib/formatters';
import { AuditLogTable } from '@/components/settings/AuditLogTable';

interface UserItem {
  id: number;
  username: string;
  role: 'admin' | 'viewer';
  createdAt: number;
}

interface SystemSettingsData {
  timezone: string;
  lanCidrs: string[];
  firewallIp: string;
  squidPort: number;
  hideFirewallTraffic: boolean;
  hideProxyHop: boolean;
  retentionDaysSquid: number;
  retentionDaysFlows: number;
  anonymizeExports: boolean;
}

interface StorageStats {
  rawLogCount: number;
  summaryCount: number;
  squid: {
    rawLogCount: number;
    summaryCount: number;
    retentionDays: number;
  };
  netflow: {
    rawFlowCount: number;
    minuteRollupCount: number;
    hourlyRollupCount: number;
    summaryCount: number;
    retentionDays: number;
  };
  dbSizeBytes: number;
  dbSizeFormatted: string;
  lastRun: {
    executedAt: string;
    squidDeleted: number;
    netflowDeleted: number;
  } | null;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  // Active Tab: 'users' | 'password' | 'retention' | 'network' | 'alerts' | 'audit' | 'appearance'
  const initialTab = (searchParams.get('tab') as any) || 'users';
  const [activeTab, setActiveTab] = useState<'users' | 'password' | 'retention' | 'network' | 'alerts' | 'audit' | 'appearance'>(initialTab);
  const [currentDensity, setCurrentDensity] = useState<'compact' | 'normal' | 'comfortable'>('normal');
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      const d = (localStorage.getItem('app-density') as any) || 'normal';
      setCurrentDensity(d);
      const t = (localStorage.getItem('app-theme') as any) || 'dark';
      setCurrentTheme(t);
    } catch {}
  }, []);

  const handleSetDensity = (d: 'compact' | 'normal' | 'comfortable') => {
    setCurrentDensity(d);
    try {
      localStorage.setItem('app-density', d);
      document.documentElement.setAttribute('data-density', d);
      window.dispatchEvent(new CustomEvent('density-change', { detail: { density: d } }));
    } catch {}
  };

  const handleSetTheme = (t: 'dark' | 'light') => {
    setCurrentTheme(t);
    try {
      localStorage.setItem('app-theme', t);
      if (t === 'light') {
        document.documentElement.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
      }
    } catch {}
  };

  useEffect(() => {
    document.title = 'Settings & Access Control - Squid Analyzer';
  }, []);

  // User Accounts State
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'viewer'>('viewer');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change Password State (Current User)
  const [currentPassword, setCurrentPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showChangeNewPassword, setShowChangeNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Retention & System Settings State
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pruningLogs, setPruningLogs] = useState(false);
  const [pruneMsg, setPruneMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Retention Edit Fields
  const [retentionSquid, setRetentionSquid] = useState<number>(60);
  const [retentionFlows, setRetentionFlows] = useState<number>(7);

  // Network Edit Fields
  const [timezone, setTimezone] = useState('Asia/Colombo');
  const [squidPort, setSquidPort] = useState(3128);
  const [firewallIp, setFirewallIp] = useState('192.168.0.1');
  const [hideFirewallTraffic, setHideFirewallTraffic] = useState(true);
  const [hideProxyHop, setHideProxyHop] = useState(true);
  const [anonymizeExports, setAnonymizeExports] = useState(false);

  // Alert Thresholds & Notification State
  const [blockedSpikeThreshold, setBlockedSpikeThreshold] = useState<number>(25);
  const [uploadSpikeThresholdMb, setUploadSpikeThresholdMb] = useState<number>(100);
  const [repeatedDeniedThreshold, setRepeatedDeniedThreshold] = useState<number>(8);
  const [fanoutThreshold, setFanoutThreshold] = useState<number>(35);
  const [portScanThreshold, setPortScanThreshold] = useState<number>(12);
  const [autoExpireHours, setAutoExpireHours] = useState<number>(24);

  const [smtpEnabled, setSmtpEnabled] = useState<boolean>(false);
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpSecure, setSmtpSecure] = useState<boolean>(false);
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPass, setSmtpPass] = useState<string>('');
  const [smtpFrom, setSmtpFrom] = useState<string>('');
  const [smtpTo, setSmtpTo] = useState<string>('');
  const [minSeverityForEmail, setMinSeverityForEmail] = useState<'critical' | 'high' | 'medium' | 'low'>('high');

  const [webhookEnabled, setWebhookEnabled] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [webhookSecret, setWebhookSecret] = useState<string>('');
  const [minSeverityForWebhook, setMinSeverityForWebhook] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');

  const [savingAlerts, setSavingAlerts] = useState<boolean>(false);
  const [alertsMsg, setAlertsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingEmail, setTestingEmail] = useState<boolean>(false);
  const [testingWebhook, setTestingWebhook] = useState<boolean>(false);
  const [testNotificationMsg, setTestNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin Reset User Password Modal State
  const [resetTargetUser, setResetTargetUser] = useState<UserItem | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resettingUser, setResettingUser] = useState(false);

  // Load Users
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsersList(data.users);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load Settings & Storage Stats
  const fetchSettingsAndStorage = async () => {
    try {
      setLoadingSettings(true);
      const [settingsRes, storageRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/retention'),
      ]);

      const settingsData = await settingsRes.json();
      const storageData = await storageRes.json();

      if (settingsData.success && settingsData.settings) {
        const s = settingsData.settings as any;
        setRetentionSquid(s.retentionDaysSquid ?? 60);
        setRetentionFlows(s.retentionDaysFlows ?? 7);
        setTimezone(s.timezone || 'Asia/Colombo');
        setSquidPort(s.squidPort || 3128);
        setFirewallIp(s.firewallIp || '192.168.0.1');
        setHideFirewallTraffic(s.hideFirewallTraffic ?? true);
        setHideProxyHop(s.hideProxyHop ?? true);
        setAnonymizeExports(s.anonymizeExports ?? false);

        setBlockedSpikeThreshold(s.blockedSpikeThreshold ?? 25);
        setUploadSpikeThresholdMb(s.uploadSpikeThresholdMb ?? 100);
        setRepeatedDeniedThreshold(s.repeatedDeniedThreshold ?? 8);
        setFanoutThreshold(s.fanoutThreshold ?? 35);
        setPortScanThreshold(s.portScanThreshold ?? 12);
        setAutoExpireHours(s.autoExpireHours ?? 24);

        setSmtpEnabled(s.smtpEnabled ?? false);
        setSmtpHost(s.smtpHost ?? '');
        setSmtpPort(s.smtpPort ?? 587);
        setSmtpSecure(s.smtpSecure ?? false);
        setSmtpUser(s.smtpUser ?? '');
        setSmtpPass(s.smtpPass ?? '');
        setSmtpFrom(s.smtpFrom ?? '');
        setSmtpTo(s.smtpTo ?? '');
        setMinSeverityForEmail(s.minSeverityForEmail || 'high');

        setWebhookEnabled(s.webhookEnabled ?? false);
        setWebhookUrl(s.webhookUrl ?? '');
        setWebhookSecret(s.webhookSecret ?? '');
        setMinSeverityForWebhook(s.minSeverityForWebhook || 'medium');
      }

      if (storageData.success) {
        setStorageStats(storageData);
      }
    } catch (err: any) {
      console.warn('Failed to load settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchSettingsAndStorage();
    }
  }, [user]);

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionMsg(null);
    if (!newUsername.trim() || !newPassword) {
      setUserActionMsg({ type: 'error', text: 'Username and password are required' });
      return;
    }

    try {
      setCreatingUser(true);
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUserActionMsg({ type: 'success', text: `User account "${newUsername}" created successfully.` });
        setNewUsername('');
        setNewPassword('');
        setNewRole('viewer');
        fetchUsers();
      } else {
        setUserActionMsg({ type: 'error', text: data.error || 'Failed to create user' });
      }
    } catch (err: any) {
      setUserActionMsg({ type: 'error', text: err.message || 'Network error occurred' });
    } finally {
      setCreatingUser(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user account "${username}"?`)) {
      return;
    }

    setUserActionMsg(null);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setUserActionMsg({ type: 'success', text: `User "${username}" deleted successfully.` });
        fetchUsers();
      } else {
        setUserActionMsg({ type: 'error', text: data.error || 'Failed to delete user' });
      }
    } catch (err: any) {
      setUserActionMsg({ type: 'error', text: err.message || 'Network error occurred' });
    }
  };

  // Handle Role Toggle
  const handleToggleRole = async (targetUser: UserItem) => {
    const nextRole = targetUser.role === 'admin' ? 'viewer' : 'admin';
    if (!confirm(`Change role for "${targetUser.username}" to ${nextRole.toUpperCase()}?`)) {
      return;
    }

    setUserActionMsg(null);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser.id, role: nextRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUserActionMsg({ type: 'success', text: `Updated ${targetUser.username} role to ${nextRole}.` });
        fetchUsers();
      } else {
        setUserActionMsg({ type: 'error', text: data.error || 'Failed to update role' });
      }
    } catch (err: any) {
      setUserActionMsg({ type: 'error', text: err.message || 'Network error occurred' });
    }
  };

  // Handle Admin Password Reset for another user
  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetPasswordVal) return;

    setUserActionMsg(null);
    try {
      setResettingUser(true);
      const res = await fetch('/api/auth/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetTargetUser.id, newPassword: resetPasswordVal }),
      });
      const data = await res.json();
      if (data.success) {
        setUserActionMsg({ type: 'success', text: `Password for "${resetTargetUser.username}" was reset successfully.` });
        setResetTargetUser(null);
        setResetPasswordVal('');
      } else {
        setUserActionMsg({ type: 'error', text: data.error || 'Failed to reset password' });
      }
    } catch (err: any) {
      setUserActionMsg({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setResettingUser(false);
    }
  };

  // Handle Change Own Password
  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (changeNewPassword !== confirmNewPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    if (changeNewPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    try {
      setChangingPassword(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword: changeNewPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPasswordMsg({ type: 'success', text: 'Your account password has been updated successfully.' });
        setCurrentPassword('');
        setChangeNewPassword('');
        setConfirmNewPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: data.error || 'Failed to change password.' });
      }
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Network error occurred.' });
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle Save Retention Settings
  const handleSaveRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMsg(null);

    try {
      setSavingSettings(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retentionDaysSquid: Number(retentionSquid),
          retentionDaysFlows: Number(retentionFlows),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSettingsMsg({
          type: 'success',
          text: `Retention durations saved: Squid kept for ${retentionSquid} days, NetFlow flows for ${retentionFlows} days.`,
        });
        fetchSettingsAndStorage();
      } else {
        setSettingsMsg({ type: 'error', text: data.error || 'Failed to save retention settings.' });
      }
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: err.message || 'Network error occurred.' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Manual Retention Prune Job
  const handleRunPruneNow = async () => {
    if (!confirm(`Run manual log pruning now? All Squid logs older than ${retentionSquid} days and flows older than ${retentionFlows} days will be deleted.`)) {
      return;
    }

    setPruneMsg(null);
    try {
      setPruningLogs(true);
      const res = await fetch('/api/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squidDays: Number(retentionSquid),
          netflowDays: Number(retentionFlows),
          runVacuum: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setPruneMsg({
          type: 'success',
          text: `Prune complete: Removed ${formatNumber(data.result.squidDeletedRows)} Squid logs and ${formatNumber(data.result.netflowDeletedRows)} NetFlow flows.`,
        });
        fetchSettingsAndStorage();
      } else {
        setPruneMsg({ type: 'error', text: data.error || 'Failed to execute retention prune.' });
      }
    } catch (err: any) {
      setPruneMsg({ type: 'error', text: err.message || 'Network error occurred.' });
    } finally {
      setPruningLogs(false);
    }
  };

  // Handle Save Network & System Preferences
  const handleSaveNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMsg(null);

    try {
      setSavingSettings(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          squidPort: Number(squidPort),
          firewallIp: firewallIp.trim(),
          hideFirewallTraffic,
          hideProxyHop,
          anonymizeExports,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSettingsMsg({ type: 'success', text: 'System preferences updated successfully.' });
        fetchSettingsAndStorage();
      } else {
        setSettingsMsg({ type: 'error', text: data.error || 'Failed to save preferences.' });
      }
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: err.message || 'Network error occurred.' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Save Alert & Notification Preferences
  const handleSaveAlertSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertsMsg(null);

    try {
      setSavingAlerts(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockedSpikeThreshold: Number(blockedSpikeThreshold),
          uploadSpikeThresholdMb: Number(uploadSpikeThresholdMb),
          repeatedDeniedThreshold: Number(repeatedDeniedThreshold),
          fanoutThreshold: Number(fanoutThreshold),
          portScanThreshold: Number(portScanThreshold),
          autoExpireHours: Number(autoExpireHours),
          smtpEnabled,
          smtpHost: smtpHost.trim(),
          smtpPort: Number(smtpPort),
          smtpSecure,
          smtpUser: smtpUser.trim(),
          smtpPass: smtpPass.trim(),
          smtpFrom: smtpFrom.trim(),
          smtpTo: smtpTo.trim(),
          minSeverityForEmail,
          webhookEnabled,
          webhookUrl: webhookUrl.trim(),
          webhookSecret: webhookSecret.trim(),
          minSeverityForWebhook,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAlertsMsg({ type: 'success', text: 'Alert thresholds and notification dispatch settings updated successfully.' });
        fetchSettingsAndStorage();
      } else {
        setAlertsMsg({ type: 'error', text: data.error || 'Failed to save alert settings.' });
      }
    } catch (err: any) {
      setAlertsMsg({ type: 'error', text: err.message || 'Network error occurred.' });
    } finally {
      setSavingAlerts(false);
    }
  };

  // Handle Test Notification Channel
  const handleTestNotification = async (channel: 'smtp' | 'webhook') => {
    setTestNotificationMsg(null);
    if (channel === 'smtp') setTestingEmail(true);
    else setTestingWebhook(true);

    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          settings: {
            smtpEnabled,
            smtpHost: smtpHost.trim(),
            smtpPort: Number(smtpPort),
            smtpSecure,
            smtpUser: smtpUser.trim(),
            smtpPass: smtpPass.trim(),
            smtpFrom: smtpFrom.trim(),
            smtpTo: smtpTo.trim(),
            minSeverityForEmail,
            webhookEnabled,
            webhookUrl: webhookUrl.trim(),
            webhookSecret: webhookSecret.trim(),
            minSeverityForWebhook,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestNotificationMsg({
          type: 'success',
          text: `Success: ${data.message || `Test ${channel.toUpperCase()} message sent successfully!`}`,
        });
      } else {
        setTestNotificationMsg({
          type: 'error',
          text: `Test failed: ${data.error || 'Failed to deliver test notification.'}`,
        });
      }
    } catch (err: any) {
      setTestNotificationMsg({
        type: 'error',
        text: `Error sending test notification: ${err.message || 'Network error'}`,
      });
    } finally {
      if (channel === 'smtp') setTestingEmail(false);
      else setTestingWebhook(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Banner Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors cursor-pointer flex items-center gap-2 text-xs font-medium shadow-sm"
              title="Return to Squid Proxy Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="h-5 w-px bg-slate-800" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-sm">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  <span>System Settings & Account Management</span>
                  <span className="text-[10px] font-mono text-purple-300 px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-800/60 font-semibold">
                    nipponbpo.local
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  Configure local authentication, role privileges, and network telemetry retention windows
                </p>
              </div>
            </div>
          </div>

          {/* User Status Badge */}
          {user && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 px-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs flex items-center gap-2 shadow-sm">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-200">{user.username}</span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full font-mono ${
                    isAdmin
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {user.role}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main id="main-content" tabIndex={-1} className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 focus:outline-none">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 border border-purple-500'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts & Roles</span>
            {usersList.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === 'users' ? 'bg-purple-800 text-purple-200' : 'bg-slate-800 text-slate-400'}`}>
                {usersList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 border border-purple-500'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change My Password</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('retention')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'retention'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 border border-purple-500'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data Retention & Storage</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('network')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'network'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 border border-purple-500'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Network & Subnets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'alerts'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 border border-purple-500'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts & Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 border border-purple-500'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>System Audit Log</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'appearance'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 border border-purple-500'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Display &amp; Accessibility</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: USER ACCOUNTS & ROLES */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Access Control & User Accounts</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Manage accounts with access to the Squid and pfSense telemetry dashboard.
                </p>
              </div>

              {!isAdmin && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Read-Only Viewer: Admin role required to create or modify accounts</span>
                </div>
              )}
            </div>

            {userActionMsg && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                  userActionMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {userActionMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{userActionMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form: Add New User (Admin Only) */}
              {isAdmin && (
                <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 h-fit">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-purple-400" />
                      <span>Create New Account</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Add a new administrator or read-only viewer
                    </p>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
                    <div className="space-y-1.5">
                      <label htmlFor="create-username" className="font-medium text-slate-300">Username</label>
                      <input
                        id="create-username"
                        name="newUsername"
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="e.g. sato or auditor"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/80"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="create-password" className="font-medium text-slate-300">Initial Password</label>
                      <div className="relative">
                        <input
                          id="create-password"
                          name="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          required
                          className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/80 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-medium text-slate-300">Access Privilege Role</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewRole('viewer')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            newRole === 'viewer'
                              ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                              : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between">
                            <span>Viewer</span>
                            {newRole === 'viewer' && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Read-only access to metrics, charts, & logs
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setNewRole('admin')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            newRole === 'admin'
                              ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between">
                            <span>Admin</span>
                            {newRole === 'admin' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Full write access: settings, users, & retention
                          </div>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="w-full py-2.5 px-4 mt-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                    >
                      {creatingUser ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Create User Account</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Users Table */}
              <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4`}>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>Existing Accounts ({usersList.length})</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Local accounts authenticated on nipponbpo.local
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchUsers}
                    disabled={loadingUsers}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Refresh user list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Username</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Created</th>
                        {isAdmin && <th className="py-2.5 px-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {usersList.map((u) => {
                        const isSelf = user?.username === u.username;
                        return (
                          <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-200 flex items-center gap-2">
                              <span>{u.username}</span>
                              {isSelf && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  You
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                                  u.role === 'admin'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            {isAdmin && (
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  {/* Toggle Role */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRole(u)}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium transition-colors cursor-pointer"
                                    title={`Switch role to ${u.role === 'admin' ? 'viewer' : 'admin'}`}
                                  >
                                    Role: {u.role === 'admin' ? 'Demote' : 'Promote'}
                                  </button>

                                  {/* Reset Password */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setResetTargetUser(u);
                                      setResetPasswordVal('');
                                    }}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-purple-200 text-[10px] font-medium transition-colors cursor-pointer"
                                    title="Reset password"
                                  >
                                    Reset Pass
                                  </button>

                                  {/* Delete user */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.id, u.username)}
                                    disabled={isSelf}
                                    className="p-1 rounded-lg bg-slate-800/80 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={isSelf ? 'Cannot delete yourself' : `Delete user ${u.username}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Admin Reset Password Modal */}
            {resetTargetUser && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-purple-400" />
                      <span>Reset Password for {resetTargetUser.username}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Set a new password for this account.
                    </p>
                  </div>

                  <form onSubmit={handleAdminResetPassword} className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label htmlFor="reset-password-val" className="font-medium text-slate-300">New Password</label>
                      <input
                        id="reset-password-val"
                        name="resetPassword"
                        type="password"
                        value={resetPasswordVal}
                        onChange={(e) => setResetPasswordVal(e.target.value)}
                        placeholder="Min 6 characters"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setResetTargetUser(null)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={resettingUser}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {resettingUser ? 'Saving...' : 'Set New Password'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CHANGE MY PASSWORD */}
        {/* ========================================================================= */}
        {activeTab === 'password' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-purple-400" />
                  <span>Change Account Password</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update the password for your currently active session ({user?.username})
                </p>
              </div>

              {passwordMsg && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                    passwordMsg.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  {passwordMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangeOwnPassword} className="space-y-4 text-xs">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label htmlFor="current-password" className="font-medium text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Current Password</span>
                  </label>
                  <div className="relative">
                    <input
                      id="current-password"
                      name="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500/80 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="change-new-password" className="font-medium text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    <span>New Password</span>
                  </label>
                  <div className="relative">
                    <input
                      id="change-new-password"
                      name="changeNewPassword"
                      type={showChangeNewPassword ? 'text' : 'password'}
                      value={changeNewPassword}
                      onChange={(e) => setChangeNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500/80 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChangeNewPassword(!showChangeNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showChangeNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirm-new-password" className="font-medium text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Confirm New Password</span>
                  </label>
                  <input
                    id="confirm-new-password"
                    name="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500/80"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full py-2.5 px-4 mt-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Update Account Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DATA RETENTION & STORAGE */}
        {/* ========================================================================= */}
        {activeTab === 'retention' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>SQLite Storage & Data Retention Duration</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Configure how long raw log records and flow packets are stored before automated pruning.
                </p>
              </div>

              {!isAdmin && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin role required to modify retention policy or execute prune</span>
                </div>
              )}
            </div>

            {settingsMsg && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                  settingsMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {settingsMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{settingsMsg.text}</span>
              </div>
            )}

            {pruneMsg && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                  pruneMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {pruneMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{pruneMsg.text}</span>
              </div>
            )}

            {/* Storage Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Database Disk Footprint</span>
                <div className="text-xl font-bold text-slate-100 font-mono">
                  {storageStats?.dbSizeFormatted || 'Calculating...'}
                </div>
                <p className="text-[10px] text-slate-500">WAL mode + Normal sync</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Squid Raw Proxy Logs</span>
                <div className="text-xl font-bold text-blue-400 font-mono">
                  {formatNumber(storageStats?.squid.rawLogCount || 0)}
                </div>
                <p className="text-[10px] text-slate-500">Active retention: {retentionSquid} days</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">pfSense NetFlow Logs</span>
                <div className="text-xl font-bold text-indigo-400 font-mono">
                  {formatNumber(storageStats?.netflow.rawFlowCount || 0)}
                </div>
                <p className="text-[10px] text-slate-500">Active retention: {retentionFlows} days</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Daily Summary Rows</span>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  {formatNumber((storageStats?.squid.summaryCount || 0) + (storageStats?.netflow.summaryCount || 0))}
                </div>
                <p className="text-[10px] text-slate-500">Preserved indefinitely</p>
              </div>
            </div>

            {/* Retention Settings Form */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Configure Retention Durations</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set how many days raw telemetry is retained before being automatically pruned by the scheduler.
                </p>
              </div>

              <form onSubmit={handleSaveRetention} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Squid Proxy Retention */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                    <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                      <Network className="w-4 h-4" />
                      <span>Squid Proxy Log Retention</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Detailed HTTP/S access records including internal client IP, destination domain, transfer bytes, and full blocked URLs.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <label htmlFor="retention-squid" className="text-xs font-medium text-slate-300">Keep Raw Logs For (Days)</label>
                      <div className="flex items-center gap-3">
                        <input
                          id="retention-squid"
                          name="retentionSquid"
                          type="number"
                          min={1}
                          max={365}
                          value={retentionSquid}
                          onChange={(e) => setRetentionSquid(Math.max(1, parseInt(e.target.value) || 1))}
                          disabled={!isAdmin}
                          className="w-32 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        />
                        <span className="text-xs text-slate-400">days (e.g. 30, 60, 90)</span>
                      </div>
                    </div>
                  </div>

                  {/* pfSense NetFlow Retention */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                      <Shield className="w-4 h-4" />
                      <span>pfSense NetFlow Telemetry Retention</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      High-throughput Layer 3/4 flow sessions (approx 1,000+ flows/min). Raw flows are kept for short periods while minute & hourly rollups preserve long-term metrics.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <label htmlFor="retention-flows" className="text-xs font-medium text-slate-300">Keep Raw Flows For (Days)</label>
                      <div className="flex items-center gap-3">
                        <input
                          id="retention-flows"
                          name="retentionFlows"
                          type="number"
                          min={1}
                          max={90}
                          value={retentionFlows}
                          onChange={(e) => setRetentionFlows(Math.max(1, parseInt(e.target.value) || 1))}
                          disabled={!isAdmin}
                          className="w-32 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        />
                        <span className="text-xs text-slate-400">days (Recommended: 7 - 14)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Indefinite Historical Aggregates Note */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-3 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-100">Permanent Daily Summaries: </span>
                    Daily aggregations (<code className="text-emerald-300 font-mono">daily_summaries</code> and <code className="text-emerald-300 font-mono">netflow_daily_summaries</code>) are NEVER deleted. They preserve top bandwidth users, domains, protocol shares, and request counts indefinitely with minimal disk space.
                  </div>
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingSettings || loadingSettings}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                    >
                      {savingSettings ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Policy...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Retention Settings</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleRunPruneNow}
                      disabled={pruningLogs}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                      title="Run manual prune based on current retention days"
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${pruningLogs ? 'animate-spin text-rose-400' : 'text-rose-400'}`} />
                      <span>{pruningLogs ? 'Pruning Logs...' : 'Prune Expired Logs Now'}</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: NETWORK PREFERENCES & SUBNETS */}
        {/* ========================================================================= */}
        {activeTab === 'network' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Network className="w-4 h-4 text-indigo-400" />
                  <span>Network Topology & Classification Preferences</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Configure local subnets, proxy ports, and firewall isolation parameters.
                </p>
              </div>

              {!isAdmin && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin role required to modify network preferences</span>
                </div>
              )}
            </div>

            {settingsMsg && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                  settingsMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {settingsMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{settingsMsg.text}</span>
              </div>
            )}

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <form onSubmit={handleSaveNetwork} className="space-y-5 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Timezone */}
                  <div className="space-y-1.5">
                    <label htmlFor="system-timezone" className="font-medium text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>System Timezone</span>
                    </label>
                    <select
                      id="system-timezone"
                      name="timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                    >
                      <option value="Asia/Colombo">Asia/Colombo (UTC+05:30)</option>
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (UTC+09:00)</option>
                      <option value="Asia/Singapore">Asia/Singapore (UTC+08:00)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                    </select>
                  </div>

                  {/* Squid Port */}
                  <div className="space-y-1.5">
                    <label htmlFor="squid-port" className="font-medium text-slate-300 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-slate-400" />
                      <span>Squid Proxy Port</span>
                    </label>
                    <input
                      id="squid-port"
                      name="squidPort"
                      type="number"
                      value={squidPort}
                      onChange={(e) => setSquidPort(parseInt(e.target.value) || 3128)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-purple-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Firewall IP */}
                  <div className="space-y-1.5">
                    <label htmlFor="firewall-ip" className="font-medium text-slate-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span>pfSense Firewall IP</span>
                    </label>
                    <input
                      id="firewall-ip"
                      name="firewallIp"
                      type="text"
                      value={firewallIp}
                      onChange={(e) => setFirewallIp(e.target.value)}
                      disabled={!isAdmin}
                      placeholder="e.g. 192.168.0.1"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-purple-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <label htmlFor="hide-firewall-traffic" className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 cursor-pointer hover:bg-slate-950/60">
                    <input
                      id="hide-firewall-traffic"
                      name="hideFirewallTraffic"
                      type="checkbox"
                      checked={hideFirewallTraffic}
                      onChange={(e) => setHideFirewallTraffic(e.target.checked)}
                      disabled={!isAdmin}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-900"
                    />
                    <div>
                      <div className="font-semibold text-slate-200">Hide Firewall Self-Traffic in Flow Top Talkers</div>
                      <div className="text-[11px] text-slate-400">Excludes pfSense host traffic (192.168.0.1) from consumer leaderboards to prevent skewing analytics.</div>
                    </div>
                  </label>

                  <label htmlFor="hide-proxy-hop" className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 cursor-pointer hover:bg-slate-950/60">
                    <input
                      id="hide-proxy-hop"
                      name="hideProxyHop"
                      type="checkbox"
                      checked={hideProxyHop}
                      onChange={(e) => setHideProxyHop(e.target.checked)}
                      disabled={!isAdmin}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-900"
                    />
                    <div>
                      <div className="font-semibold text-slate-200">Hide Proxy Hop (Port {squidPort})</div>
                      <div className="text-[11px] text-slate-400">Hides workstation-to-Squid transit flows to avoid double-counting HTTP/S traffic.</div>
                    </div>
                  </label>

                  <label htmlFor="anonymize-exports" className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 cursor-pointer hover:bg-slate-950/60">
                    <input
                      id="anonymize-exports"
                      name="anonymizeExports"
                      type="checkbox"
                      checked={anonymizeExports}
                      onChange={(e) => setAnonymizeExports(e.target.checked)}
                      disabled={!isAdmin}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-900"
                    />
                    <div>
                      <div className="font-semibold text-slate-200">Anonymize Usernames in Export Reports</div>
                      <div className="text-[11px] text-slate-400">Masks employee names (e.g. &ldquo;K***o&rdquo;) when generating executive Word and CSV exports.</div>
                    </div>
                  </label>
                </div>

                {isAdmin && (
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                    >
                      {savingSettings ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save System Preferences</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ALERTS & NOTIFICATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-400" />
                  <span>Security Alert Baselines & Notification Dispatch</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Configure per-host rolling baseline thresholds, auto-expiry, SMTP email alerts, and outbound webhooks.
                </p>
              </div>

              {!isAdmin && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin role required to modify alert parameters</span>
                </div>
              )}
            </div>

            {alertsMsg && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                  alertsMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {alertsMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{alertsMsg.text}</span>
              </div>
            )}

            {testNotificationMsg && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                  testNotificationMsg.type === 'success'
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {testNotificationMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testNotificationMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveAlertSettings} className="space-y-6">
              {/* Card 1: Baselines & Thresholds */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <ShieldAlert className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Anomaly Detection & Threshold Baselines
                  </h3>
                </div>

                <p className="text-xs text-slate-400">
                  Alert evaluation compares current telemetry against these threshold values with a per-host rolling baseline (1.8x host historical average) to suppress false positives during peak business operations.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Blocked Requests Spike (per 10m)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={blockedSpikeThreshold}
                      onChange={(e) => setBlockedSpikeThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-[11px] text-slate-500">Squid or firewall blocks triggering spike alerts (default: 25)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Large Upload Spike (MB per 15m)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100000"
                      value={uploadSpikeThresholdMb}
                      onChange={(e) => setUploadSpikeThresholdMb(Math.max(1, parseInt(e.target.value) || 10))}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-[11px] text-slate-500">Flags potential exfiltration over NetFlow bytes (default: 100 MB)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Repeated Denied Requests (per 10m)
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="500"
                      value={repeatedDeniedThreshold}
                      onChange={(e) => setRepeatedDeniedThreshold(Math.max(2, parseInt(e.target.value) || 2))}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-[11px] text-slate-500">Repeated denied requests to the same target domain (default: 8)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Target Fan-Out Count (per 15m)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="500"
                      value={fanoutThreshold}
                      onChange={(e) => setFanoutThreshold(Math.max(5, parseInt(e.target.value) || 5))}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-[11px] text-slate-500">Distinct external IPs contacted in brief window (default: 35)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Port Scan / Sweep Threshold (per 5m)
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="1000"
                      value={portScanThreshold}
                      onChange={(e) => setPortScanThreshold(Math.max(3, parseInt(e.target.value) || 3))}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-[11px] text-slate-500">Distinct firewall blocked ports from one IP (default: 12)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Auto-Expire Stale Alerts (Hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={autoExpireHours}
                      onChange={(e) => setAutoExpireHours(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-[11px] text-slate-500">Unresolved alerts older than this are archived automatically (default: 24)</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Email (SMTP) Dispatch */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Email Alert Dispatch (SMTP)
                    </h3>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpEnabled}
                      onChange={(e) => setSmtpEnabled(e.target.checked)}
                      disabled={!isAdmin}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-900"
                    />
                    <span className="text-slate-300">Enable Email Alerts</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5 lg:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">SMTP Host / Server</label>
                    <input
                      type="text"
                      placeholder="e.g. smtp.office365.com or 192.168.0.25"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Port</label>
                    <input
                      type="number"
                      placeholder="587"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Encryption</label>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.checked)}
                        disabled={!isAdmin}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-900"
                      />
                      <span className="text-xs text-slate-300">SSL/TLS (Port 465)</span>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">SMTP Username</label>
                    <input
                      type="text"
                      placeholder="e.g. alerts@company.com"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">SMTP Password</label>
                    <input
                      type="password"
                      placeholder="App password or secret"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">From Address</label>
                    <input
                      type="email"
                      placeholder="alerts@nipponbpo.local"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Minimum Severity</label>
                    <select
                      value={minSeverityForEmail}
                      onChange={(e) => setMinSeverityForEmail(e.target.value as any)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none cursor-pointer"
                    >
                      <option value="critical">Critical Only</option>
                      <option value="high">High & Critical</option>
                      <option value="medium">Medium, High & Critical</option>
                      <option value="low">All Severities (Low+)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 lg:col-span-4">
                    <label className="text-xs font-semibold text-slate-300">
                      Recipient Addresses (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="soc@nipponbpo.com, netadmin@nipponbpo.com"
                      value={smtpTo}
                      onChange={(e) => setSmtpTo(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleTestNotification('smtp')}
                    disabled={testingEmail || !isAdmin}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {testingEmail ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                        <span>Connecting to SMTP...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-purple-400" />
                        <span>Send Test Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Card 3: Generic Webhook Dispatch */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Generic Outbound Webhook Dispatch
                    </h3>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEnabled}
                      onChange={(e) => setWebhookEnabled(e.target.checked)}
                      disabled={!isAdmin}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-900"
                    />
                    <span className="text-slate-300">Enable Webhook Alerts</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Webhook Target URL</label>
                    <input
                      type="url"
                      placeholder="https://webhook.site/... or https://hooks.slack.com/services/..."
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Minimum Severity</label>
                    <select
                      value={minSeverityForWebhook}
                      onChange={(e) => setMinSeverityForWebhook(e.target.value as any)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none cursor-pointer"
                    >
                      <option value="critical">Critical Only</option>
                      <option value="high">High & Critical</option>
                      <option value="medium">Medium, High & Critical</option>
                      <option value="low">All Severities (Low+)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <label className="text-xs font-semibold text-slate-300">
                      Webhook Secret / Auth Header (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Secret token delivered in X-Alert-Secret header"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleTestNotification('webhook')}
                    disabled={testingWebhook || !isAdmin}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {testingWebhook ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                        <span>Sending Webhook POST...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-purple-400" />
                        <span>Send Test Webhook</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingAlerts}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                  >
                    {savingAlerts ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Alert Settings & Dispatch Rules</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: SYSTEM AUDIT LOG */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <AuditLogTable />
        )}

        {/* ========================================================================= */}
        {/* TAB 7: DISPLAY & ACCESSIBILITY */}
        {/* ========================================================================= */}
        {activeTab === 'appearance' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Display Density */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>Display Density &amp; Typography Scale</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Configure UI font scaling and table cell compactness to match your display size and comfort. Settings persist in local storage.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleSetDensity('compact')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    currentDensity === 'compact'
                      ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-200 flex items-center justify-between">
                    <span>Compact Mode</span>
                    {currentDensity === 'compact' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Dense data tables with 12px text and 4px padding. Perfect for 1366x768 screens and dense NOC monitoring.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetDensity('normal')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    currentDensity === 'normal'
                      ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-200 flex items-center justify-between">
                    <span>Normal Mode (Default)</span>
                    {currentDensity === 'normal' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    WCAG 2.2 AA compliant typography: 14px body text, 13px table text, and 8px cell padding.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetDensity('comfortable')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    currentDensity === 'comfortable'
                      ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-200 flex items-center justify-between">
                    <span>Comfortable Mode</span>
                    {currentDensity === 'comfortable' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Spacious layout with 15px body, 14px table text, and 12px cell padding for high-resolution 1440p and 4K displays.
                  </div>
                </button>
              </div>
            </div>

            {/* Color Theme Selector */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Color Theme</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  High-contrast dark theme (navy/slate) or soft eye-friendly light theme meeting WCAG 2.2 AA standards (&gt;= 4.5:1 text contrast).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSetTheme('dark')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    currentTheme === 'dark'
                      ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-200 flex items-center justify-between">
                    <span>Dark Theme (NOC Default)</span>
                    {currentTheme === 'dark' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Deep navy background with high-contrast glowing indicators and muted borders.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetTheme('light')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    currentTheme === 'light'
                      ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-200 flex items-center justify-between">
                    <span>Light Theme (High Contrast)</span>
                    {currentTheme === 'light' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Soft neutral canvas with deep contrast typography, zebra striping, and rich data pills.
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
            <span>Loading Settings...</span>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </React.Suspense>
  );
}

