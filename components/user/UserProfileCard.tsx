"use client";

import { FormEvent, useState } from "react";
import { Button, Card } from "@/components/ui";
import type { User } from "@/lib/types";

type UserProfileCardProps = {
  user: User;
};

export function UserProfileCard({ user }: UserProfileCardProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    if (!name.trim() || !email.trim()) {
      setMessage("Completa nombre y correo para guardar los cambios.");
      return;
    }

    setIsSaving(true);
    setMessage("Datos actualizados en el estado mock.");
    setIsSaving(false);
  };

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <h2 className="text-xl font-medium">Mis datos</h2>
        <label className="grid gap-2 text-sm text-text-secondary-on-light">
          Nombre
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 rounded-input border border-border-on-light px-3 text-text-primary-on-light"
          />
        </label>
        <label className="grid gap-2 text-sm text-text-secondary-on-light">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-input border border-border-on-light px-3 text-text-primary-on-light"
          />
        </label>
        {message ? (
          <p className="text-sm text-text-secondary-on-light" role="status" aria-live="polite">
            {message}
          </p>
        ) : null}
        <Button
          variant="primary-on-light"
          type="submit"
          className="w-max"
          isLoading={isSaving}
          loadingLabel="Guardando..."
        >
          Guardar cambios
        </Button>
      </form>
    </Card>
  );
}
