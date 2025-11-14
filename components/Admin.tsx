import React, { useState, useEffect, useMemo } from 'react';
import type { User, Campaign } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { XIcon } from './icons/XIcon';
import { LoginSummaryModal } from './LoginSummaryModal';
import { BarChartIcon } from './icons/BarChartIcon';
import { SearchIcon } from './icons/SearchIcon';
import { GearIcon } from './icons/GearIcon';

interface AdminProps {
    allUsers: User[];
    onUpdateUsers: (users: User[]) => void;
}

const InputField: React.FC<{
    label: string;
    id: string;
    type: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    autoComplete?: string;
    placeholder?: string;
}> = ({ label, id, type, value, onChange, error, autoComplete, placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {label}
        </label>
        <input
            id={id}
            name={id}
            type={type}
            value={value}
            onChange={onChange}
            autoComplete={autoComplete}
            placeholder={placeholder}
            className={`w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-md text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500`}
        />
        {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
    </div>
);


export const Admin: React.FC<AdminProps> = ({ allUsers, onUpdateUsers }) => {
    const [users, setUsers] = useState<User[]>(allUsers);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accessLevel, setAccessLevel] = useState<'Admin' | 'Manager' | 'Agent' | 'Team Lead'>('Team Lead');
    const [selectedCampaigns, setSelectedCampaigns] = useState<Campaign[]>([]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
      setUsers(allUsers);
    }, [allUsers]);

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setAccessLevel('Team Lead');
        setEditingUser(null);
        setFormErrors({});
        setSelectedCampaigns([]);
    };

    const handleOpenModal = (user: User | null = null) => {
        resetForm();
        if (user) {
            setEditingUser(user);
            setFirstName(user.firstName);
            setLastName(user.lastName);
            setEmail(user.email);
            setAccessLevel(user.accessLevel || 'Team Lead');
            setSelectedCampaigns(user.campaigns || []);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };
    
    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!firstName.trim()) errors.firstName = 'First Name is required.';
        if (!lastName.trim()) errors.lastName = 'Last Name is required.';
        if (!email.trim()) {
            errors.email = 'Email is required.';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.email = 'Email is invalid.';
        }
        
        if (!editingUser) {
             if (!password) {
                errors.password = 'Password is required.';
            } else if (password.length < 8) {
                errors.password = 'Password must be at least 8 characters.';
            }
        } else if (password && password.length < 8) {
            errors.password = 'Password must be at least 8 characters.';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        let updatedUsers;
        if (editingUser) {
            updatedUsers = users.map(u => 
                u.id === editingUser.id 
                ? { ...u, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password: password || u.password, accessLevel, campaigns: selectedCampaigns }
                : u
            );
        } else {
            const newUser: User = {
                id: crypto.randomUUID(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password,
                accessLevel,
                status: 'active',
                campaigns: selectedCampaigns,
            };
            updatedUsers = [...users, newUser];
        }
        setUsers(updatedUsers);
        onUpdateUsers(updatedUsers);
        handleCloseModal();
    };

    const handleToggleStatus = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const isDeactivating = user.status === 'active';

        const newStatus: 'active' | 'deactivated' = isDeactivating ? 'deactivated' : 'active';

        const updatedUsers = users.map(u =>
            u.id === userId
                ? { ...u, status: newStatus }
                : u
        );
        setUsers(updatedUsers);
        onUpdateUsers(updatedUsers);
    };

    const handleCampaignChange = (campaign: Campaign) => {
        setSelectedCampaigns(prev => 
            prev.includes(campaign) 
            ? prev.filter(c => c !== campaign)
            : [...prev, campaign]
        );
    };

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const lowercasedQuery = searchQuery.toLowerCase();
        return users.filter(user => 
            user.firstName.toLowerCase().includes(lowercasedQuery) ||
            user.lastName.toLowerCase().includes(lowercasedQuery) ||
            user.email.toLowerCase().includes(lowercasedQuery)
        );
    }, [users, searchQuery]);


    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <GearIcon className="w-10 h-10 text-sky-500 dark:text-sky-400" />
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h2>
                </div>
                <div className="flex items-center gap-4">
                     <button
                        onClick={() => setIsSummaryModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900"
                    >
                        <BarChartIcon className="w-5 h-5" />
                        <span>View Login Summary</span>
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900"
                    >
                        Add New User
                    </button>
                </div>
            </div>
            
            <div className="max-w-md">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="w-5 h-5 text-slate-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        aria-label="Search users"
                    />
                </div>
            </div>

            <div className="w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="w-full overflow-x-auto">
                    <table className="w-full whitespace-no-wrap">
                        <thead className="text-xs font-semibold tracking-wide text-left text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                            <tr>
                                <th className="px-4 py-3">First Name</th>
                                <th className="px-4 py-3">Last Name</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Access Level</th>
                                <th className="px-4 py-3">Campaigns</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Last Login</th>
                                <th className="px-4 py-3 text-center">Login Count</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800/50 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className={`transition-colors ${user.status === 'deactivated' ? 'text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-800/50' : 'text-slate-700 dark:text-slate-300'}`}>
                                        <td className="px-4 py-3">{user.firstName}</td>
                                        <td className="px-4 py-3">{user.lastName}</td>
                                        <td className="px-4 py-3">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 font-semibold leading-tight rounded-full text-xs ${
                                                user.status === 'deactivated'
                                                ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                                : user.accessLevel === 'Admin' 
                                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-700/50 dark:text-sky-300'
                                                : user.accessLevel === 'Manager'
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-700/50 dark:text-purple-300'
                                                : user.accessLevel === 'Team Lead'
                                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-700/50 dark:text-indigo-300'
                                                : user.accessLevel === 'Agent'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-700/50 dark:text-emerald-300'
                                                : 'bg-slate-200 text-slate-800 dark:bg-slate-600/50 dark:text-slate-300'
                                            }`}>
                                                {user.accessLevel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.campaigns?.map(c => (
                                                <span key={c} className="inline-block px-2 py-1 mr-1 mb-1 font-semibold leading-tight rounded-full text-xs bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                                    {c.replace('_', ' & ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </span>
                                            )) ?? <span className="text-slate-400">None</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                             <span className={`px-2 py-1 font-semibold leading-tight rounded-full text-xs capitalize ${
                                                 user.status === 'active' 
                                                 ? 'bg-green-100 text-green-800 dark:bg-green-700/50 dark:text-green-300'
                                                 : 'bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-300'
                                             }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {user.loginCount || 0}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center space-x-4 text-sm">
                                                <button onClick={() => handleOpenModal(user)} className="flex items-center justify-between px-2 py-2 text-sm font-medium leading-5 text-sky-600 dark:text-sky-400 rounded-lg hover:text-sky-500 dark:hover:text-sky-300 focus:outline-none focus:shadow-outline-gray" aria-label="Edit">
                                                    <PencilIcon className="w-5 h-5" />
                                                </button>
                                                <label htmlFor={`status-toggle-${user.id}`} className="relative inline-flex items-center cursor-pointer" title={user.status === 'active' ? 'Deactivate User' : 'Activate User'}>
                                                  <input
                                                    type="checkbox"
                                                    id={`status-toggle-${user.id}`}
                                                    checked={user.status === 'active'}
                                                    onChange={() => handleToggleStatus(user.id)}
                                                    className="sr-only peer"
                                                  />
                                                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                                                </label>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="text-center py-10 text-slate-500 dark:text-slate-400">
                                        {searchQuery 
                                            ? `No users found for "${searchQuery}".`
                                            : 'No users registered. Click "Add New User" to get started.'
                                        }
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="user-modal-title"
                >
                    <div 
                        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-200 dark:border-slate-700"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 id="user-modal-title" className="text-xl font-semibold text-slate-900 dark:text-white">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <button onClick={handleCloseModal} aria-label="Close modal">
                                <XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"/>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="space-y-4">
                                <InputField label="First Name" id="firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} error={formErrors.firstName} autoComplete="given-name" />
                                <InputField label="Last Name" id="lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)} error={formErrors.lastName} autoComplete="family-name" />
                                <InputField label="Email Address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} error={formErrors.email} autoComplete="email" />
                                <InputField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} error={formErrors.password} autoComplete="new-password" placeholder={editingUser ? 'Leave blank to keep current' : ''}/>
                                <div>
                                    <label htmlFor="accessLevel" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Access Level
                                    </label>
                                    <select
                                        id="accessLevel"
                                        name="accessLevel"
                                        value={accessLevel}
                                        onChange={(e) => setAccessLevel(e.target.value as 'Admin' | 'Manager' | 'Agent' | 'Team Lead')}
                                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    >
                                        <option value="Admin">Admin</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Team Lead">Team Lead</option>
                                        <option value="Agent">Agent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Campaign Access
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedCampaigns.includes('internet_cable')}
                                                onChange={() => handleCampaignChange('internet_cable')}
                                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-sky-600 focus:ring-sky-500 bg-slate-200 dark:bg-slate-600"
                                            />
                                            <span className="text-slate-700 dark:text-slate-300">Internet & Cable</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedCampaigns.includes('banking')}
                                                onChange={() => handleCampaignChange('banking')}
                                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-sky-600 focus:ring-sky-500 bg-slate-200 dark:bg-slate-600"
                                            />
                                            <span className="text-slate-700 dark:text-slate-300">Banking</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-4 mt-6">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
                                >
                                    {editingUser ? 'Save Changes' : 'Add User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isSummaryModalOpen && (
                <LoginSummaryModal
                    users={users}
                    isOpen={isSummaryModalOpen}
                    onClose={() => setIsSummaryModalOpen(false)}
                />
            )}
        </div>
    );
};
