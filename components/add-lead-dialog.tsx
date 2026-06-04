"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { leadValuesToRaw, type ManualLeadValues } from "@/lib/parse";
import type { Lead } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  columns: string[];
  onAdd: (lead: Lead, columns: string[]) => void;
};

type FormState = {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  email: string;
  location: string;
  linkedin: string;
};

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  title: "",
  company: "",
  email: "",
  location: "",
  linkedin: "",
};

export function AddLeadDialog({ open, onOpenChange, columns, onAdd }: Props) {
  const [form, setForm] = useState<FormState>({ ...EMPTY });

  const set =
    (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  function submit() {
    if (!form.firstName && !form.lastName && !form.email && !form.linkedin) {
      toast.error("Add at least a name, email, or LinkedIn URL");
      return;
    }
    const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ") || undefined;
    const values: ManualLeadValues = {
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      fullName,
      title: form.title || undefined,
      company: form.company || undefined,
      email: form.email || undefined,
      location: form.location || undefined,
      linkedin: form.linkedin || undefined,
    };
    const { raw, columns: nextColumns } = leadValuesToRaw(values, columns);

    const lead: Lead = {
      id: crypto.randomUUID(),
      firstName: values.firstName,
      lastName: values.lastName,
      fullName,
      title: values.title,
      company: values.company,
      email: values.email,
      location: values.location,
      linkedin: values.linkedin,
      raw,
      status: "pending",
    };

    onAdd(lead, nextColumns);
    toast.success(`Added ${fullName || values.email || "lead"}`);
    setForm({ ...EMPTY });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a person</DialogTitle>
          <DialogDescription>
            Manually add someone to the list. A LinkedIn URL lets you enrich them.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name">
            <Input value={form.firstName} onChange={set("firstName")} placeholder="Jane" />
          </Field>
          <Field label="Last name">
            <Input value={form.lastName} onChange={set("lastName")} placeholder="Doe" />
          </Field>
          <Field label="Title">
            <Input value={form.title} onChange={set("title")} placeholder="VP of Sales" />
          </Field>
          <Field label="Company">
            <Input value={form.company} onChange={set("company")} placeholder="Acme" />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={set("email")} placeholder="jane@acme.com" />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={set("location")} placeholder="Austin, TX" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="LinkedIn URL">
              <Input
                value={form.linkedin}
                onChange={set("linkedin")}
                placeholder="https://www.linkedin.com/in/janedoe/"
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <UserPlus className="size-4" />
            Add lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
