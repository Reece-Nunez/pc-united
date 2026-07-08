'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { SkeletonTable } from '@/components/admin/Skeleton';
import toast from 'react-hot-toast';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import {
  getPlayers, getMedicalForms, createMedicalFormRequest, deleteMedicalForm, updateMedicalForm,
  Player, MedicalForm,
} from '@/lib/supabase';
import { logActivity } from '@/lib/audit';
import { createClient } from '@/lib/supabase-browser';
import MedicalFormPrintable from './MedicalFormPrintable';

const safeName = (s: string) => (s || 'player').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function MedicalFormsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [forms, setForms] = useState<MedicalForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [newPlayerId, setNewPlayerId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendModal, setSendModal] = useState<MedicalForm | null>(null);
  const [sendPhone, setSendPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [viewForm, setViewForm] = useState<MedicalForm | null>(null);

  const printRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    fetchData();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [playersRes, formsRes] = await Promise.all([getPlayers(), getMedicalForms()]);
      if (!playersRes.error) setPlayers(playersRes.data || []);
      if (!formsRes.error) setForms(formsRes.data || []);
    } catch {
      toast.error('Error loading medical forms');
    } finally {
      setLoading(false);
    }
  };

  const completedForms = useMemo(() => forms.filter(f => f.status === 'completed'), [forms]);

  const formLink = (token: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/forms/medical/${token}` : `/forms/medical/${token}`;

  const handleGenerate = async () => {
    if (!newPlayerId) { toast.error('Pick a player first'); return; }
    const player = players.find(p => String(p.id) === newPlayerId);
    setGenerating(true);
    try {
      const { data, error } = await createMedicalFormRequest({
        player_id: player ? player.id : null,
        player_name: player?.name,
        created_by: userEmail || undefined,
      });
      if (error) throw new Error(error.message);
      toast.success('Form created — copy or text the link to the parent');
      logActivity('create', 'medical_form', data?.id || newPlayerId, userEmail, { player: player?.name });
      setNewPlayerId('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not create form');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(formLink(token));
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy — long-press the link to copy manually');
    }
  };

  const openSend = (form: MedicalForm) => {
    setSendModal(form);
    setSendPhone(form.sent_to_phone || '');
  };

  const handleSend = async () => {
    if (!sendModal) return;
    if (!sendPhone.trim()) { toast.error('Enter a phone number'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/medical-form/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: sendPhone, token: sendModal.token, playerName: sendModal.player_name || sendModal.players?.name }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to send text');
      await updateMedicalForm(sendModal.id, { sent_to_phone: sendPhone });
      logActivity('update', 'medical_form', sendModal.id, userEmail, { action: 'sms', to: sendPhone });
      toast.success('Text sent to parent');
      setSendModal(null);
      setSendPhone('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not send text');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (form: MedicalForm) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white">Delete this form?</span>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await deleteMedicalForm(form.id);
              if (error) { toast.error(error.message); return; }
              logActivity('delete', 'medical_form', form.id, userEmail);
              toast.success('Form deleted');
              fetchData();
            }}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Delete
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300">
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const completedIds = completedForms.map(f => f.id);
    const allSelected = completedIds.every(id => selected.has(id)) && completedIds.length > 0;
    setSelected(allSelected ? new Set() : new Set(completedIds));
  };

  // Rasterize the off-screen printable for a form → JPEG data URL.
  const renderJpeg = async (form: MedicalForm): Promise<string | null> => {
    const node = printRefs.current[form.id];
    if (!node) return null;
    return toJpeg(node, { quality: 0.95, backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true });
  };

  const targetForms = () => {
    const chosen = completedForms.filter(f => selected.has(f.id));
    return chosen.length ? chosen : [];
  };

  const exportJpeg = async () => {
    const list = targetForms();
    if (!list.length) { toast.error('Select at least one completed form'); return; }
    setExporting(true);
    try {
      if (list.length === 1) {
        const url = await renderJpeg(list[0]);
        if (!url) throw new Error('Could not render form');
        const blob = await (await fetch(url)).blob();
        downloadBlob(blob, `medical-release-${safeName(list[0].player_name || '')}.jpg`);
      } else {
        const zip = new JSZip();
        for (const form of list) {
          const url = await renderJpeg(form);
          if (url) zip.file(`medical-release-${safeName(form.player_name || String(form.id))}.jpg`, url.split(',')[1], { base64: true });
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, `medical-releases-${list.length}-players.zip`);
      }
      toast.success('Export ready');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    const list = targetForms();
    if (!list.length) { toast.error('Select at least one completed form'); return; }
    setExporting(true);
    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'letter' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let first = true;
      for (const form of list) {
        const url = await renderJpeg(form);
        if (!url) continue;
        const img = await loadImage(url);
        const maxW = pageW - margin * 2;
        const maxH = pageH - margin * 2;
        let w = maxW;
        let h = (img.height / img.width) * w;
        if (h > maxH) { h = maxH; w = (img.width / img.height) * h; }
        if (!first) pdf.addPage();
        pdf.addImage(url, 'JPEG', margin, margin, w, h);
        first = false;
      }
      pdf.save(list.length === 1 ? `medical-release-${safeName(list[0].player_name || '')}.pdf` : `medical-releases-${list.length}-players.pdf`);
      toast.success('PDF ready');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = completedForms.filter(f => selected.has(f.id)).length;

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Medical Forms</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Send, collect, and export player medical release forms</p>
          </div>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/forms/medical`);
                toast.success('Universal form link copied — share it in the group chat');
              } catch {
                toast.error('Could not copy the link');
              }
            }}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 shrink-0"
          >
            Copy group-chat link
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3 mb-6">
          Share the group-chat link and each parent picks their own child — or generate a specific player&apos;s link below to text individually.
        </p>

        {/* Generate + export toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-5 mb-6 flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
          <div className="flex items-center gap-2">
            <select
              value={newPlayerId}
              onChange={(e) => setNewPlayerId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-team-blue"
            >
              <option value="">Select a player…</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-team-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? 'Creating…' : '+ New Form'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{selectedCount} selected</span>
            <button
              onClick={exportJpeg}
              disabled={exporting || selectedCount === 0}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {exporting ? 'Exporting…' : 'Export JPEG'}
            </button>
            <button
              onClick={exportPdf}
              disabled={exporting || selectedCount === 0}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          {loading && forms.length === 0 ? (
            <SkeletonTable rows={5} />
          ) : forms.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
              No medical forms yet. Pick a player and click <strong>+ New Form</strong> to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">
                      <input type="checkbox" onChange={toggleAll}
                        checked={completedForms.length > 0 && completedForms.every(f => selected.has(f.id))}
                        className="h-4 w-4 rounded border-gray-300 text-team-blue focus:ring-team-blue" />
                    </th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 hidden md:table-cell">Sent to</th>
                    <th className="px-4 py-3 hidden md:table-cell">Completed</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {forms.map(form => {
                    const name = form.player_name || form.players?.name || 'Unknown player';
                    const done = form.status === 'completed';
                    return (
                      <tr key={form.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            disabled={!done}
                            checked={selected.has(form.id)}
                            onChange={() => toggle(form.id)}
                            className="h-4 w-4 rounded border-gray-300 text-team-blue focus:ring-team-blue disabled:opacity-30"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            done ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                 : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                            {done ? 'Completed' : 'Awaiting parent'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">{form.sent_to_phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                          {form.completed_at ? new Date(form.completed_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1.5 justify-end flex-wrap">
                            <button onClick={() => copyLink(form.token)} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200">Copy link</button>
                            <button onClick={() => openSend(form)} className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100">Send text</button>
                            {done && (
                              <button onClick={() => setViewForm(form)} className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100">View</button>
                            )}
                            <button onClick={() => handleDelete(form)} className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Send text modal */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !sending && setSendModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Text the form link</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              To the parent of <strong>{sendModal.player_name || sendModal.players?.name || 'this player'}</strong>, from the club&apos;s Twilio number.
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parent&apos;s mobile number</label>
            <input
              type="tel"
              value={sendPhone}
              onChange={e => setSendPhone(e.target.value)}
              placeholder="(918) 555-1234"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm"
            />
            <div className="flex gap-3 mt-5">
              <button onClick={handleSend} disabled={sending} className="flex-1 bg-team-blue text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                {sending ? 'Sending…' : 'Send text'}
              </button>
              <button onClick={() => setSendModal(null)} disabled={sending} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* View completed form modal */}
      {viewForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onClick={() => setViewForm(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-base font-semibold text-gray-900">
                {viewForm.player_name || viewForm.players?.name || 'Medical Release'}
              </h2>
              <button onClick={() => setViewForm(null)} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4 overflow-x-auto">
              <MedicalFormPrintable form={viewForm} />
              {(viewForm.insurance_card_front_url || viewForm.insurance_card_back_url) && (
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  {viewForm.insurance_card_front_url && (
                    <a href={viewForm.insurance_card_front_url} target="_blank" rel="noopener noreferrer" className="text-team-blue hover:underline">Insurance card — front ↗</a>
                  )}
                  {viewForm.insurance_card_back_url && (
                    <a href={viewForm.insurance_card_back_url} target="_blank" rel="noopener noreferrer" className="text-team-blue hover:underline">Insurance card — back ↗</a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Off-screen printables used for JPEG/PDF export */}
      <div style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }} aria-hidden>
        {completedForms.map(form => (
          <div key={form.id} ref={el => { printRefs.current[form.id] = el; }}>
            <MedicalFormPrintable form={form} />
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
