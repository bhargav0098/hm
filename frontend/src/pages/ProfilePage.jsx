import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Activity, Monitor, Trash2, Save, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'devices', label: 'Devices', icon: Monitor },
];

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    company: user?.company || '',
    bio: user?.bio || '',
    website: user?.website || '',
    location: user?.location || '',
    phone: user?.phone || '',
    avatar: user?.avatar || ''
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [activity, setActivity] = useState([]);
  const [devices, setDevices] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    if (tab === 'activity') api.get('/users/activity').then(r => setActivity(r.data.activity || [])).catch(() => {});
    if (tab === 'devices') api.get('/users/devices').then(r => setDevices(r.data.devices || [])).catch(() => {});
  }, [tab]);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile', profile);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (!passwords.currentPassword || !passwords.newPassword) return toast.error('Fill all fields');
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error('Passwords do not match');
    if (passwords.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await api.put('/users/change-password', passwords);
      toast.success('Password changed!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Change failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/users/account', { data: { password: deletePassword } });
      toast.success('Account deleted');
      window.location.href = '/';
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const completionScore = user?.profileCompletionScore || 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <div className="relative">
            <img src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt="avatar" className="w-16 h-16 rounded-2xl border-2 border-primary-500/40" />
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
              <Camera className="w-3 h-3 text-white" />
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{user?.fullName}</h1>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-1.5 bg-white/10 rounded-full">
                <div className="h-full bg-gradient-to-r from-primary-500 to-accent-purple rounded-full" style={{ width: `${completionScore}%` }} />
              </div>
              <span className="text-xs text-slate-500">Profile {completionScore}% complete</span>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${tab === t.id ? 'bg-primary-500 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-4">
            <h2 className="text-white font-bold">Personal Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: 'fullName', label: 'Full Name', type: 'text' },
                { key: 'company', label: 'Company / College', type: 'text' },
                { key: 'location', label: 'Location', type: 'text' },
                { key: 'phone', label: 'Phone Number', type: 'tel' },
                { key: 'website', label: 'Portfolio / LinkedIn', type: 'url' },
                { key: 'avatar', label: 'Avatar URL', type: 'url' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-sm text-slate-400 mb-1.5 block">{field.label}</label>
                  <input type={field.type} value={profile[field.key]}
                    onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                    className="input-field" disabled={user?.isDemo} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-sm text-slate-400 mb-1.5 block">Bio</label>
                <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell us about yourself, your goals, and experience..." rows={3}
                  className="input-field resize-none w-full" disabled={user?.isDemo} />
              </div>
            </div>
            {user?.isDemo ? (
              <p className="text-accent-yellow text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Demo accounts cannot edit profile
              </p>
            ) : (
              <motion.button onClick={handleProfileSave} disabled={saving}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Password Tab */}
        {tab === 'password' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-4">
            <h2 className="text-white font-bold">Change Password</h2>
            {user?.isDemo ? (
              <p className="text-accent-yellow flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Demo accounts cannot change password
              </p>
            ) : (
              <>
                {[
                  { key: 'currentPassword', label: 'Current Password' },
                  { key: 'newPassword', label: 'New Password' },
                  { key: 'confirmPassword', label: 'Confirm New Password' }
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-sm text-slate-400 mb-1.5 block">{field.label}</label>
                    <input type="password" value={passwords[field.key]}
                      onChange={e => setPasswords(p => ({ ...p, [field.key]: e.target.value }))}
                      className="input-field" />
                  </div>
                ))}
                <motion.button onClick={handlePasswordChange} disabled={saving}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="btn-primary flex items-center gap-2">
                  <Lock className="w-4 h-4" /> {saving ? 'Updating...' : 'Update Password'}
                </motion.button>
              </>
            )}

            {/* Danger Zone */}
            {!user?.isDemo && (
              <div className="mt-8 pt-6 border-t border-red-500/20">
                <h3 className="text-red-400 font-bold mb-2">Danger Zone</h3>
                <p className="text-slate-400 text-sm mb-4">Permanently delete your account and all data. This cannot be undone.</p>
                {!showDelete ? (
                  <button onClick={() => setShowDelete(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all text-sm">
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </button>
                ) : (
                  <div className="space-y-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400 text-sm font-semibold">Enter your password to confirm:</p>
                    <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
                      placeholder="Your password" className="input-field border-red-500/40" />
                    <div className="flex gap-3">
                      <button onClick={handleDeleteAccount}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm hover:bg-red-600 transition-all">
                        <Trash2 className="w-4 h-4" /> Delete Forever
                      </button>
                      <button onClick={() => setShowDelete(false)} className="btn-ghost text-sm py-2">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Activity Tab */}
        {tab === 'activity' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
            <h2 className="text-white font-bold mb-4">Login Activity</h2>
            {activity.length === 0 ? (
              <p className="text-slate-400 text-sm">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {activity.slice(0, 15).map((a, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm capitalize">{a.action?.replace('_', ' ')}</p>
                      <p className="text-slate-500 text-xs">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                    {a.ip && <span className="text-slate-600 text-xs font-mono">{a.ip}</span>}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Devices Tab */}
        {tab === 'devices' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
            <h2 className="text-white font-bold mb-4">Login Devices</h2>
            {devices.length === 0 ? (
              <p className="text-slate-400 text-sm">No devices recorded.</p>
            ) : (
              <div className="space-y-3">
                {devices.map((d, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/8">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Monitor className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{d.device || 'Unknown Device'}</p>
                      <p className="text-slate-500 text-xs">{d.ip} · Last seen {new Date(d.lastSeen).toLocaleDateString()}</p>
                    </div>
                    {i === 0 && (
                      <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">Current</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
