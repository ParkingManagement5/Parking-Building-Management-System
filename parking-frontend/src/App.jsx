import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import { initializeTheme } from "./utils/theme";

function App() {
  useEffect(() => {
    initializeTheme();
  }, []);

  return <AppRoutes />;
}

export default App;
