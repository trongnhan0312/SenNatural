import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import AIChat from "./pages/AIChat";
import Layout from "./components/Layout";
import InventoryImport from "./pages/InventoryImport";
import InventoryExport from "./pages/InventoryExport";
import History from "./pages/History";
import Statistics from "./pages/Statistics";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Waybills from "./pages/Waybills";

const Private = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Private>
            <Layout>
              <Dashboard />
            </Layout>
          </Private>
        }
      />
      <Route
        path="/products"
        element={
          <Private>
            <Layout>
              <Products />
            </Layout>
          </Private>
        }
      />
      <Route
        path="/ai"
        element={<Navigate to="/" />}
      />
      <Route
        path="/inventory/import"
        element={
          <Private>
            <Layout>
              <InventoryImport />
            </Layout>
          </Private>
        }
      />
      <Route
        path="/inventory/export"
        element={
          <Private>
            <Layout>
              <InventoryExport />
            </Layout>
          </Private>
        }
      />
      <Route
        path="/inventory/history"
        element={
          <Private>
            <Layout>
              <History />
            </Layout>
          </Private>
        }
      />
      <Route
        path="/waybills"
        element={
          <Private>
            <Layout>
              <Waybills />
            </Layout>
          </Private>
        }
      />
      <Route
        path="/statistic"
        element={
          <Private>
            <Layout>
              <Statistics />
            </Layout>
          </Private>
        }
      />
      <Route
        path="/users"
        element={
          <Private>
            <Layout>
              <Users />
            </Layout>
          </Private>
        }
      />
      <Route
        path="/settings"
        element={
          <Private>
            <Layout>
              <Settings />
            </Layout>
          </Private>
        }
      />
    </Routes>
  );
}
