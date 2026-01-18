import Link from 'next/link';
import { getScrapeJobs } from '@/lib/data';
import { formatNepalDateTime } from '@/lib/time';
import { requireAuth } from '@/lib/auth';
import { logoutAction } from '@/app/login/actions';

export default async function LogsPage() {
  await requireAuth();
  const jobs = await getScrapeJobs(50);

  return (
    <main className="min-h-screen px-4 md:px-10 lg:px-12 py-8 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Operations</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-2">Script Logs</h1>
          <p className="text-sm text-slate-500 mt-2">Latest scrape runs and timing.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition"
          >
            Dashboard
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="glass-panel rounded-3xl p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-slate-500">
                <th className="px-3 py-3">Started</th>
                <th className="px-3 py-3">Completed</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Flights</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-slate-500" colSpan={6}>
                    No scrape runs recorded yet.
                  </td>
                </tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">
                      {formatNepalDateTime(job.started_at)} NPT
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">
                      {job.completed_at ? `${formatNepalDateTime(job.completed_at)} NPT` : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-600">
                        {job.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {job.flights_captured ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {job.scrape_type || '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-500 max-w-[320px]">
                      {job.error_message || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
