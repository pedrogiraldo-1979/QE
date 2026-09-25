"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { isCrmAdmin, parseCrmSessionContext, type CrmRole } from "@/features/crm/authorizationModel";
import { getSupabaseClient } from "@/lib/supabase";

export function useCrmSession() {
  const supabase = getSupabaseClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<CrmRole | null>(null);

  async function checkCrmAccess() {
    const { data, error } = await supabase.rpc("get_crm_session_context");
    return { context: parseCrmSessionContext(data), error };
  }

  useEffect(() => {
    let mounted = true;
    const timers = new Set<number>();

    async function verifySession(session: Session | null) {
      if (!session) {
        if (!mounted) return;
        setIsAuthenticated(false);
        setRole(null);
        setSessionReady(true);
        return;
      }

      const { context, error } = await checkCrmAccess();
      if (!mounted) return;

      const allowed = !error && context?.authorized === true;
      setIsAuthenticated(allowed);
      setRole(allowed ? context.role : null);
      setSessionReady(true);

      if (!error && !allowed) {
        await supabase.auth.signOut();
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      void verifySession(data.session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSessionReady(false);

      const timer = window.setTimeout(() => {
        timers.delete(timer);
        void verifySession(session);
      }, 0);
      timers.add(timer);
    });

    return () => {
      mounted = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error;

    const { context, error: accessError } = await checkCrmAccess();
    if (accessError) {
      setIsAuthenticated(false);
      setRole(null);
      setSessionReady(true);
      return new Error("No se pudo verificar la autorización del CRM. Intenta nuevamente.");
    }

    if (!context?.authorized) {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setRole(null);
      setSessionReady(true);
      return new Error("Este usuario no está autorizado para acceder al CRM.");
    }

    setIsAuthenticated(true);
    setRole(context.role);
    setSessionReady(true);
    return null;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setIsAuthenticated(false);
      setRole(null);
    }
    return error;
  }

  return { supabase, sessionReady, isAuthenticated, role, isAdmin: isCrmAdmin(role), signIn, signOut };
}
