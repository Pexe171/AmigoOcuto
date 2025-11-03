import { Routes, Route } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import GiftListPage from './pages/GiftListPage';
import VerificationPage from './pages/VerificationPage';
import AdminPage from './pages/AdminPage';

const App: React.FC = () => {
  return (
    <PageLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/inscricao" element={<RegistrationPage />} />
        <Route path="/listas" element={<GiftListPage />} />
        <Route path="/confirmacao" element={<VerificationPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </PageLayout>
  );
};

export default App;
