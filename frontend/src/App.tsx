import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { ExpensesPage } from "./ExpensesPage.tsx";
import "./App.css";

function App() {
  return (
    <ErrorBoundary>
      <ExpensesPage />
    </ErrorBoundary>
  );
}

export default App;
