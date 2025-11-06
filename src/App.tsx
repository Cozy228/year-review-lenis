import { useState } from 'react'
import Layout from './components/Layout'
import RealViewport from './components/RealViewport'
import { useScroll } from './hooks/useScroll'

export default function App() {
  const [progress, setProgress] = useState(0)

  useScroll((event) => {
    setProgress(event.progress)
  }, [])

  return (
    <Layout>
      <RealViewport />

      <section className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs uppercase tracking-[0.3em] text-zinc-500">
          Lenis Migration
        </span>
        <h1 className="text-5xl font-semibold tracking-tight text-zinc-100 md:text-6xl">
          React + Vite playground ready for animation porting
        </h1>
        <p className="max-w-2xl text-pretty text-lg text-zinc-400">
          This Vite workspace mirrors the Lenis home scaffolding. Tailwind v4,
          Lenis, GSAP, Tempus, and Zustand are wired up so the original scroll
          choreography can be reimplemented section by section.
        </p>
        <div className="mt-8 text-sm text-zinc-500">
          Scroll progress:{' '}
          <span className="font-semibold text-zinc-200">
            {(progress * 100).toFixed(0)}%
          </span>
        </div>
      </section>

      <section className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black px-6 py-24 text-zinc-200">
        <div className="mx-auto flex max-w-4xl flex-col gap-12">
          <article className="space-y-3">
            <h2 className="text-3xl font-semibold text-white">
              Next Steps
            </h2>
            <p className="text-zinc-400">
              Start migrating individual sections from the Next.js app into
              dedicated components under <code>src/sections</code>. Each section
              can consume the shared Lenis store, animation hooks, and utility
              helpers established in this scaffold.
            </p>
          </article>
          <article className="space-y-3">
            <h3 className="text-2xl font-semibold text-white">
              Animation Loop
            </h3>
            <p className="text-zinc-400">
              GSAP and Tempus share a unified RAF. When GSAP timelines are
              reintroduced, register them in <code>src/main.tsx</code> so they
              inherit the consolidated timing setup.
            </p>
          </article>
        </div>
      </section>
    </Layout>
  )
}
