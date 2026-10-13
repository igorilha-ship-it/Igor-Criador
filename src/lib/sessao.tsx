import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';
import type { Perfil } from './tipos';

type ContextoSessao = {
  sessao: Session | null;
  perfil: Perfil | null;
  carregando: boolean;
  recarregarPerfil: () => Promise<void>;
  sair: () => Promise<void>;
};

const Contexto = createContext<ContextoSessao | null>(null);

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  const buscarPerfil = useCallback(async (usuarioId: string | undefined) => {
    if (!usuarioId) {
      setPerfil(null);
      return;
    }
    const { data } = await supabase.from('perfis').select('*').eq('id', usuarioId).single();
    setPerfil(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSessao(data.session);
      await buscarPerfil(data.session?.user.id);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
      buscarPerfil(novaSessao?.user.id);
    });
    return () => data.subscription.unsubscribe();
  }, [buscarPerfil]);

  const valor: ContextoSessao = {
    sessao,
    perfil,
    carregando,
    recarregarPerfil: () => buscarPerfil(sessao?.user.id),
    sair: async () => {
      await supabase.auth.signOut();
    },
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSessao precisa estar dentro de ProvedorSessao');
  return ctx;
}
