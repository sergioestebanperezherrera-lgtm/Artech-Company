"use client";

import { Card } from "@/components/ui";
import type { User } from "@/lib/types";

type UserProfileCardProps = {
  user: User;
};

export function UserProfileCard({ user }: UserProfileCardProps) {
  return (
    <Card className="p-5">
      <div className="grid gap-4">
        <h2 className="text-xl font-medium">Mis datos</h2>
        <div className="grid gap-2 text-sm text-text-secondary-on-light">
          Nombre
          <p className="min-h-11 rounded-input border border-border-on-light px-3 py-3 text-text-primary-on-light">
            {user.name}
          </p>
        </div>
        <div className="grid gap-2 text-sm text-text-secondary-on-light">
          Email
          <p className="min-h-11 rounded-input border border-border-on-light px-3 py-3 text-text-primary-on-light">
            {user.email}
          </p>
        </div>
        <p className="text-sm leading-6 text-text-secondary-on-light">
          La edición de perfil se conectará al backend en una fase posterior.
        </p>
      </div>
    </Card>
  );
}
