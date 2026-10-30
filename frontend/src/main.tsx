import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { AuthProvider } from './auth/AuthContext'
import { InicioRedirect, RequireAuth, RequirePermiso } from './auth/Guardias'
import AppLayout from './layout/AppLayout'
import LoginPage from './pages/LoginPage'
import ProximamentePage from './pages/ProximamentePage'
import CampanasPage from './features/campanas/CampanasPage'
import CampanaWizardPage from './features/campanas/CampanaWizardPage'
import CampanaDetallePage from './features/campanas/CampanaDetallePage'
import ConfiguracionPage from './features/admin/ConfiguracionPage'
import MonitoreoPage from './features/monitoreo/MonitoreoPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route index element={<InicioRedirect />} />

                <Route element={<RequirePermiso permiso="CAMPANA_VER" />}>
                  <Route path="/campanas" element={<CampanasPage />} />
                  <Route path="/campanas/:id" element={<CampanaDetallePage />} />
                </Route>
                <Route element={<RequirePermiso permiso="CAMPANA_CREAR" />}>
                  <Route path="/campanas/nueva" element={<CampanaWizardPage />} />
                  <Route path="/campanas/:id/editar" element={<CampanaWizardPage />} />
                </Route>

                <Route element={<RequirePermiso permiso="CONVERSACION_VER_PROPIAS" />}>
                  <Route path="/atencion" element={
                    <ProximamentePage titulo="Atención humana" descripcion="Bandeja de conversaciones asignadas." />} />
                </Route>
                <Route element={<RequirePermiso permiso="MONITOREO_VER" />}>
                  <Route path="/monitoreo" element={<MonitoreoPage />} />
                </Route>
                <Route element={<RequirePermiso permiso="ADMIN_USUARIOS" />}>
                  <Route path="/configuracion" element={<ConfiguracionPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
