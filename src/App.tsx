import { Layout } from './components/Layout'
import Home from './sections/Home'
import TestGsap from './pages/TestGsap'

function App() {
  // Simple routing based on query parameter
  const searchParams = new URLSearchParams(window.location.search)
  const testMode = searchParams.get('test')

  // Render test page without layout
  if (testMode === 'gsap') {
    return <TestGsap />
  }

  // Default: render home with layout
  return (
    <Layout>
      <Home />
    </Layout>
  )
}

export default App

