import { Routes, Route } from 'react-router-dom';
import { ProjectListPage } from './pages/ProjectListPage';
import { EditorPage } from './pages/EditorPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/project/:projectId" element={<EditorPage />} />
    </Routes>
  );
}
