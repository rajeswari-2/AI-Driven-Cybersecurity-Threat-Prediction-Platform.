import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Incidents from "./pages/Incidents";
import Users from "./pages/Users";
import StaticScanner from "./pages/scanner/StaticScanner";
import WebsiteScanner from "./pages/scanner/WebsiteScanner";
import APIScanner from "./pages/scanner/APIScanner";
import QRScanner from "./pages/scanner/QRScanner";
import LiveMap from "./pages/monitor/LiveMap";
import GlobeView from "./pages/monitor/GlobeView";
import Analytics from "./pages/monitor/Analytics";
import ThreatFeed from "./pages/monitor/ThreatFeed";
import BlockedAttacks from "./pages/monitor/BlockedAttacks";
import Predictions from "./pages/ai/Predictions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scanner/static" element={<StaticScanner />} />
            <Route path="/scanner/website" element={<WebsiteScanner />} />
            <Route path="/scanner/api" element={<APIScanner />} />
            <Route path="/scanner/qr" element={<QRScanner />} />
            <Route path="/monitor/live-map" element={<LiveMap />} />
            <Route path="/monitor/globe" element={<GlobeView />} />
            <Route path="/monitor/analytics" element={<Analytics />} />
            <Route path="/monitor/threat-feed" element={<ThreatFeed />} />
            <Route path="/monitor/blocked-attacks" element={<BlockedAttacks />} />
            <Route path="/ai/predictions" element={<Predictions />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/users" element={<Users />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
