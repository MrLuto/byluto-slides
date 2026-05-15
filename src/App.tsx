import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AudienceWindow from "./pages/AudienceWindow";
import DevMockDeck from "./pages/DevMockDeck";
import DeckPicker from "./pages/DeckPicker";
import DeckEditor from "./pages/DeckEditor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/audience" element={<AudienceWindow />} />
          <Route path="/dev/mock-deck" element={<DevMockDeck />} />
          <Route path="/decks" element={<DeckPicker />} />
          <Route path="/decks/:id" element={<DeckEditor />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
