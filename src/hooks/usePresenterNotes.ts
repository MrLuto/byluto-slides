import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PresenterNote {
  id: string;
  slideId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const DEBOUNCE_MS = 500;

export function usePresenterNotes(slideId: string | null, legacySlideId?: string | null) {
  const [note, setNote] = useState<PresenterNote | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const noteIdRef = useRef<string | null>(null);

  const fetchNote = useCallback(async () => {
    if (!slideId) {
      setNote(null);
      setContent('');
      return;
    }

    try {
      setLoading(true);

      // 1) Try the stable id first.
      let { data, error } = await supabase
        .from('presenter_notes')
        .select('*')
        .eq('slide_id', slideId)
        .maybeSingle();

      if (error) throw error;

      // 2) If nothing found and a legacy id was provided, look it up and
      //    migrate the row's slide_id to the new stable id so future loads
      //    hit the fast path. This is a one-time, per-slide rewrite.
      if (!data && legacySlideId && legacySlideId !== slideId) {
        const legacy = await supabase
          .from('presenter_notes')
          .select('*')
          .eq('slide_id', legacySlideId)
          .maybeSingle();

        if (legacy.error) throw legacy.error;

        if (legacy.data) {
          const migrated = await supabase
            .from('presenter_notes')
            .update({ slide_id: slideId })
            .eq('id', legacy.data.id)
            .select()
            .single();

          if (migrated.error) throw migrated.error;
          data = migrated.data;
        }
      }

      if (data) {
        const fetchedNote = {
          id: data.id,
          slideId: data.slide_id,
          content: data.content,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setNote(fetchedNote);
        setContent(data.content);
        noteIdRef.current = data.id;
      } else {
        setNote(null);
        setContent('');
        noteIdRef.current = null;
      }
    } catch (err) {
      console.error('Failed to fetch presenter note:', err);
    } finally {
      setLoading(false);
    }
  }, [slideId, legacySlideId]);

  useEffect(() => {
    fetchNote();
    // Clear debounce on slide change
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchNote]);

  const persistNote = useCallback(async (contentToSave: string) => {
    if (!slideId) return;

    setSaving(true);
    setSaveStatus('saving');

    try {
      if (noteIdRef.current) {
        // Update existing note
        const { error } = await supabase
          .from('presenter_notes')
          .update({ content: contentToSave })
          .eq('id', noteIdRef.current);

        if (error) throw error;
      } else {
        // Create new note
        const { data, error } = await supabase
          .from('presenter_notes')
          .insert({
            slide_id: slideId,
            content: contentToSave,
          })
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          noteIdRef.current = data.id;
          setNote({
            id: data.id,
            slideId: data.slide_id,
            content: data.content,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });
        }
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save presenter note:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  }, [slideId]);

  const updateContent = useCallback((newContent: string) => {
    // Optimistic update
    setContent(newContent);
    pendingContentRef.current = newContent;

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the save
    debounceRef.current = setTimeout(() => {
      if (pendingContentRef.current !== null) {
        persistNote(pendingContentRef.current);
        pendingContentRef.current = null;
      }
    }, DEBOUNCE_MS);
  }, [persistNote]);

  const deleteNote = async (): Promise<boolean> => {
    if (!noteIdRef.current) return false;

    try {
      const { error } = await supabase
        .from('presenter_notes')
        .delete()
        .eq('id', noteIdRef.current);

      if (error) throw error;

      setNote(null);
      setContent('');
      noteIdRef.current = null;
      return true;
    } catch (err) {
      console.error('Failed to delete presenter note:', err);
      return false;
    }
  };

  return {
    note,
    content,
    loading,
    saving,
    saveStatus,
    updateContent,
    deleteNote,
    refetch: fetchNote,
  };
}
