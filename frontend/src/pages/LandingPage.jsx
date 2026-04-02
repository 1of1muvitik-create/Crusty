import React from 'react'
import { Link } from 'react-router-dom'

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-primary">Crusties</p>
          <p className="text-sm text-slate-500">Sales & Stock Management</p>
        </div>
        <nav className="flex items-center gap-4">
          <Link to="/login" className="btn-secondary">Login</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 lg:py-20">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary text-sm font-semibold">
              Built for vending businesses, cafes, and food trucks
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Run your food business with confidence.</h1>
              <p className="mt-6 max-w-2xl text-lg text-slate-600">
                Crusties brings inventory tracking, sales insights, role-based dashboards, and real-time order flow into a single smart system so your team stays fast and accurate.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link to="/login" className="btn-primary inline-flex items-center justify-center text-center">
                Get started
              </Link>
              <a href="#features" className="btn-secondary inline-flex items-center justify-center text-center">
                See features
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] bg-gradient-to-br from-primary to-orange-500 p-1 shadow-lg shadow-slate-200/60">
            <div className="h-full rounded-[1.75rem] bg-white p-8 sm:p-10">
              <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <p className="text-sm uppercase tracking-[.2em] text-slate-500">Dashboard preview</p>
                <h2 className="mt-4 text-2xl font-semibold text-slate-900">Fast order flow and inventory status</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  One dashboard for managers, admins, and front-line staff to stay aligned and make better decisions.
                </p>
              </div>
              <div className="grid gap-4">
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">Live sales</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">$12.4K</p>
                  <p className="text-sm text-slate-500">Today so far</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">Inventory health</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">98%</p>
                  <p className="text-sm text-slate-500">Stock items in range</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-20 grid gap-8 md:grid-cols-3">
          {[
            {
              title: 'Stock control',
              description: 'Track ingredients, products, and low stock alerts across every location.'
            },
            {
              title: 'Role-based access',
              description: 'Separate admin, manager, and cashier views with secure access for every team member.'
            },
            {
              title: 'Sales reporting',
              description: 'Review daily revenue, order counts, and shift performance in seconds.'
            }
          ].map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-3 text-slate-600">{feature.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-10 text-white">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[.2em] text-slate-400">Why Crusties</p>
              <h2 className="mt-4 text-3xl font-bold">Build consistency across every shift.</h2>
              <p className="mt-4 max-w-2xl text-slate-300">
                Keep sales, inventory, and customer service in sync with workflows designed for busy food businesses. Your team can launch faster, reduce waste, and focus on what matters most.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Quick setup', value: 'Ready in minutes' },
                { label: 'Secure access', value: 'Role-based login' },
                { label: 'Accurate counts', value: 'Real-time stock updates' },
                { label: 'Smart reporting', value: 'Shift insights' }
              ].map((stat) => (
                <div key={stat.label} className="rounded-3xl bg-slate-800 p-5">
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="mt-3 text-xl font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-6 text-sm text-slate-500 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Crusties System. Built for faster food service management.</p>
          <Link to="/login" className="text-primary hover:underline">Sign in to your account</Link>
        </div>
      </footer>
    </div>
  )
}
