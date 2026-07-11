"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Company, Contact } from "@/lib/types";

const CONTACT_TYPES = ["principal", "secundario", "compras", "chef", "almacen", "operaciones", "administrativo"] as const;
type ContactType = (typeof CONTACT_TYPES)[number];

type FormState = {
  companyId: string;
  fullName: string;
  contactType: ContactType;
  position: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyForm: FormState = {
  company