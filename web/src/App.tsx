import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import VerificationPage from './pages/VerificationPage';
import GiftListPage from './pages/GiftListPage';
import GiftLookupPage from './pages/GiftLookupPage';
import AdminPage from './pages/AdminPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <PageLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/inscricao" element={<RegistrationPage />} />
          <Route path="/confirmacao" element={<VerificationPage />} />
          <Route path="/listas" element={<GiftListPage />} />
          <Route path="/consultar" element={<GiftLookupPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageLayout>
    </BrowserRouter>
  );
};

export default App;
