import DashboardSideBar from "@/src/components/dashboard/dashboard-side-bar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/src/components/ui/sidebar";

export default function DashboardPage() {
  return (
    <SidebarProvider>
      <DashboardSideBar/>
      <SidebarTrigger/>
      <SidebarInset>
        <main className="flex-1 p-6 md:p-8 lg:p-10">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back! Here's what's happening with your properties.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Stat Card 1 */}
              <div className="h-32 bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                Stat Card 1
              </div>
              {/* Stat Card 2 */}
              <div className="h-32 bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                Stat Card 2
              </div>
              {/* Stat Card 3 */}
              <div className="h-32 bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                Stat Card 3
              </div>
              {/* Stat Card 4 */}
              <div className="h-32 bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                Stat Card 4
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Large Chart/Table Area */}
              <div className="lg:col-span-2 bg-muted/20 rounded-md p-6 min-h-[400px]">
                <h2 className="text-xl font-semibold mb-4">Bookings Overview</h2>
                <div className="flex items-center justify-center h-[320px] text-muted-foreground">
                  Chart/Graph Component
                </div>
              </div>

              {/* Quick Actions / Recent Activity */}
              <div className="bg-muted/20 rounded-md p-6 min-h-[400px]">
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <div className="flex items-center justify-center h-[320px] text-muted-foreground">
                  Activity Feed Component
                </div>
              </div>
            </div>

            {/* Bottom Section - Full Width */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Reservations Table */}
              <div className="bg-muted/20 rounded-md p-6 min-h-[300px]">
                <h2 className="text-xl font-semibold mb-4">Upcoming Reservations</h2>
                <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                  Reservations Table Component
                </div>
              </div>

              {/* Channel Performance */}
              <div className="bg-muted/20 rounded-md p-6 min-h-[300px]">
                <h2 className="text-xl font-semibold mb-4">Channel Performance</h2>
                <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                  Channel Stats Component
                </div>
              </div>
            </div>
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}