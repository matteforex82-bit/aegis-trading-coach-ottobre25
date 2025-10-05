export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          🛡️ AEGIS Trading Coach
        </h1>
        <p className="text-center text-lg mb-4">
          Professional trading dashboard with MT4/MT5 integration
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-6">
            <h3 className="font-bold mb-2">✅ Real-time Sync</h3>
            <p className="text-sm text-muted-foreground">
              Automatic synchronization with MetaTrader 4/5
            </p>
          </div>
          <div className="border border-border rounded-lg p-6">
            <h3 className="font-bold mb-2">📊 Advanced Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Detailed statistics and performance metrics
            </p>
          </div>
          <div className="border border-border rounded-lg p-6">
            <h3 className="font-bold mb-2">🎯 Multi-Account</h3>
            <p className="text-sm text-muted-foreground">
              Manage demo, live, and prop firm accounts
            </p>
          </div>
        </div>
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Next.js 15.5.4 • React 18.3.1 • Prisma 6.16.3 • NextAuth 4.24.11
          </p>
        </div>
      </div>
    </div>
  );
}
