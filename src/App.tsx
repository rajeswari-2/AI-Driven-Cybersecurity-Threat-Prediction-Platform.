import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load heavy components to prevent R3F reconciler crash
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Incidents = lazy(() => import("./pages/Incidents"));
const Users = lazy(() => import("./pages/Users"));
const Roles = lazy(() => import("./pages/users/Roles"));
const StaticScanner = lazy(() => import("./pages/scanner/StaticScanner"));
const WebsiteScanner = lazy(() => import("./pages/scanner/WebsiteScanner"));
const APIScanner = lazy(() => import("./pages/scanner/APIScanner"));
const QRScanner = lazy(() => import("./pages/scanner/QRScanner"));
const LiveMap = lazy(() => import("./pages/monitor/LiveMap"));
const GlobeView = lazy(() => import("./pages/monitor/GlobeView"));
const Analytics = lazy(() => import("./pages/monitor/Analytics"));
const ThreatFeed = lazy(() => import("./pages/monitor/ThreatFeed"));
const BlockedAttacks = lazy(() => import("./pages/monitor/BlockedAttacks"));
const Predictions = lazy(() => import("./pages/ai/Predictions"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
              <Route path="/users/roles" element={<Roles />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
