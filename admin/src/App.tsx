import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AdminLayout from "@/components/layouts/AdminLayout"
import LoginPage from "@/pages/auth/LoginPage"
import DashboardHome from "@/pages/dashboard/DashboardHome"
import NotFoundPage from "@/pages/NotFoundPage"
import { AuthGuard } from "@/components/common/AuthGuard"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/auth/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route path="/" element={
          <AuthGuard>
            <AdminLayout />
          </AuthGuard>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHome />} />

          {/* Placeholder routes - to be implemented */}
          <Route path="courses" element={<PlaceholderPage title="Khóa học (LMS)" />} />
          <Route path="lessons" element={<PlaceholderPage title="Bài học" />} />
          <Route path="questions" element={<PlaceholderPage title="Kho câu hỏi" />} />
          <Route path="videos" element={<PlaceholderPage title="Video / Youtube" />} />
          <Route path="news" element={<PlaceholderPage title="Tin tức (News)" />} />
          <Route path="users" element={<PlaceholderPage title="Học viên" />} />
          <Route path="staffs" element={<PlaceholderPage title="Phân quyền" />} />
          <Route path="plans" element={<PlaceholderPage title="Gói cước" />} />
          <Route path="transactions" element={<PlaceholderPage title="Giao dịch" />} />
          <Route path="ai-config" element={<PlaceholderPage title="AI & Prompts" />} />
          <Route path="media" element={<PlaceholderPage title="Media / Files" />} />

          <Route path="settings" element={<PlaceholderPage title="Cấu hình" />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

// Temporary placeholder for unimplemented pages
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] rounded-lg border-2 border-dashed">
      <h1 className="text-2xl font-bold text-muted-foreground">{title}</h1>
      <p className="text-muted-foreground mt-2">Trang này đang được phát triển...</p>
    </div>
  )
}

export default App
