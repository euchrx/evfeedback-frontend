import { AppRoutes } from "./routes";
import { ToastProvider } from "./components/ui/ToastProvider";
import { ConfirmDialogProvider } from "./components/ui/ConfirmDialogProvider";

function App() {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <AppRoutes />
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}

export default App;