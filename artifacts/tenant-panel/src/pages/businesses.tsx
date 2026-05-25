import { useListBusinesses } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Businesses() {
  const { data: businesses, isLoading } = useListBusinesses();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Businesses</h1>
          <p className="text-muted-foreground">Manage your salon locations.</p>
        </div>
        <Button data-testid="button-add-business">
          <Plus className="h-4 w-4 mr-2" />
          Add Business
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : businesses?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <CardHeader>
            <CardTitle>No businesses yet</CardTitle>
            <CardDescription>Get started by creating your first salon location.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button data-testid="button-create-first-business">Create Business</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {businesses?.map((business) => (
            <Card key={business.id} data-testid={`card-business-${business.id}`}>
              <CardHeader>
                <CardTitle>{business.name}</CardTitle>
                <CardDescription>{business.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {business.address || "No address provided"}
                </p>
                <Button variant="outline" className="w-full" data-testid={`button-manage-${business.id}`}>
                  Manage
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
