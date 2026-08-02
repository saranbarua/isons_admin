import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AppLayout from "./layouts/AppLayout";
import AuditLogsList from "./pages/audit/AuditLogsList";
import AuditLogDetail from "./pages/audit/AuditLogDetail";
import CategoriesList from "./pages/categories/CategoriesList";
import CategoryDetail from "./pages/categories/CategoryDetail";
import ProductsList from "./pages/products/ProductsList";
import ProductDetail from "./pages/products/ProductDetail";
import UsersList from "./pages/users/UsersList";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Categories (ADMIN or MODERATOR) */}
          <Route path="/categories" element={<CategoriesList />} />
          <Route path="/categories/:id" element={<CategoryDetail />} />
          {/* Products (ADMIN or MODERATOR) */}
          <Route path="/products" element={<ProductsList />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route element={<AdminRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<UsersList />} />
            <Route path="/audit-logs" element={<AuditLogsList />} />
            <Route path="/audit-logs/:id" element={<AuditLogDetail />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
