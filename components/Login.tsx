import React, { useState, useEffect } from 'react';
import type { User, LoginRecord, UserSession } from '../types';
import { Logo } from './Logo';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const LS_USERS_KEY = 'transcript_analyzer_users';
const LS_LOGIN_HISTORY_KEY = 'transcript_analyzer_login_history';
const LS_SESSIONS_KEY = 'transcript_analyzer_sessions';

const FuturisticBackground: React.FC = () => (
  <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden">
    <div className="absolute inset-0 bg-slate-950" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.15)_0%,transparent_60%)]" />
    <style>{`
      @keyframes move {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
      }
      .aurora-shape {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 1400px;
        height: 1400px;
        transform-origin: center center;
        background-image: conic-gradient(
          from 90deg at 50% 50%,
          #0ea5e9,
          #2563eb,
          #4f46e5,
          #9333ea,
          #0ea5e9
        );
        animation: move 60s linear infinite;
        filter: blur(200px);
        opacity: 0.15;
      }
    `}</style>
    <div className="aurora-shape" />
  </div>
);


export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFirstRun, setIsFirstRun] = useState(false);

  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem(LS_USERS_KEY);
      if (!savedUsers || JSON.parse(savedUsers).length === 0) {
        // Create a default admin user if none exist
        const defaultUser: User = {
          id: crypto.randomUUID(),
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@app.com',
          password: 'password123',
          accessLevel: 'Admin',
          status: 'active',
          campaigns: ['internet_cable', 'banking'],
        };
        localStorage.setItem(LS_USERS_KEY, JSON.stringify([defaultUser]));
        setIsFirstRun(true);
      }
    } catch (err) {
      console.error("Failed to initialize users in localStorage:", err);
      setError("An error occurred during application setup.");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Both email and password are required.');
      return;
    }

    try {
      const savedUsers = localStorage.getItem(LS_USERS_KEY);
      if (savedUsers) {
        const users: User[] = JSON.parse(savedUsers);
        const userIndex = users.findIndex(u => u.email === email && u.password === password);

        if (userIndex > -1) {
          const user = users[userIndex];
          
          if (user.status === 'deactivated') {
              setError('Your account has been deactivated. Please contact an administrator.');
              return;
          }

          const loginTimestamp = new Date().toISOString();

          // Update user login stats
          const updatedUser = {
            ...user,
            lastLogin: loginTimestamp,
            loginCount: (user.loginCount || 0) + 1,
          };
          
          // Update the users array
          const updatedUsers = [...users];
          updatedUsers[userIndex] = updatedUser;
          localStorage.setItem(LS_USERS_KEY, JSON.stringify(updatedUsers));
          
          // Update login history
          const savedHistory = localStorage.getItem(LS_LOGIN_HISTORY_KEY);
          const history: LoginRecord[] = savedHistory ? JSON.parse(savedHistory) : [];
          const newHistoryRecord: LoginRecord = {
            userId: user.id,
            email: user.email,
            timestamp: updatedUser.lastLogin,
          };
          history.push(newHistoryRecord);
          localStorage.setItem(LS_LOGIN_HISTORY_KEY, JSON.stringify(history));
          
          // Create and save user session
          const savedSessions = localStorage.getItem(LS_SESSIONS_KEY);
          const sessions: UserSession[] = savedSessions ? JSON.parse(savedSessions) : [];
          const newSession: UserSession = {
            sessionId: crypto.randomUUID(),
            userId: user.id,
            loginTimestamp: loginTimestamp,
          };
          sessions.push(newSession);
          localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions));
          sessionStorage.setItem('activeSessionId', newSession.sessionId);

          onLoginSuccess(updatedUser);
        } else {
          setError('Invalid email or password.');
        }
      } else {
        setError('No registered users found.');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white overflow-hidden">
      <FuturisticBackground />
      <div className="relative z-10 flex min-h-screen flex-col justify-center items-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex items-center justify-center gap-4 mb-8">
              <Logo className="w-16 h-16" />
              <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 whitespace-nowrap">
                  AdvantageCall Interact
              </h1>
          </div>
          <h2 className="text-center text-xl font-bold leading-9 tracking-tight text-white">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl p-8 backdrop-blur-sm">
            {isFirstRun && (
              <div className="mb-6 p-4 bg-sky-100 dark:bg-sky-900/50 border border-sky-300 dark:border-sky-700 rounded-lg text-center">
                  <p className="text-sm text-sky-700 dark:text-sky-200">
                      Welcome! It looks like this is your first time.
                  </p>
                  <p className="text-sm text-sky-800 dark:text-sky-300 mt-1">
                      A default admin account has been created:
                      <br />
                      Email: <strong className="text-slate-900 dark:text-white">admin@app.com</strong>
                      <br />
                      Password: <strong className="text-slate-900 dark:text-white">password123</strong>
                  </p>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                </div>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              
              {error && (
                  <div className="text-center p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
              )}

              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 transition-colors"
                >
                  Sign in
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};