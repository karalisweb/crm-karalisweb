import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-16 flex flex-col items-center justify-center text-center">
        <div className="mb-4 text-muted-foreground opacity-50">
          {icon}
        </div>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-[320px] mb-6">
          {description}
        </p>
        {action && (
          <Link href={action.href}>
            <Button variant="outline" size="sm">
              {action.label}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
