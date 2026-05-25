import { useState, useEffect } from "react";
import {
  useListBusinesses,
  useListQueues,
  useCreateQueue,
  useListQueueEntries,
  useCallNext,
  useUpdateQueueEntryStatus,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Ticket, Clock, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = {
  waiting: "bg-yellow-500",
  called: "bg-blue-500",
  in_service: "bg-green-500",
  done: "bg-gray-500",
  cancelled: "bg-red-500",
  no_show: "bg-orange-500",
};

const statusLabel: Record<string, string> = {
  waiting: "Waiting",
  called: "Called",
  in_service: "In Service",
  done: "Done",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export default function QueuePage() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [selectedQueueId, setSelectedQueueId] = useState<string>("");
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const { data: businesses, isLoading: loadingBusinesses } = useListBusinesses();

  const queueParams = selectedBusinessId
    ? { businessId: selectedBusinessId, date: today }
    : { businessId: "", date: today };
  const { data: queues, isLoading: loadingQueues } = useListQueues(
    queueParams,
    { query: { enabled: !!selectedBusinessId, queryKey: ["/api/queues", queueParams] } }
  );

  const { data: entries, isLoading: loadingEntries } = useListQueueEntries(
    selectedQueueId || "",
    {},
    { query: { enabled: !!selectedQueueId, queryKey: ["/api/queues/entries", selectedQueueId] } }
  );

  const callNext = useCallNext();
  const updateEntry = useUpdateQueueEntryStatus();

  const activeQueue = queues?.[0];

  useEffect(() => {
    if (activeQueue && !selectedQueueId) {
      setSelectedQueueId(activeQueue.id);
    }
  }, [activeQueue, selectedQueueId]);

  function handleCallNext() {
    if (!activeQueue) return;
    callNext.mutate(
      { id: activeQueue.id },
      {
        onSuccess: () => {
          toast({ title: "Next client called", description: "The next waiting client has been notified." });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Could not call next client.", variant: "destructive" });
        },
      }
    );
  }

  function handleMarkDone(entryId: string) {
    if (!selectedQueueId) return;
    updateEntry.mutate(
      { queueId: selectedQueueId, id: entryId, data: { status: "done" } },
      {
        onSuccess: () => toast({ title: "Marked as done" }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleMarkNoShow(entryId: string) {
    if (!selectedQueueId) return;
    updateEntry.mutate(
      { queueId: selectedQueueId, id: entryId, data: { status: "no_show" } },
      {
        onSuccess: () => toast({ title: "Marked as no-show" }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  const waitingEntries = entries?.filter((e) => e.status === "waiting" || e.status === "called") || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Queue</h1>
          <p className="text-muted-foreground">Manage waiting clients and call next in line.</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedBusinessId} onValueChange={(v) => { setSelectedBusinessId(v); setSelectedQueueId(""); }}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select business" />
            </SelectTrigger>
            <SelectContent>
              {businesses?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadingBusinesses || loadingQueues ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : !selectedBusinessId ? (
        <Card className="p-12 text-center">
          <CardHeader>
            <CardTitle>Select a Business</CardTitle>
            <CardDescription>Choose a business to view its live queue.</CardDescription>
          </CardHeader>
        </Card>
      ) : !activeQueue ? (
        <Card className="p-12 text-center">
          <CardHeader>
            <CardTitle>No Active Queue</CardTitle>
            <CardDescription>There is no queue open for today.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateQueueButton businessId={selectedBusinessId} />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
                <Badge variant={activeQueue.status === "open" ? "default" : activeQueue.status === "paused" ? "secondary" : "outline"}>
                  {activeQueue.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeQueue.currentTicket} / {activeQueue.lastTicket}</div>
                <p className="text-xs text-muted-foreground">Current / Last ticket</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Waiting Now</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{waitingEntries.length}</div>
                <p className="text-xs text-muted-foreground">Clients in line</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Wait</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeQueue.avgWaitMinutes}m</div>
                <p className="text-xs text-muted-foreground">Estimated average</p>
              </CardContent>
            </Card>
            <Card className="flex items-center justify-center">
              <CardContent className="pt-6">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCallNext}
                  disabled={callNext.isPending || waitingEntries.length === 0}
                  data-testid="button-call-next"
                >
                  <Ticket className="h-5 w-5 mr-2" />
                  Call Next
                </Button>
              </CardContent>
            </Card>
          </div>

          {loadingEntries ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
            </div>
          ) : waitingEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <CardHeader>
                <CardTitle>No one waiting</CardTitle>
                <CardDescription>All clients have been served or the queue is empty.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {waitingEntries.map((entry) => (
                <Card key={entry.id} data-testid={`card-entry-${entry.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`${statusColor[entry.status] || "bg-gray-500"} text-white`}>
                          #{entry.ticketNumber}
                        </Badge>
                        <span className="font-semibold">{entry.clientName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{statusLabel[entry.status]}</span>
                    </div>
                    {entry.clientPhone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Phone className="h-3 w-3" />
                        {entry.clientPhone}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span>Est. wait: {entry.estimatedWaitMinutes ?? activeQueue.avgWaitMinutes}m</span>
                      {entry.waitingAhead !== undefined && (
                        <span>{entry.waitingAhead} ahead</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleMarkDone(entry.id)}
                        disabled={updateEntry.isPending}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Done
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleMarkNoShow(entry.id)}
                        disabled={updateEntry.isPending}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        No Show
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CreateQueueButton({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const createQueue = useCreateQueue();
  const today = new Date().toISOString().split("T")[0];

  function handleCreate() {
    createQueue.mutate(
      { data: { businessId, date: today } },
      {
        onSuccess: () => toast({ title: "Queue opened for today" }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <Button onClick={handleCreate} disabled={createQueue.isPending}>
      {createQueue.isPending ? "Opening..." : "Open Queue for Today"}
    </Button>
  );
}
