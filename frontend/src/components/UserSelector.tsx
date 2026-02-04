import { useState } from "react";
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
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    storeUser(trimmed);
    onUserSelected(trimmed);
  }

  return (
    <div className="user-selector-page">
      <div className="user-selector-card">
        <div className="user-selector-header">
          <span className="user-selector-logo">{"\u20B9"}</span>
          <h1>Fenmo</h1>
          <p>Enter your name to get started</p>
        </div>
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
        </form>
      </div>
    </div>
  );
}
