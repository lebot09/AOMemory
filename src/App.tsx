import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Play } from './pages/Play'
import { AdminGate } from './admin/AdminGate'
import { AdminHome } from './admin/AdminHome'
import { AdminSet } from './admin/AdminSet'
import { SettingsPage } from './pages/SettingsPage'
import { SettingsProvider } from './settings/SettingsContext'
import { Booth } from './booth/Booth'
import { OnlineStart } from './online/OnlineStart'
import { OnlineRoom } from './online/OnlineRoom'

const router = createBrowserRouter([
  { path: '/booth', element: <Booth /> },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/play', element: <Play /> },
      { path: '/online', element: <OnlineStart /> },
      { path: '/online/:code', element: <OnlineRoom /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/admin', element: <AdminGate><AdminHome /></AdminGate> },
      { path: '/admin/sets/:id', element: <AdminGate><AdminSet /></AdminGate> },
    ],
  },
])

export default function App() {
  return <SettingsProvider><RouterProvider router={router} /></SettingsProvider>
}
