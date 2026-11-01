import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import { TreeKnowledgePage } from './components/tree/TreeKnowledgePage';
import { ToolPlaceholderPage } from './components/tools/ToolPlaceholderPage';
import { LegalAdvisorPage } from './components/advisor/LegalAdvisorPage';
import { LegalResearchPage } from './components/research/LegalResearchPage';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DocumentSimplifierPage } from './components/documents/DocumentSimplifierPage';
import { DraftingAssistantPage } from './components/documents/DraftingAssistantPage';
import { NoticeReplyPage } from './components/documents/NoticeReplyPage';
import { LegalVaultPage } from './components/vault/LegalVaultPage';
import { LegalProvisionConverterPage } from './components/converter/LegalProvisionConverterPage';
import { LawyerPreparationPage } from './components/safety/LawyerPreparationPage';
import { LegalAidFinderPage } from './components/safety/LegalAidFinderPage';
import { ScamDetectorPage } from './components/safety/ScamDetectorPage';

const LandingRoute: React.FC = () => {
  const navigate = useNavigate();
  return <LandingPage onEnterApp={() => navigate('/explore')} />;
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingRoute />} />
              <Route path="/explore" element={<TreeKnowledgePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/tools/legal-advisor" element={<LegalAdvisorPage />} />
              <Route path="/tools/legal-research" element={<LegalResearchPage />} />
              <Route
                path="/tools/document-simplifier"
                element={
                  <ProtectedRoute>
                    <DocumentSimplifierPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/drafting-assistant"
                element={
                  <ProtectedRoute>
                    <DraftingAssistantPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/notice-reply"
                element={
                  <ProtectedRoute>
                    <NoticeReplyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/legal-vault"
                element={
                  <ProtectedRoute>
                    <LegalVaultPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/vault-storage"
                element={<Navigate to="/tools/legal-vault" replace />}
              />
              <Route
                path="/tools/provision-converter"
                element={<LegalProvisionConverterPage />}
              />
              <Route
                path="/tools/ipc-bns-converter"
                element={<Navigate to="/tools/provision-converter" replace />}
              />
              <Route
                path="/tools/lawyer-preparation"
                element={
                  <ProtectedRoute>
                    <LawyerPreparationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/lawyer-prep"
                element={<Navigate to="/tools/lawyer-preparation" replace />}
              />
              <Route
                path="/tools/legal-aid-finder"
                element={<LegalAidFinderPage />}
              />
              <Route
                path="/tools/pro-bono-finder"
                element={<Navigate to="/tools/legal-aid-finder" replace />}
              />
              <Route
                path="/tools/scam-detector"
                element={
                  <ProtectedRoute>
                    <ScamDetectorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/fraud-detection"
                element={<Navigate to="/tools/scam-detector" replace />}
              />
              <Route path="/tools/:toolSlug" element={<ToolPlaceholderPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
