import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Play } from './pages/Play'
import { Admin } from './pages/Admin'
import { SettingsPage } from './pages/SettingsPage'
import { SettingsProvider } from './settings/SettingsContext'
import { Booth } from './booth/Booth'

const router = createBrowserRouter([
  { path: '/booth', element: <Booth /> },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/play', element: <Play /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/admin', element: <Admin /> },
    ],
  },
])

export default function App() {
  return <SettingsProvider><RouterProvider router={router} /></SettingsProvider>
}
