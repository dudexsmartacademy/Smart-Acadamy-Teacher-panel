import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, loading, changePassword, refreshProfile, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }

    setSaving(true);
    const result = await changePassword(password);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Reload the teacher so the temporary-password flag is cleared before
    // the portal layout checks it again.
    await refreshProfile();
    navigate('/dashboard', { replace: true });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Verifying reset link...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  const firstSignIn = user.mustChangePassword === true;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f2] px-4 text-[#1b1c1e]">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-[#e7ded3] bg-[#fffdf9] p-6 shadow-lg"
      >
        <div>
          <h1 className="text-xl font-bold">
            {firstSignIn ? 'Choose your permanent password' : 'Set a new password'}
          </h1>
          <p className="mt-1 text-sm text-[#8c857d]">
            {firstSignIn
              ? `You signed in with a temporary password. Choose your own password for ${user.email} to continue.`
              : `Choose a new password for ${user.email}.`}
          </p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-[#f8ebe7] p-3 text-sm text-[#a75b52]">{error}</p>}
        <label className="block space-y-1 text-sm">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-[#e7ded3] px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="w-full rounded-lg border border-[#e7ded3] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-[#1b1c1e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save password'}
        </button>
        {firstSignIn && (
          <button
            type="button"
            onClick={() => void signOut().then(() => navigate('/login', { replace: true }))}
            className="w-full text-center text-xs text-[#8c857d] underline"
          >
            Sign out
          </button>
        )}
      </form>
    </main>
  );
}
