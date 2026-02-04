import { useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { UserSelector, getStoredUser } from "./components/UserSelector.tsx";
import { ExpensesPage } from "./ExpensesPage.tsx";
import "./App.css";

function App() {
  const [user, setUser] = useState(getStoredUser);

  if (!user) {
    return <UserSelector onUserSelected={setUser} />;
  }

  return (
    <ErrorBoundary>
      <ExpensesPage
        user={user}
        onLogout={() => {
          localStorage.removeItem("fenmo_user");
          setUser("");
        }}
      />
    </ErrorBoundary>
  );
}

export default App;
