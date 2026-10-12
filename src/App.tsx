import { Navigate, Route, Routes } from "react-router-dom";
import { useStore } from "./store";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import { EventSheetProvider } from "./components/EventSheet";
import Onboarding from "./pages/Onboarding";
import Today from "./pages/Today";
import Sleep from "./pages/Sleep";
import Sounds from "./pages/Sounds";
import Guide, { GuideDetail } from "./pages/Guide";
import Coach from "./pages/Coach";
import Profile from "./pages/Profile";
import Routine from "./pages/Routine";

export default function App() {
  const { baby } = useStore();
  return (
    <ToastProvider>
      <EventSheetProvider>
        {!baby ? (
          <Onboarding />
        ) : (
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Today />} />
              <Route path="sleep" element={<Sleep />} />
              <Route path="sounds" element={<Sounds />} />
              <Route path="guide" element={<Guide />} />
              <Route path="guide/:id" element={<GuideDetail />} />
              <Route path="coach" element={<Coach />} />
              <Route path="profile" element={<Profile />} />
              <Route path="routine" element={<Routine />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        )}
      </EventSheetProvider>
    </ToastProvider>
  );
}
