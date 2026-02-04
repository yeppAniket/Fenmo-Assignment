import { useState, useEffect } from "react";
import { fetchUsers } from "../api.ts";
import { Button, Input } from "../ui/index.ts";

const STORAGE_KEY = "fenmo_user";

export function getStoredUser(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

function storeUser(name: string): void {
  localStorage.setItem(STORAGE_KEY, name);
}

type Props = {
  onUserSelected: (user: string) => void;
};

export function UserSelector({ onUserSelected }: Props) {
  const [existingUsers, setExistingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers()
      .then((data) => setExistingUsers(data.users))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function selectUser(user: string) {
    storeUser(user);
    onUserSelected(user);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name");
      return;
    }
    if (trimmed.length > 50) {
      setError("Name must be 50 characters or less");
      return;
    }
    selectUser(trimmed);
  }

  const hasUsers = existingUsers.length > 0;

  return (
    <div className="user-selector-page">
      <div className="user-selector-card">
        <div className="user-selector-header">
          <span className="user-selector-logo">{"\u20B9"}</span>
          <h1>Fenmo</h1>
          <p>{loading ? "Loading..." : "Select your account or create a new one"}</p>
        </div>

        {!loading && hasUsers && !showNewForm && (
          <div className="user-list">
            {existingUsers.map((user) => (
              <button
                key={user}
                className="user-list-item"
                onClick={() => selectUser(user)}
              >
                <span className="user-avatar">{user[0].toUpperCase()}</span>
                <span className="user-list-name">{user}</span>
              </button>
            ))}
            <button
              className="user-list-item user-list-new"
              onClick={() => setShowNewForm(true)}
            >
              <span className="user-avatar user-avatar-new">+</span>
              <span className="user-list-name">New user</span>
            </button>
          </div>
        )}

        {!loading && (!hasUsers || showNewForm) && (
          <form onSubmit={handleSubmit} className="user-selector-form">
            <Input
              id="user-name"
              label="Your Name"
              type="text"
              placeholder="e.g. Rahul"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              error={error ?? undefined}
              autoFocus
              maxLength={50}
            />
            <Button type="submit">Continue</Button>
            {hasUsers && (
              <button
                type="button"
                className="user-back-link"
                onClick={() => setShowNewForm(false)}
              >
                Back to user list
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
