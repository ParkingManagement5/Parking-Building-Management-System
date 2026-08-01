import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import { initializeTheme } from "./utils/theme";
import { ToastProvider } from "./ui/components/Toast";
import { ConfirmProvider } from "./ui/components/ConfirmDialog";

function App() {
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppRoutes />
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
